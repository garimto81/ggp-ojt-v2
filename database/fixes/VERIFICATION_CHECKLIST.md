# OJT Master - 권한 무결성 검증 체크리스트

## 개요

이 문서는 Supabase 테이블 권한(GRANT + RLS) 설정의 완전성을 검증하기 위한 체크리스트입니다.

**관련 Issue**: #93 - admin_settings, admin_logs 403 오류
**근본 원인**: 마이그레이션 파일에 GRANT 문 누락

---

## 1. PostgreSQL 권한 체계 이해

```
[클라이언트 요청]
       │
       ▼
┌──────────────────┐
│  1. GRANT 검사   │  ← 테이블 레벨: "이 테이블에 접근 가능?"
│  (테이블 권한)   │     실패 시: permission denied for table
└────────┬─────────┘
         │ 통과
         ▼
┌──────────────────┐
│  2. RLS 검사     │  ← 행 레벨: "어떤 행에 접근 가능?"
│  (행 레벨 보안)  │     실패 시: 빈 결과 또는 403
└────────┬─────────┘
         │ 통과
         ▼
┌──────────────────┐
│  3. 데이터 반환  │
└──────────────────┘
```

**핵심**: GRANT가 없으면 RLS 검사 전에 차단됨!

---

## 2. 테이블별 권한 매트릭스

### 2.1 GRANT 권한 (테이블 레벨)

| 테이블 | SELECT | INSERT | UPDATE | DELETE | 비고 |
|--------|--------|--------|--------|--------|------|
| users | ✅ | ✅ | ✅ | ❌ | 프로필 관리 |
| ojt_docs | ✅ | ✅ | ✅ | ✅ | 자료 CRUD |
| learning_records | ✅ | ✅ | ✅ | ❌ | 학습 기록 |
| content_reports | ✅ | ✅ | ✅ | ❌ | 신고 시스템 |
| admin_settings | ✅ | ✅ | ✅ | ❌ | 시스템 설정 |
| admin_logs | ✅ | ✅ | ❌ | ❌ | 활동 로그 |

### 2.2 RLS 정책 (행 레벨)

| 테이블 | SELECT | INSERT | UPDATE | DELETE |
|--------|--------|--------|--------|--------|
| **users** | 본인 or Admin | 본인만 | 본인 or Admin | - |
| **ojt_docs** | 모든 인증 | Mentor/Admin | 작성자 or Admin | 작성자 or Admin |
| **learning_records** | 본인 or Admin | 본인만 | 본인만 | - |
| **content_reports** | Admin만 | 본인만 (reporter_id) | Admin만 | - |
| **admin_settings** | 모든 인증 | Admin만 | Admin만 | - |
| **admin_logs** | Admin만 | Admin만 | - | - |

---

## 3. 검증 SQL 쿼리

### 3.1 GRANT 권한 확인

```sql
SELECT
  grantee,
  table_name,
  string_agg(privilege_type, ', ' ORDER BY privilege_type) AS privileges
FROM information_schema.table_privileges
WHERE table_schema = 'public'
  AND table_name IN ('users', 'ojt_docs', 'learning_records',
                     'content_reports', 'admin_settings', 'admin_logs')
  AND grantee = 'authenticated'
GROUP BY grantee, table_name
ORDER BY table_name;
```

**예상 결과**:
| grantee | table_name | privileges |
|---------|------------|------------|
| authenticated | admin_logs | INSERT, SELECT |
| authenticated | admin_settings | INSERT, SELECT, UPDATE |
| authenticated | content_reports | INSERT, SELECT, UPDATE |
| authenticated | learning_records | INSERT, SELECT, UPDATE |
| authenticated | ojt_docs | DELETE, INSERT, SELECT, UPDATE |
| authenticated | users | INSERT, SELECT, UPDATE |

### 3.2 RLS 정책 확인

```sql
SELECT
  tablename,
  policyname,
  cmd AS operation,
  CASE
    WHEN qual LIKE '%is_admin()%' THEN 'is_admin()'
    WHEN qual LIKE '%is_mentor_or_admin()%' THEN 'is_mentor_or_admin()'
    WHEN qual LIKE '%auth.uid()%' THEN 'auth.uid()'
    WHEN qual = 'true' THEN '모두 허용'
    ELSE LEFT(qual, 50)
  END AS condition
FROM pg_policies
WHERE tablename IN ('users', 'ojt_docs', 'learning_records',
                    'content_reports', 'admin_settings', 'admin_logs')
ORDER BY tablename, cmd, policyname;
```

### 3.3 RLS 활성화 상태

```sql
SELECT
  relname AS table_name,
  relrowsecurity AS rls_enabled,
  relforcerowsecurity AS force_rls
FROM pg_class
WHERE relname IN ('users', 'ojt_docs', 'learning_records',
                  'content_reports', 'admin_settings', 'admin_logs')
ORDER BY relname;
```

