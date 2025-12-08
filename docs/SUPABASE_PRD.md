# Supabase PRD (Product Requirements Document)

**Project**: OJT Master
**Version**: 1.0
**Date**: 2025-12-08
**Status**: Draft

---

## 1. Executive Summary

### 1.1 Current Problems

| 문제 | 원인 | 영향 |
|------|------|------|
| 회원가입 500 에러 | RLS 순환 참조 | 신규 사용자 가입 불가 |
| Admin 조회 403 에러 | RLS 정책 충돌 | 사용자 관리 불가 |
| 문서 저장 실패 | Mentor 모드 인식 오류 | 콘텐츠 생성 불가 |
| SQL 파일 17개 산재 | 땜질식 수정 누적 | 유지보수 불가 |

### 1.2 Goal

**하나의 SQL 파일**로 Supabase 전체 구조를 정의하고, 모든 시나리오에서 동작하는 시스템 구축

---

## 2. Architecture Overview

### 2.1 System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Client (React App)                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ AuthContext │  │ DocsContext │  │ AIContext   │         │
│  │ (user/role) │  │ (ojt_docs)  │  │ (AI engine) │         │
│  └──────┬──────┘  └──────┬──────┘  └─────────────┘         │
│         │                │                                   │
│         ▼                ▼                                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Supabase Client (supabase-js)           │   │
│  │  - Auth: session, JWT token                          │   │
│  │  - Database: RLS-filtered queries                    │   │
│  └──────────────────────┬──────────────────────────────┘   │
└─────────────────────────┼───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                     Supabase Backend                         │
│                                                              │
│  ┌─────────────────┐    ┌─────────────────────────────┐    │
│  │   Auth Service  │    │      PostgreSQL Database     │    │
│  │                 │    │                              │    │
│  │  - auth.users   │───▶│  1. GRANT (table-level)     │    │
│  │  - JWT tokens   │    │  2. RLS (row-level)         │    │
│  │  - Sessions     │    │  3. Triggers                │    │
│  └─────────────────┘    └─────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Data Flow

```
[User Action] → [Supabase Client] → [Auth Check] → [GRANT Check] → [RLS Check] → [Query Execution]
                                         │              │              │
                                         │              │              │
                                    JWT Valid?    Table Access?   Row Access?
                                         │              │              │
                                      401 Error     403 Error     Empty Result
```

---

## 3. Database Schema

### 3.1 Core Tables

#### 3.1.1 users

```sql
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'mentee' CHECK (role IN ('admin', 'mentor', 'mentee')),
    department TEXT,
    auth_provider TEXT NOT NULL DEFAULT 'google' CHECK (auth_provider IN ('google', 'email')),
    status TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected')),
    approved_by UUID REFERENCES public.users(id),
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Key Points:**
- `id`: auth.users와 1:1 연결 (FK CASCADE)
- `role`: 실제 권한 (admin/mentor/mentee)
- `status`: Email 가입자 승인 상태
- `auth_provider`: 인증 방식 구분

#### 3.1.2 ojt_docs

```sql
CREATE TABLE public.ojt_docs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    team TEXT NOT NULL,
    team_id UUID REFERENCES public.teams(id),
    step INTEGER NOT NULL DEFAULT 1,
    sections JSONB NOT NULL DEFAULT '[]',
    quiz JSONB NOT NULL DEFAULT '[]',
    author_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    author_name TEXT,
    estimated_minutes INTEGER DEFAULT 30,
    source_type TEXT CHECK (source_type IN ('manual', 'url', 'pdf')),
    source_url TEXT,
    source_file TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Key Points:**
- `sections`: JSONB로 섹션 배열 저장
- `quiz`: JSONB로 퀴즈 배열 저장
- `author_id`: 작성자 (Mentor/Admin)

#### 3.1.3 learning_records

```sql
CREATE TABLE public.learning_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    doc_id UUID NOT NULL REFERENCES public.ojt_docs(id) ON DELETE CASCADE,
    score INTEGER,
    total_questions INTEGER DEFAULT 4,
    passed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, doc_id)
);
```

#### 3.1.4 learning_progress

