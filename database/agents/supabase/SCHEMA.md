# Supabase Schema Reference

**Last Updated**: 2025-12-11
**Version**: 3.1.0 (실제 DB 기반)
**Project**: ggp-platform (cbvansmxutnogntbyswi)

---

## 개요

이 문서는 **실제 Supabase 데이터베이스**를 기반으로 작성되었습니다.
총 **23개 테이블 + 2개 뷰**가 존재하며, 두 개의 시스템이 공존합니다.

| 시스템 | 핵심 테이블 | 상태 |
|--------|-------------|------|
| **OJT Master** | ojt_docs, learning_records, learning_progress | ✅ 운영 중 |
| **LMS 확장** | lessons, quizzes, curriculum_days | 📊 데이터 존재 |

---

## 테이블 분류 요약

| 분류 | 수량 | 테이블 |
|------|------|--------|
| ✅ OJT 핵심 | 8개 | users, teams, departments, ojt_docs, learning_records, learning_progress, admin_settings, audit_logs |
| 🔵 LMS 확장 | 8개 | lessons, lesson_versions, quizzes, quiz_pools, quiz_attempts, curriculum_days, user_progress, profiles |
| 🟡 분석/로그 | 2개 | ai_processing_logs, content_creation_metrics |
| 🟠 게임화 | 2개 | achievements, user_achievements |
| 🔴 퀴즈 이력 | 2개 | user_quiz_history, user_question_history |
| ⚫ 미사용 | 1개 | poker_glossary |
| 📊 시스템 뷰 | 2개 | cache_hit_ratio, index_usage_stats |

---

## 1. OJT 핵심 테이블 (8개) ✅

현재 OJT Master 앱에서 **실제 사용 중**인 테이블입니다.

### 1.1 users (13 컬럼)

사용자 프로필 테이블. `auth.users`와 1:1 관계.

```sql
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'mentee' CHECK (role IN ('admin', 'mentor', 'mentee')),
  department TEXT,                              -- 레거시 (TEXT)
  department_id UUID REFERENCES departments(id), -- 신규 FK (#178)
  auth_provider TEXT DEFAULT 'google' CHECK (auth_provider IN ('google', 'email')),
  status TEXT DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected')),
  is_active BOOLEAN DEFAULT true,               -- 활성화 상태 (#196)
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  last_active_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**인덱스**: `idx_users_role`, `idx_users_status`, `idx_users_department_id`, `idx_users_is_active`

### 1.2 teams (7 컬럼)

팀 마스터 테이블. OJT 문서 분류용.

```sql
CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 1.3 departments (9 컬럼)

부서 마스터 테이블. 사용자 부서 관리용.