**모든 테이블**: `rls_enabled = true`

### 3.4 SECURITY DEFINER 함수 확인

```sql
SELECT proname, prosecdef
FROM pg_proc
WHERE proname IN ('is_admin', 'is_mentor_or_admin');
```

**예상**: 둘 다 `prosecdef = true`

---

## 4. 역할별 기능 테스트 체크리스트

### 4.1 Admin 역할

- [ ] **users**: 모든 사용자 목록 조회
- [ ] **users**: 다른 사용자 역할 변경
- [ ] **ojt_docs**: 모든 자료 조회
- [ ] **ojt_docs**: 자료 상태 변경 (published → hidden)
- [ ] **learning_records**: 모든 학습 기록 조회 (통계)
- [ ] **content_reports**: 모든 신고 목록 조회
- [ ] **content_reports**: 신고 상태 변경 (pending → resolved)
- [ ] **admin_settings**: 설정 조회 (부서 목록)
- [ ] **admin_settings**: 설정 변경 (부서 추가/삭제)
- [ ] **admin_logs**: 활동 로그 조회
- [ ] **admin_logs**: 활동 로그 생성 (자동)

### 4.2 Mentor 역할

- [ ] **users**: 자신의 프로필 조회
- [ ] **users**: 자신의 프로필 수정 (이름, 부서)
- [ ] **ojt_docs**: 모든 자료 조회
- [ ] **ojt_docs**: 새 자료 생성
- [ ] **ojt_docs**: 자신이 작성한 자료 수정
- [ ] **ojt_docs**: 자신이 작성한 자료 삭제
- [ ] **learning_records**: 자신의 학습 기록 조회
- [ ] **admin_settings**: 설정 조회 (부서 목록)
- [ ] **admin_settings**: 설정 변경 → **실패해야 함** (403)

### 4.3 Mentee 역할

- [ ] **users**: 자신의 프로필 조회
- [ ] **users**: 자신의 프로필 수정 (이름)
- [ ] **ojt_docs**: 모든 자료 조회 (읽기 전용)
- [ ] **ojt_docs**: 새 자료 생성 → **실패해야 함** (403)
- [ ] **learning_records**: 자신의 학습 기록 조회
- [ ] **learning_records**: 학습 완료 기록 생성
- [ ] **content_reports**: 신고 생성
- [ ] **admin_settings**: 설정 조회 (부서 목록)

---

## 5. 흔한 문제 및 해결책

### 5.1 "permission denied for table xxx"

**원인**: GRANT 권한 없음
**해결**:
```sql
GRANT SELECT, INSERT, UPDATE ON xxx TO authenticated;
```

### 5.2 "SELECT 성공, INSERT/UPDATE 실패"

**원인**: GRANT에 해당 권한 누락
**해결**:
```sql
-- 현재 권한 확인
SELECT privilege_type FROM information_schema.table_privileges
WHERE table_name = 'xxx' AND grantee = 'authenticated';

-- 누락된 권한 추가
GRANT INSERT, UPDATE ON xxx TO authenticated;
```

### 5.3 "Admin인데 데이터가 안 보임"

**원인**: RLS 정책에서 is_admin() 함수 미사용 또는 직접 서브쿼리 사용
**해결**:
```sql
-- 문제가 있는 정책
CREATE POLICY "..." ON xxx
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- 올바른 정책 (SECURITY DEFINER 함수 사용)
CREATE POLICY "..." ON xxx
  USING (public.is_admin());
```

### 5.4 "is_admin() 함수가 항상 false"

**원인**: SECURITY DEFINER 미설정
**해결**:
```sql
-- 확인
SELECT proname, prosecdef FROM pg_proc WHERE proname = 'is_admin';

-- 재생성 (SECURITY DEFINER 포함)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN COALESCE(
    (SELECT role = 'admin' FROM public.users WHERE id = auth.uid()),
    false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
```

---

## 6. 권한 설정 파일 목록

| 파일 | 용도 | 실행 순서 |
|------|------|----------|
| `supabase_schema.sql` | 기본 테이블 생성 | 1 |
| `20251207_admin_page_redesign.sql` | Admin 테이블 추가 | 2 |
| `supabase_complete_permissions.sql` | **전체 권한 설정** | 3 (권장) |
| `supabase_fix_admin_rls.sql` | Admin 테이블 권한 (부분) | 대체됨 |
| `check_admin_rls.sql` | 권한 검증 쿼리 | 검증용 |

**신규 프로젝트**: 1 → 2 → 3 순서로 실행
**기존 프로젝트**: 3만 실행 (기존 정책 DROP 후 재생성)

---

## 7. 변경 이력

| 날짜 | 변경 내용 |
|------|----------|
| 2025-12-08 | 초기 문서 작성 (Issue #93) |
| 2025-12-08 | supabase_complete_permissions.sql 생성 |