```sql
CREATE TABLE public.learning_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    doc_id UUID NOT NULL REFERENCES public.ojt_docs(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed')),
    current_section INTEGER DEFAULT 0,
    total_time_seconds INTEGER DEFAULT 0,
    quiz_attempts INTEGER DEFAULT 0,
    best_score INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, doc_id)
);
```

#### 3.1.5 teams

```sql
CREATE TABLE public.teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 4. RLS (Row Level Security) Design

### 4.1 Design Principles

| 원칙 | 설명 |
|------|------|
| **SECURITY DEFINER 함수** | 역할 확인 시 RLS 우회 필수 |
| **자기 참조 금지** | users 정책에서 users 직접 조회 → 무한 재귀 |
| **시점 고려** | INSERT 시 users 테이블에 레코드 없을 수 있음 |
| **최소 권한 원칙** | 필요한 최소 권한만 부여 |

### 4.2 Helper Functions

```sql
-- RLS 우회하여 현재 사용자 역할 조회
CREATE OR REPLACE FUNCTION public.rls_get_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT role FROM public.users WHERE id = auth.uid()
$$;

-- Admin 여부 확인
CREATE OR REPLACE FUNCTION public.rls_is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT COALESCE(
        (SELECT role = 'admin' FROM public.users WHERE id = auth.uid()),
        false
    )
$$;

-- Mentor 또는 Admin 여부 확인
CREATE OR REPLACE FUNCTION public.rls_is_mentor_or_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT COALESCE(
        (SELECT role IN ('mentor', 'admin') FROM public.users WHERE id = auth.uid()),
        false
    )
$$;
```

### 4.3 RLS Policies Matrix

#### users

| Operation | Policy | Condition |
|-----------|--------|-----------|
| SELECT | 본인 + Admin | `auth.uid() = id OR rls_is_admin()` |
| INSERT | 본인만 | `auth.uid() = id` |
| UPDATE | 본인 + Admin | `auth.uid() = id OR rls_is_admin()` |
| DELETE | - | 불허 (CASCADE로 처리) |

#### ojt_docs

| Operation | Policy | Condition |
|-----------|--------|-----------|
| SELECT | 모두 | `true` (인증된 사용자) |
| INSERT | Mentor/Admin | `rls_is_mentor_or_admin()` |
| UPDATE | 작성자 + Admin | `author_id = auth.uid() OR rls_is_admin()` |
| DELETE | 작성자 + Admin | `author_id = auth.uid() OR rls_is_admin()` |

#### learning_records

| Operation | Policy | Condition |
|-----------|--------|-----------|
| SELECT | 본인 + Admin | `user_id = auth.uid() OR rls_is_admin()` |
| INSERT | 본인만 | `user_id = auth.uid()` |
| UPDATE | 본인만 | `user_id = auth.uid()` |
| DELETE | - | 불허 |

#### learning_progress

| Operation | Policy | Condition |
|-----------|--------|-----------|
| SELECT | 본인 + Admin | `user_id = auth.uid() OR rls_is_admin()` |
| INSERT | 본인만 | `user_id = auth.uid()` |
| UPDATE | 본인만 | `user_id = auth.uid()` |
| DELETE | - | 불허 |

#### teams

| Operation | Policy | Condition |
|-----------|--------|-----------|
| SELECT | 모두 | `true` |
| INSERT | Admin | `rls_is_admin()` |
| UPDATE | Admin | `rls_is_admin()` |
| DELETE | Admin | `rls_is_admin()` |

---

## 5. Authentication Flow

### 5.1 Google OAuth (Vercel Production)

```
1. User clicks "Google Login"
2. Supabase redirects to Google
3. Google returns auth code
4. Supabase creates auth.users record
5. Client receives JWT token
6. First login → Role Selection Page
7. User selects role → INSERT to public.users
8. Redirect to Dashboard
```

### 5.2 Email Auth (Docker/Internal)

```
1. User submits username/password
2. Supabase creates auth.users record
3. Client INSERTs to public.users (status='pending')
4. User sees "Pending Approval" page
5. Admin approves → UPDATE status='approved'
6. User can now login
```

### 5.3 Admin Mode Switch

```
Admin Dashboard
    │
    ├── "Admin Mode" (default)
    │   └── viewState = 'admin_dashboard'
    │
    └── "Mentor Mode" (click switch)
        └── sessionStorage.set('ojt_sessionMode', 'mentor')
        └── viewState = 'mentor_dashboard'
        └── RLS: still checks users.role = 'admin'
