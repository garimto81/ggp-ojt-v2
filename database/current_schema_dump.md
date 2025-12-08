# Supabase Current Schema Dump
**Date**: 2025-12-08
**Project**: cbvansmxutnogntbyswi (ggp-platform)

---

## Tables (26)

| Table Name | Description |
|------------|-------------|
| achievements | 업적 목록 |
| admin_logs | Admin 활동 로그 |
| admin_settings | Admin 설정 |
| ai_processing_logs | AI 처리 로그 |
| audit_logs | 감사 로그 |
| cache_hit_ratio | 캐시 히트율 (뷰?) |
| content_creation_metrics | 콘텐츠 생성 메트릭 |
| content_reports | 콘텐츠 신고 |
| curriculum_days | 커리큘럼 일정 |
| index_usage_stats | 인덱스 사용 통계 (뷰?) |
| learning_progress | 학습 진행률 |
| learning_records | 학습 기록 |
| lesson_versions | 레슨 버전 |
| lessons | 레슨 |
| **ojt_docs** | OJT 문서 (핵심) |
| poker_glossary | 포커 용어집 |
| profiles | 프로필 (Supabase 기본) |
| quiz_attempts | 퀴즈 시도 |
| quiz_pools | 퀴즈 풀 |
| quizzes | 퀴즈 |
| teams | 팀 목록 |
| user_achievements | 사용자 업적 |
| user_progress | 사용자 진행률 |
| user_question_history | 사용자 질문 이력 |
| user_quiz_history | 사용자 퀴즈 이력 |
| **users** | 사용자 (핵심) |

---

## Core Table Schemas

### users

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | - |
| name | text | NO | - |
| role | text | YES | 'mentee' |
| department | text | YES | - |
| created_at | timestamptz | YES | now() |
| updated_at | timestamptz | YES | now() |
| last_active_at | timestamptz | YES | - |
| auth_provider | varchar | YES | 'google' |
| status | varchar | YES | 'approved' |
| approved_by | uuid | YES | - |
| approved_at | timestamptz | YES | - |

### ojt_docs

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| title | text | NO | - |
| **team** | text | **NO** | - |
| step | integer | NO | 1 |
| sections | jsonb | NO | '[]' |
| quiz | jsonb | NO | '[]' |
| author_id | uuid | YES | - |
| author_name | text | YES | - |
| estimated_minutes | integer | YES | 30 |
| created_at | timestamptz | YES | now() |
| updated_at | timestamptz | YES | now() |
| team_id | uuid | YES | - |
| source_type | text | YES | 'manual' |
| source_url | text | YES | - |
| source_file | text | YES | - |
| status | text | YES | 'published' |
| report_count | integer | YES | 0 |
| last_reviewed_at | timestamptz | YES | - |
| reviewed_by | uuid | YES | - |

---

## RLS Helper Functions

| Function | Security Definer |
|----------|-----------------|
| rls_get_my_role | true |
| rls_is_admin | true |
| rls_is_mentor_or_admin | true |

---

## RLS Policies

### users

| Policy | Command | Condition |
|--------|---------|-----------|
| users_select_policy | SELECT | `(auth.uid() = id) OR rls_is_admin()` |
| users_insert_policy | INSERT | `auth.uid() = id` |
| users_update_policy | UPDATE | `(auth.uid() = id) OR rls_is_admin()` |

### ojt_docs

| Policy | Command | Condition |
|--------|---------|-----------|
| docs_select_policy | SELECT | `true` |
| docs_insert_policy | INSERT | `rls_is_mentor_or_admin()` |
| docs_update_policy | UPDATE | `(author_id = auth.uid()) OR rls_is_admin()` |
| docs_delete_policy | DELETE | `(author_id = auth.uid()) OR rls_is_admin()` |

### learning_records

| Policy | Command | Condition |
|--------|---------|-----------|
| records_select_policy | SELECT | `(user_id = auth.uid()) OR rls_is_admin()` |
| records_insert_policy | INSERT | `user_id = auth.uid()` |
| records_update_policy | UPDATE | `user_id = auth.uid()` |

### learning_progress

| Policy | Command | Condition |
|--------|---------|-----------|
| progress_select_policy | SELECT | `(user_id = auth.uid()) OR rls_is_admin()` |
| progress_insert_policy | INSERT | `user_id = auth.uid()` |
| progress_update_policy | UPDATE | `user_id = auth.uid()` |

### teams

| Policy | Command | Condition |
|--------|---------|-----------|
| teams_select_policy | SELECT | `true` |

---

## Key Findings

### 1. ojt_docs.team is NOT NULL
- 문서 저장 시 반드시 team 필드 필요
- MentorDashboard에서 팀 선택 UI 추가 필요 (수정 완료)

### 2. RLS 구조 정상
- `rls_is_mentor_or_admin()` SECURITY DEFINER 함수 존재
- Admin이 Mentor 모드로 전환해도 문서 생성 가능 (role은 여전히 'admin')

### 3. profiles vs users
- 2개의 사용자 테이블 존재 (profiles, users)
- 일부 정책은 profiles를 참조, 일부는 users를 참조
- 통합 필요할 수 있음

### 4. 레거시 테이블 존재
- poker_glossary: 포커 관련 (다른 프로젝트?)
- lessons, quizzes: 레거시 구조
- curriculum_days: 커리큘럼 기능

---

## Recommendations

1. **Team 필드 검증**: 클라이언트에서 team 필수 입력 확인 (완료)
2. **profiles vs users 통합**: 하나의 테이블로 통합 고려
3. **레거시 테이블 정리**: 미사용 테이블 정리 또는 아카이브
4. **teams 테이블 Admin 정책 추가**: INSERT/UPDATE/DELETE 권한 필요