```sql
CREATE TABLE public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,           -- "개발팀", "디자인팀"
  slug TEXT NOT NULL UNIQUE,           -- "development", "design"
  description TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  color_theme TEXT,                    -- UI 배지 색상 테마
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**인덱스**: `idx_departments_slug`, `idx_departments_active`, `idx_departments_display_order`

### 1.4 ojt_docs (20 컬럼)

OJT 교육 문서 테이블.

```sql
CREATE TABLE public.ojt_docs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  team TEXT NOT NULL,
  team_id UUID REFERENCES teams(id),
  step INTEGER NOT NULL DEFAULT 1,
  sections JSONB NOT NULL DEFAULT '[]',
  quiz JSONB NOT NULL DEFAULT '[]',
  author_id UUID REFERENCES users(id) ON DELETE SET NULL,
  author_name TEXT,
  estimated_minutes INTEGER DEFAULT 30,
  source_type TEXT CHECK (source_type IN ('manual', 'url', 'pdf')),
  source_url TEXT,
  source_file TEXT,
  source_storage_path TEXT,                          -- Supabase Storage 경로 (신규 #202)
  status TEXT DEFAULT 'published',
  report_count INTEGER DEFAULT 0,
  last_reviewed_at TIMESTAMPTZ,
  reviewed_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**인덱스**: `idx_ojt_docs_author`, `idx_ojt_docs_team`, `idx_ojt_docs_source_storage_path` (WHERE NOT NULL)

### 1.5 learning_records (7 컬럼) ✅ 학습 완료 판단 기준

학습 완료 기록 테이블. **퀴즈 결과만으로 학습 완료 여부를 판단합니다.**

| 조건 | 상태 |
|------|------|
| 레코드 없음 | 미학습 |
| `passed = false` | 퀴즈 미통과 |
| `passed = true` | ✅ 학습 완료 |

```sql
CREATE TABLE public.learning_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  doc_id UUID NOT NULL REFERENCES ojt_docs(id) ON DELETE CASCADE,
  score INTEGER,
  total_questions INTEGER DEFAULT 4,
  passed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, doc_id)
);
```

**인덱스**: `idx_learning_records_user`

### 1.6 learning_progress (13 컬럼) ⚠️ 미사용

> **참고**: 이 테이블은 DB에 존재하나 **프론트엔드에서 사용하지 않습니다**.
> 학습 완료 여부는 `learning_records` 테이블의 퀴즈 결과(`passed`)로만 판단합니다.
> (Issue #221)

학습 진행 상태 테이블.

```sql
CREATE TABLE public.learning_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  doc_id UUID NOT NULL REFERENCES ojt_docs(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed')),
  started_at TIMESTAMPTZ,
  last_accessed_at TIMESTAMPTZ,
  total_time_seconds INTEGER DEFAULT 0,
  current_section INTEGER DEFAULT 0,
  sections_completed INTEGER DEFAULT 0,
  quiz_attempts INTEGER DEFAULT 0,
  best_score INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, doc_id)
);
```

**인덱스**: `idx_learning_progress_user`

### 1.7 admin_settings (4 컬럼)

관리자 설정 Key-Value 저장소.

```sql
CREATE TABLE public.admin_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES users(id)
);
```

**주요 키**:
- `default_departments`: 기본 부서 목록 (레거시)
- `default_roles`: 기본 역할 목록

### 1.8 audit_logs (11 컬럼)

보안 감사 로그 테이블. 역할 변경, 문서 삭제 등 중요 이벤트 자동 기록.

```sql
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL CHECK (event_type IN (
    'ROLE_CHANGE',      -- 역할 변경
    'LOGIN',            -- 로그인
    'LOGOUT',           -- 로그아웃
    'DOC_CREATE',       -- 문서 생성
    'DOC_UPDATE',       -- 문서 수정
    'DOC_DELETE',       -- 문서 삭제
    'SECURITY_ALERT'    -- 보안 경고
  )),
  table_name TEXT NOT NULL,
  record_id UUID,
  old_value JSONB,
  new_value JSONB,
  performed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**인덱스**: `idx_audit_logs_event_type`, `idx_audit_logs_performed_by`, `idx_audit_logs_created_at`, `idx_audit_logs_record_id`

**트리거**:
- `audit_user_role_change`: users 테이블 역할 변경 시 자동 기록
- `audit_doc_delete`: ojt_docs 삭제 시 자동 기록

---

## 2. LMS 확장 테이블 (8개) 🔵

**별도 LMS 시스템**용 테이블. OJT Master와 별개 시스템으로 추정.
**주의**: 일부 테이블에 실제 데이터가 존재함.

### 2.1 lessons (20 컬럼) - 📊 22개 레코드

```sql
-- 컬럼: id, day_id, title, content, raw_content, lesson_type, duration_minutes,
--       order_index, points_reward, prerequisites(ARRAY), is_required, resources(JSONB),
--       learning_objectives(ARRAY), key_concepts(ARRAY), difficulty_level,
--       ai_processed, ai_processed_at, ai_confidence_score, created_at, updated_at
```

**분석**: `day_id`로 `curriculum_days` 참조. ojt_docs와 별개 시스템.

### 2.2 lesson_versions (9 컬럼) - 빈 테이블

```sql
-- 컬럼: id, lesson_id, version, content, raw_content, ai_processed,
--       change_summary, created_by, created_at
```

### 2.3 quizzes (16 컬럼) - 📊 5개 레코드

```sql
-- 컬럼: id, lesson_id, question, question_type, options(JSONB), correct_answer,
--       explanation, points, order_index, difficulty, concept_tags(ARRAY),
--       ai_generated, generation_seed, is_active, created_at, updated_at
```

**분석**: `lesson_id`로 lessons 참조. ojt_docs.quiz(JSONB)와 별개.

### 2.4 quiz_pools (10 컬럼) - 빈 테이블

```sql
-- 컬럼: id, lesson_id, total_questions, active_questions, difficulty_distribution(JSONB),
--       last_generated_at, generation_count, last_selected_at, created_at, updated_at
```

### 2.5 quiz_attempts (8 컬럼) - 빈 테이블

```sql
-- 컬럼: id, user_id, quiz_id, user_answer, is_correct, points_earned, attempted_at, feedback
```

### 2.6 curriculum_days (10 컬럼) - 📊 7개 레코드

```sql
-- 컬럼: id(int), day_number, title, description, objectives(ARRAY), duration_hours,
--       order_index, is_active, created_at, updated_at
```

### 2.7 user_progress (10 컬럼) - 빈 테이블

```sql
-- 컬럼: id, user_id, lesson_id, status, started_at, completed_at,
--       time_spent_minutes, notes, created_at, updated_at
```

**분석**: `lesson_id` 참조. OJT의 `learning_progress`(doc_id 참조)와 별개.

### 2.8 profiles (10 컬럼) - 📊 5개 레코드

```sql
-- 컬럼: id, email, full_name, role, department, start_date,
--       avatar_url, points, created_at, updated_at
```

**분석**: `email`, `avatar_url`, `points` 포함. OJT의 `users`와 별개.

---

## 3. 분석/로그 테이블 (2개) 🟡

### 3.1 ai_processing_logs (14 컬럼) - 빈 테이블

```sql
-- 컬럼: id, entity_type, entity_id, operation, input_text, output_text, model_used,
--       confidence_score, processing_time_ms, tokens_used, cost_usd, status, error_message, created_at
```

**용도**: AI 처리 상세 로그 (토큰 사용량, 비용 추적)

### 3.2 content_creation_metrics (11 컬럼) - 빈 테이블

```sql
-- 컬럼: id, trainer_id, lesson_id, started_at, saved_at, duration_minutes, ai_used,
--       edit_count, final_word_count, satisfaction_score, created_at
```

**용도**: 콘텐츠 제작 메트릭 (lessons 연동)

---

## 4. 게임화 테이블 (2개) 🟠

### 4.1 achievements (9 컬럼) - 📊 9개 레코드

```sql
-- 컬럼: id, name, description, icon, badge_color, points_required,
--       condition_type, condition_value(JSONB), created_at
```

### 4.2 user_achievements (4 컬럼) - 빈 테이블

```sql
-- 컬럼: id, user_id, achievement_id, earned_at
```

---

## 5. 퀴즈 이력 테이블 (2개) 🔴

### 5.1 user_quiz_history (10 컬럼) - 빈 테이블

```sql
-- 컬럼: id, user_id, lesson_id, quiz_id, attempt_number, is_correct,
--       selected_answer, time_taken_seconds, weight, attempted_at
```

### 5.2 user_question_history (11 컬럼) - 빈 테이블

Spaced Repetition (간격 반복 학습) 알고리즘용.

```sql
-- 컬럼: id, user_id, question_id, attempts, consecutive_correct, last_attempt_at,
--       next_review_at, ease_factor, interval_days, created_at, updated_at
```

**분석**: `ease_factor`, `interval_days` 등은 SM-2 알고리즘 필드.

---

## 6. 미사용 테이블 (1개) ⚫

### 6.1 poker_glossary (7 컬럼) - 빈 테이블

```sql
-- 컬럼: term(PK), definition, aliases(ARRAY), context_examples(ARRAY),
--       category, created_at, updated_at
```

**분석**: 포커 용어집. OJT Master와 **무관한 테이블**. 제거 권장.

---

## 7. 시스템 뷰 (2개) 📊

### 7.1 cache_hit_ratio

```sql
-- 컬럼: metric, ratio_percent
```

### 7.2 index_usage_stats

```sql
-- 컬럼: schemaname, tablename, indexname, index_scans, tuples_read, tuples_fetched, status
```

**분석**: PostgreSQL 성능 모니터링 뷰. 유지.

---

## 8. 데이터 현황 (2025-12-09 기준)

| 테이블 | 레코드 수 | 분류 | 상태 |
|--------|----------|------|------|
| lessons | 22 | LMS | 📊 사용 중 |
| achievements | 9 | 게임화 | 📊 사용 중 |
| curriculum_days | 7 | LMS | 📊 사용 중 |
| profiles | 5 | LMS | 📊 사용 중 |
| quizzes | 5 | LMS | 📊 사용 중 |
| users | ? | OJT | 운영 중 |
| ojt_docs | ? | OJT | 운영 중 |
| 기타 12개 | 0 | - | 빈 테이블 |

---

## 9. RLS 정책 요약

| 테이블 | SELECT | INSERT | UPDATE | DELETE |
|--------|--------|--------|--------|--------|
| **users** | 본인 OR Admin | 본인만 | 본인 OR Admin | - |
| **teams** | 모두 | Admin | Admin | Admin |
| **departments** | 모두 | Admin | Admin | Admin |
| **ojt_docs** | 모두 | Mentor/Admin | 작성자 OR Admin | 작성자 OR Admin |
| **learning_records** | 본인 OR Admin | 본인만 | 본인만 | - |
| **learning_progress** | 본인 OR Admin | 본인만 | 본인만 | - |
| **admin_settings** | 모두 | Admin | Admin | - |
| **audit_logs** | Admin | 시스템(트리거) | - | - |

---

## 10. Helper 함수

```sql
-- RLS용 SECURITY DEFINER 함수
public.rls_get_role() → TEXT
public.rls_is_admin() → BOOLEAN
public.rls_is_mentor_or_admin() → BOOLEAN

-- 트리거 함수
public.update_updated_at() → TRIGGER

-- 감사 로그 조회
public.get_audit_logs(event_type, limit, offset) → SETOF audit_logs
public.get_role_change_history(user_id) → SETOF audit_logs
```

**주의**: `is_admin()` 함수는 삭제됨. 반드시 `rls_is_admin()` 사용!

---

## 11. 마이그레이션 히스토리

| 파일 | 날짜 | 설명 |
|------|------|------|
| `supabase_master.sql` | 2025-12-08 | 마스터 스키마 |
| `20251208_email_auth.sql` | 2025-12-08 | 이메일 인증 추가 |
| `20251209_departments_table.sql` | 2025-12-09 | departments 테이블 (#178) |

---

## 12. 제거된 테이블

| 테이블 | 제거일 | 사유 |
|--------|--------|------|
| `admin_logs` | 2025-12-09 | audit_logs로 통합 |
| `content_reports` | 2025-12-09 | 미사용 기능 |

---

## 13. Storage 버킷 (신규 #202)

### 13.1 pdfs 버킷

로컬 PDF 파일 영구 저장용 버킷.

```sql
-- 버킷 설정
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'pdfs',
  'pdfs',
  true,
  52428800,  -- 50MB
  ARRAY['application/pdf']::text[]
);
```

**RLS 정책** (4개):

| 정책명 | 작업 | 대상 | 조건 |
|--------|------|------|------|
| `Mentor and Admin can upload PDFs` | INSERT | authenticated | role IN ('mentor', 'admin') |
| `Authenticated users can view PDFs` | SELECT | authenticated | bucket_id = 'pdfs' |
| `Owner or Admin can delete PDFs` | DELETE | authenticated | owner = auth.uid() OR role = 'admin' |
| `Owner or Admin can update PDFs` | UPDATE | authenticated | owner = auth.uid() OR role = 'admin' |

**경로 규칙**: `documents/{doc_id}/{filename}.pdf`

**ojt_docs 연동**: `source_storage_path` 컬럼에 Storage 경로 저장

**마이그레이션**: `20251211_pdf_storage_bucket.sql`

---

## Appendix: 두 시스템 관계도

```
OJT Master 시스템                  LMS 확장 시스템
─────────────────                  ─────────────────
users                              profiles
  ↓                                  ↓
ojt_docs (JSONB quiz)              lessons ← curriculum_days
  ↓   ↓                              ↓
  │   └─ storage.pdfs (PDF 파일)   quizzes ← quiz_pools
  ↓                                  ↓
learning_progress                  quiz_attempts
learning_records                   user_progress
                                   user_quiz_history
                                   user_question_history
```

**결론**: 두 시스템이 **병렬로 공존**. OJT Master만 현재 운영 중.