```

**Critical Issue:**
- Admin이 Mentor 모드로 전환해도 DB의 `role`은 여전히 `'admin'`
- RLS 함수 `rls_is_mentor_or_admin()`은 `role IN ('mentor', 'admin')` 확인
- 따라서 Admin은 Mentor 모드에서도 문서 생성 가능해야 함

---

## 6. Known Issues & Solutions

### 6.1 Issue: Document Save Fails in Mentor Mode (RESOLVED)

**Symptom:** Admin이 Mentor 모드로 전환 후 문서 저장 시 실패

**Root Cause (발견됨):**

```javascript
// MentorDashboard.jsx - AI 생성 결과에 team 필드 누락!
docs.push({
  ...result,        // title, sections, quiz만 포함
  step: 1,
  // team: ???      // ← 누락됨!
  source_type: currentSourceInfo.type,
  source_url: currentSourceInfo.url,
  source_file: currentSourceInfo.file,
});

// DB 스키마 - team은 NOT NULL
CREATE TABLE public.ojt_docs (
  team TEXT NOT NULL,  // ← INSERT 실패!
  ...
);
```

**Solution (적용됨):**
1. `MentorDashboard.jsx`에 팀 선택 UI 추가 (`selectedTeam` state)
2. 팀 미선택 시 생성 버튼 비활성화 + validation
3. 생성된 문서에 `team: selectedTeam` 필드 추가

**RLS는 정상:** Admin은 `rls_is_mentor_or_admin()`이 TRUE를 반환하므로 INSERT 권한 있음

### 6.2 Issue: 500 Database Error on Signup

**Symptom:** 회원가입 시 "Database error saving new user"

**Root Cause:**
1. auth.signUp() 성공 → auth.users에 레코드 생성
2. client.from('users').insert() 시도
3. RLS `users_insert_policy` 체크: `auth.uid() = id`
4. 이 시점에 auth.uid()는 존재하지만, users 테이블에 레코드 없음
5. RLS 함수가 users 조회 시 빈 결과 → 에러

**Solution:**
- INSERT 정책은 `auth.uid() = id`만 체크 (다른 테이블 조회 안 함)
- 이미 적용됨 ✓

### 6.3 Issue: 403 on Admin User List

**Symptom:** Admin이 사용자 목록 조회 시 403

**Root Cause:**
- `users_select_policy`가 `rls_is_admin()` 호출
- `rls_is_admin()`이 users 테이블 조회
- 이 조회에도 RLS 적용 → 무한 재귀

**Solution:**
- `SECURITY DEFINER` 함수는 RLS 우회
- 이미 적용됨 ✓

---

## 7. Implementation Plan

### 7.1 Phase 1: Clean Slate

1. 모든 기존 RLS 정책 삭제
2. 모든 기존 함수 삭제
3. 모든 트리거 삭제

### 7.2 Phase 2: Schema

1. 테이블 컬럼 확인/추가
2. 제약조건 확인
3. 인덱스 생성

### 7.3 Phase 3: Functions

1. `rls_get_role()` 생성
2. `rls_is_admin()` 생성
3. `rls_is_mentor_or_admin()` 생성
4. GRANT EXECUTE

### 7.4 Phase 4: GRANT

1. 각 테이블에 적절한 GRANT
2. authenticated 역할에 권한 부여

### 7.5 Phase 5: RLS Policies

1. 각 테이블 RLS 활성화
2. 정책 생성 (SELECT, INSERT, UPDATE, DELETE)

### 7.6 Phase 6: Verification

1. 정책 목록 확인
2. 함수 목록 확인
3. 테스트 시나리오 실행

---

## 8. Test Scenarios

### 8.1 Authentication Tests

| # | 시나리오 | 기대 결과 |
|---|----------|----------|
| A1 | Google OAuth 로그인 (신규) | Role Selection 페이지 |
| A2 | Google OAuth 로그인 (기존) | Dashboard |
| A3 | Email 회원가입 | Pending Approval 페이지 |
| A4 | Email 로그인 (승인 전) | "승인 대기" 메시지 |
| A5 | Email 로그인 (승인 후) | Dashboard |

### 8.2 User Management Tests

| # | 시나리오 | 기대 결과 |
|---|----------|----------|
| U1 | Admin - 사용자 목록 조회 | 전체 목록 표시 |
| U2 | Admin - 사용자 승인 | status = 'approved' |
| U3 | Admin - 역할 변경 | role 업데이트 |
| U4 | Mentor - 사용자 목록 조회 | 본인만 표시 |
| U5 | Mentee - 사용자 목록 조회 | 본인만 표시 |

### 8.3 Document Tests

| # | 시나리오 | 기대 결과 |
|---|----------|----------|
| D1 | Admin - 문서 생성 | 성공 |
| D2 | Admin (Mentor모드) - 문서 생성 | 성공 |
| D3 | Mentor - 문서 생성 | 성공 |
| D4 | Mentee - 문서 생성 | 실패 (403) |
| D5 | 작성자 - 문서 수정 | 성공 |
| D6 | 비작성자 Mentor - 문서 수정 | 실패 |
| D7 | Admin - 타인 문서 수정 | 성공 |
| D8 | 모든 사용자 - 문서 조회 | 성공 |

### 8.4 Learning Tests

| # | 시나리오 | 기대 결과 |
|---|----------|----------|
| L1 | 학습 기록 저장 | 성공 |
| L2 | 본인 학습 기록 조회 | 성공 |
| L3 | 타인 학습 기록 조회 | 빈 결과 |
| L4 | Admin - 전체 학습 기록 조회 | 성공 |

---

## 9. Migration Strategy

### 9.1 Current State

- 17개의 SQL 파일 산재
- 실행 순서 불명확
- 중복 정의 다수

### 9.2 Target State

- 1개의 마스터 SQL 파일
- 순차적 실행 보장
- 멱등성 (여러 번 실행해도 동일 결과)

### 9.3 Migration Steps

```bash
# 1. 백업
pg_dump --data-only --table=users --table=ojt_docs ...

