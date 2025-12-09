# Departments 테이블 설계 문서

**Version**: 1.0.0
**Date**: 2025-12-09
**Issue**: #178
**Author**: Claude Code

---

## 1. 개요

### 1.1 배경
현재 부서 관리가 `admin_settings` 테이블의 JSONB 배열로 되어 있어 데이터 동기화 이슈 발생 (#176)

### 1.2 목표
- 독립적인 `departments` 마스터 테이블 생성
- 참조 무결성 확보 (users.department_id FK)
- 부서 관리 UI 일원화

---

## 2. 현재 상태 vs 변경 후

| 구분 | 현재 (Before) | 변경 후 (After) |
|------|--------------|-----------------|
| 부서 목록 | `admin_settings.default_departments` (JSONB) | `departments` 테이블 |
| 사용자 부서 | `users.department` (TEXT) | `users.department_id` (UUID FK) |
| 참조 무결성 | ❌ 없음 | ✅ FK 제약 |
| 테마 관리 | `constants.js` 하드코딩 | `departments.color_theme` DB 저장 |

---

## 3. 테이블 스키마

### 3.1 departments 테이블

```sql
CREATE TABLE public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,           -- "개발팀"
  slug TEXT NOT NULL UNIQUE,           -- "development"
  description TEXT,                    -- 부서 설명
  display_order INTEGER DEFAULT 0,     -- 표시 순서
  is_active BOOLEAN DEFAULT true,      -- 활성화 여부
  color_theme TEXT,                    -- 색상 테마 키
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3.2 users 테이블 변경

```sql
-- 추가되는 컬럼
ALTER TABLE users ADD COLUMN department_id UUID REFERENCES departments(id);

-- 기존 컬럼 (하위 호환용, 추후 제거)
department TEXT  -- 마이그레이션 완료 후 DROP
```

---

## 4. 데이터 흐름

```
┌──────────────────────────┐
│ Admin: 부서 관리 페이지   │
│ (SystemSettings)         │
└───────────┬──────────────┘
            │ CRUD
            ▼
┌──────────────────────────┐
│ departments 테이블        │
│ id, name, slug, ...      │
└───────────┬──────────────┘
            │ FK
            ▼
┌──────────────────────────┐
│ users 테이블              │
│ department_id (UUID)     │
└──────────────────────────┘
```

---

## 5. RLS 정책

| 작업 | 권한 |
|------|------|
| SELECT | 모든 인증 사용자 |
| INSERT | Admin만 |
| UPDATE | Admin만 |
| DELETE | Admin만 |

---

## 6. 영향받는 파일

### 6.1 높은 우선순위 (필수 수정)

| 파일 | 변경 사항 |
|------|----------|
| `SystemSettings.jsx` | departments 테이블 CRUD로 변경 |
| `UsersManagementTab.jsx` | department → department_id 매핑 |
| `UserDetailPanel.jsx` | departments 조회 방식 변경 |
| `BulkActionsBar.jsx` | DEFAULT_DEPARTMENTS 제거 |
| `AuthContext.jsx` | user.department_id 해석 |

### 6.2 중간 우선순위

| 파일 | 변경 사항 |
|------|----------|
| `Header.jsx` | departmentTheme 조회 변경 |
| `constants.js` | DEPARTMENT_THEMES 동적 로딩 |
| `useAnalytics.js` | 부서별 통계 쿼리 수정 |

---

## 7. 마이그레이션 계획

### Phase A: 데이터베이스 (Day 1)
1. 백업 생성
2. `20251209_departments_table.sql` 실행
3. 검증 쿼리 실행

### Phase B: 프론트엔드 호환성 레이어 (Day 2)
1. `DepartmentsContext.jsx` 생성
2. `fetchDepartments()` 유틸리티 추가

### Phase C: 컴포넌트 수정 (Day 3-4)
1. SystemSettings.jsx 수정
2. UsersManagementTab.jsx 수정
3. 기타 컴포넌트 수정

### Phase D: 레거시 정리 (안정화 후)
1. `admin_settings.default_departments` 삭제
2. `users.department` 컬럼 삭제

---

## 8. 롤백 계획

문제 발생 시 `20251209_departments_table_rollback.sql` 실행:
- departments 테이블 삭제
- users.department_id 컬럼 제거
- users.department 컬럼은 유지됨

---

## 9. 기본 데이터

| name | slug | color_theme | display_order |
|------|------|-------------|---------------|
| 개발팀 | development | indigo | 1 |
| 디자인팀 | design | pink | 2 |
| 기획팀 | planning | purple | 3 |
| 마케팅팀 | marketing | orange | 4 |
| 운영팀 | operations | teal | 5 |
| 인사팀 | hr | cyan | 6 |

---

## 10. 관련 파일

- **마이그레이션**: `database/migrations/20251209_departments_table.sql`
- **롤백**: `database/migrations/20251209_departments_table_rollback.sql`
- **참조 패턴**: `database/migrations/supabase_phase3_teams.sql`
