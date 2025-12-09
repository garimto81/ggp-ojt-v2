# Supabase Agent

**Version**: 1.0.0
**Date**: 2025-12-09
**Issue**: #178

---

## 개요

Supabase Database 전담 에이전트입니다. DB 스키마 변경, 마이그레이션, RLS 정책 관리를 담당합니다.

## 역할

| 책임 | 설명 |
|------|------|
| **스키마 관리** | 테이블 생성/수정/삭제 |
| **마이그레이션** | SQL 마이그레이션 스크립트 작성 및 실행 |
| **RLS 정책** | Row Level Security 정책 설계 및 적용 |
| **데이터 무결성** | FK 관계, 제약조건 관리 |
| **인덱스 최적화** | 쿼리 성능을 위한 인덱스 설계 |

## 관리 영역

```
database/
├── agents/
│   └── supabase/           # @agent supabase-agent
│       ├── README.md       # 에이전트 문서 (본 파일)
│       └── SCHEMA.md       # 현재 스키마 문서
├── migrations/             # 마이그레이션 SQL 스크립트
├── fixes/                  # 핫픽스 SQL 스크립트
├── init/                   # Docker 초기화 스크립트
└── supabase_master.sql     # 마스터 스키마 (Single Source of Truth)
```

## 함수 네이밍 규칙

| 접두사 | 용도 | 예시 |
|--------|------|------|
| `rls_` | RLS 정책용 SECURITY DEFINER 함수 | `rls_is_admin()` |
| `get_` | 데이터 조회 함수 | `get_audit_logs()` |
| `check_` | 검증 함수 | `check_daily_budget_alert()` |
| `update_` | 트리거 함수 | `update_updated_at()` |

## 현재 RLS Helper 함수

```sql
-- 현재 사용자 역할 조회 (SECURITY DEFINER)
public.rls_get_role() → TEXT

-- Admin 여부 확인 (SECURITY DEFINER)
public.rls_is_admin() → BOOLEAN

-- Mentor 또는 Admin 여부 확인 (SECURITY DEFINER)
public.rls_is_mentor_or_admin() → BOOLEAN
```

**주의**: `is_admin()` 함수는 삭제되었습니다. `rls_is_admin()` 사용 필수!

## 마이그레이션 작성 규칙

### 파일명 규칙
```
YYYYMMDD_{description}.sql
YYYYMMDD_{description}_rollback.sql
```

### 필수 포함 요소
1. **헤더 주석**: 목적, 이슈 번호, 날짜
2. **Phase 구분**: 단계별 실행 가능하도록 구성
3. **멱등성**: `IF NOT EXISTS`, `ON CONFLICT DO NOTHING` 사용
4. **롤백 스크립트**: 문제 발생 시 복구 가능

### 예시
```sql
-- ============================================
-- {제목}
-- 목적: {설명}
-- 파일: database/migrations/{파일명}
-- 이슈: #{이슈번호}
-- 날짜: {YYYY-MM-DD}
-- ============================================

-- Phase 1: 테이블 생성
CREATE TABLE IF NOT EXISTS public.{table_name} (
  ...
);

-- Phase 2: 인덱스
CREATE INDEX IF NOT EXISTS idx_{table}_{column} ON public.{table}({column});

-- Phase 3: RLS
ALTER TABLE public.{table} ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "{policy_name}" ON public.{table};
CREATE POLICY "{policy_name}" ON public.{table}
  FOR SELECT TO authenticated
  USING (public.rls_is_admin());
```

## 테이블 현황

| 테이블 | 설명 | RLS |
|--------|------|-----|
| `users` | 사용자 프로필 | ✅ |
| `teams` | 팀 마스터 | ✅ |
| `departments` | 부서 마스터 (신규 #178) | ✅ |
| `ojt_docs` | OJT 문서 | ✅ |
| `learning_records` | 학습 기록 | ✅ |
| `learning_progress` | 학습 진행 상태 | ✅ |
| `admin_settings` | 관리자 설정 (JSONB) | ✅ |

## Supabase CLI 명령어

```bash
# 프로젝트 연결
npx supabase link --project-ref {ref_id}

# 스키마 덤프
npx supabase db dump --linked --schema public

# 마이그레이션 생성
npx supabase migration new {name}

# 마이그레이션 적용
npx supabase db push
```

## 데이터 보호 원칙

1. **프로덕션 직접 수정 금지** - 항상 마이그레이션 스크립트 통해 변경
2. **롤백 준비 필수** - 모든 마이그레이션에 롤백 스크립트 동반
3. **RLS 정책 우선** - 모든 테이블에 RLS 활성화
4. **FK 제약조건 사용** - 참조 무결성 보장
5. **변경 전 백업** - 중요 데이터 변경 전 백업 확인