# 2. 새 SQL 실행
psql < database/supabase_master.sql

# 3. 검증
psql < database/verify_setup.sql

# 4. 테스트
npm run test:e2e
```

---

## 10. File Structure (Target)

```
database/
├── supabase_master.sql      # ⭐ 전체 스키마 + RLS (단일 파일)
├── seed_data.sql            # 초기 데이터 (teams 등)
├── verify_setup.sql         # 검증 쿼리
└── archive/                 # 구버전 파일 보관
    ├── migrations/
    └── fixes/
```

---

## 11. Next Steps

1. [ ] `supabase_master.sql` 작성
2. [ ] 로컬/스테이징에서 테스트
3. [ ] E2E 테스트 실행
4. [ ] 프로덕션 적용
5. [ ] 모니터링

---

## Appendix A: Current SQL Files (To Archive)

| 파일 | 용도 | 상태 |
|------|------|------|
| migrations/supabase_schema.sql | 기본 스키마 | → archive |
| migrations/supabase_phase2_*.sql | learning_progress | → archive |
| migrations/supabase_phase3_*.sql | teams | → archive |
| migrations/supabase_source_columns.sql | source 컬럼 | → archive |
| migrations/20251207_*.sql | admin redesign | → archive |
| migrations/20251208_*.sql | email auth | → archive |
| fixes/*.sql | 각종 수정 (12개) | → archive |

## Appendix B: Error Codes Reference

| Code | Message | Cause | Solution |
|------|---------|-------|----------|
| 401 | Unauthorized | JWT 만료/없음 | 재로그인 |
| 403 | Forbidden | GRANT 권한 없음 | GRANT 확인 |
| 403 | RLS violation | RLS 정책 차단 | 정책 확인 |
| 500 | Database error | 쿼리 실패 | 로그 확인 |
| 42501 | permission denied | GRANT 누락 | GRANT 실행 |
