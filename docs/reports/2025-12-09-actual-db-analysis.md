# 실제 Supabase DB 테이블 분석 보고서

**Date**: 2025-12-09
**Prepared by**: supabase-agent
**Version**: 3.0.0 (실제 DB 기반 - Supabase API 조회)
**Project**: ggp-platform (cbvansmxutnogntbyswi)

---

## 1. 실제 테이블 현황 (23개 + 2개 뷰)

### 1.1 테이블 분류 요약

| 분류 | 수량 | 테이블 |
|------|------|--------|
| ✅ OJT 핵심 | 8개 | users, teams, departments, ojt_docs, learning_records, learning_progress, admin_settings, audit_logs |
| 🔵 LMS 확장 | 8개 | lessons, lesson_versions, quizzes, quiz_pools, quiz_attempts, curriculum_days, user_progress, profiles |
| 🟡 분석/로그 | 2개 | ai_processing_logs, content_creation_metrics |
| 🟠 게임화 | 2개 | achievements, user_achievements |
| 🔴 퀴즈 이력 | 2개 | user_quiz_history, user_question_history |
| ⚫ 다른 프로젝트 | 1개 | poker_glossary |
| 📊 시스템 뷰 | 2개 | cache_hit_ratio, index_usage_stats |

---

## 2. OJT 핵심 테이블 (8개) ✅

이 테이블들은 현재 OJT Master 앱에서 **실제 사용 중**입니다.

### 2.1 users (12 컬럼)
```
id, name, role, department, department_id, auth_provider, status,
approved_by, approved_at, last_active_at, created_at, updated_at
```

### 2.2 teams (7 컬럼)
```
id, name, slug, description, display_order, is_active, created_at
```

### 2.3 departments (9 컬럼)
```
id, name, slug, description, display_order, is_active, color_theme, created_at, updated_at
```

### 2.4 ojt_docs (19 컬럼)
```
id, title, team, team_id, step, sections(JSONB), quiz(JSONB),
author_id, author_name, estimated_minutes, source_type, source_url, source_file,
status, report_count, last_reviewed_at, reviewed_by, created_at, updated_at
```

### 2.5 learning_records (7 컬럼)
```
id, user_id, doc_id, score, total_questions, passed, completed_at
```

### 2.6 learning_progress (13 컬럼)
```
id, user_id, doc_id, status, started_at, last_accessed_at, total_time_seconds,
current_section, sections_completed, quiz_attempts, best_score, created_at, updated_at
```

### 2.7 admin_settings (4 컬럼)
```
key, value(JSONB), updated_at, updated_by
```

### 2.8 audit_logs (11 컬럼)
```
id, event_type, table_name, record_id, old_value(JSONB), new_value(JSONB),
performed_by, ip_address, user_agent, metadata(JSONB), created_at
```

---

## 3. LMS 확장 테이블 (8개) 🔵

**분석**: 이 테이블들은 **별도 LMS 시스템**용으로 보입니다. OJT Master와 별개 시스템으로 추정.

### 3.1 lessons (20 컬럼) - ojt_docs와 별개
```
id, day_id, title, content, raw_content, lesson_type, duration_minutes, order_index,
points_reward, prerequisites(ARRAY), is_required, resources(JSONB),
learning_objectives(ARRAY), key_concepts(ARRAY), difficulty_level,
ai_processed, ai_processed_at, ai_confidence_score, created_at, updated_at
```

**분석**: `day_id`로 `curriculum_days` 참조. 별도 커리큘럼 시스템.

### 3.2 lesson_versions (9 컬럼)
```
id, lesson_id, version, content, raw_content, ai_processed, change_summary, created_by, created_at
```

### 3.3 quizzes (16 컬럼) - ojt_docs.quiz와 별개
```
id, lesson_id, question, question_type, options(JSONB), correct_answer, explanation,
points, order_index, difficulty, concept_tags(ARRAY), ai_generated, generation_seed,
is_active, created_at, updated_at
```

**분석**: `lesson_id`로 lessons 참조. 퀴즈 정규화 버전.

### 3.4 quiz_pools (10 컬럼)
```
id, lesson_id, total_questions, active_questions, difficulty_distribution(JSONB),
last_generated_at, generation_count, last_selected_at, created_at, updated_at
```

### 3.5 quiz_attempts (8 컬럼)
```
id, user_id, quiz_id, user_answer, is_correct, points_earned, attempted_at, feedback
```

### 3.6 curriculum_days (10 컬럼)
```
id(int), day_number, title, description, objectives(ARRAY), duration_hours,
order_index, is_active, created_at, updated_at
```

### 3.7 user_progress (10 컬럼) - lessons용
```
id, user_id, lesson_id, status, started_at, completed_at, time_spent_minutes, notes, created_at, updated_at
```

**분석**: `lesson_id` 참조. `learning_progress`(doc_id 참조)와 별개.

### 3.8 profiles (10 컬럼) - users와 별개
```
id, email, full_name, role, department, start_date, avatar_url, points, created_at, updated_at
```

**분석**: `email`, `avatar_url`, `points` 포함. LMS 시스템용 프로필.

---

## 4. 분석/로그 테이블 (2개) 🟡

### 4.1 ai_processing_logs (14 컬럼)
```
id, entity_type, entity_id, operation, input_text, output_text, model_used,
confidence_score, processing_time_ms, tokens_used, cost_usd, status, error_message, created_at
```

**용도**: AI 처리 상세 로그 (토큰 사용량, 비용 추적)

### 4.2 content_creation_metrics (11 컬럼)
```
id, trainer_id, lesson_id, started_at, saved_at, duration_minutes, ai_used,
edit_count, final_word_count, satisfaction_score, created_at
```

**용도**: 콘텐츠 제작 메트릭 (lessons 연동)

---

## 5. 게임화 테이블 (2개) 🟠

### 5.1 achievements (9 컬럼)
```
id, name, description, icon, badge_color, points_required, condition_type, condition_value(JSONB), created_at
```

### 5.2 user_achievements (4 컬럼)
```
id, user_id, achievement_id, earned_at
```

---

## 6. 퀴즈 이력 테이블 (2개) 🔴

### 6.1 user_quiz_history (10 컬럼)
```
id, user_id, lesson_id, quiz_id, attempt_number, is_correct, selected_answer,
time_taken_seconds, weight, attempted_at
```

### 6.2 user_question_history (11 컬럼) - Spaced Repetition 용
```
id, user_id, question_id, attempts, consecutive_correct, last_attempt_at,
next_review_at, ease_factor, interval_days, created_at, updated_at
```

**분석**: `ease_factor`, `interval_days` 등은 간격 반복 학습 알고리즘 필드.

---

## 7. 다른 프로젝트 테이블 (1개) ⚫

### 7.1 poker_glossary (7 컬럼)
```
term, definition, aliases(ARRAY), context_examples(ARRAY), category, created_at, updated_at
```

**분석**: 포커 용어집. OJT Master와 **무관한 테이블**. 제거 또는 분리 권장.

---

## 8. 시스템 뷰 (2개) 📊

### 8.1 cache_hit_ratio
```
metric, ratio_percent
```

### 8.2 index_usage_stats
```
schemaname, tablename, indexname, index_scans, tuples_read, tuples_fetched, status
```

**분석**: PostgreSQL 성능 모니터링 뷰. 유지.

---

## 9. 중복/분리 분석

### 9.1 두 개의 시스템 발견

| 시스템 | 테이블 | 특징 |
|--------|--------|------|
| **OJT Master** | ojt_docs, learning_records, learning_progress, users | 현재 앱 |
| **LMS 확장** | lessons, quizzes, curriculum_days, profiles, user_progress | 별도 시스템 |

### 9.2 관계 구조

```
OJT Master 시스템                  LMS 확장 시스템
─────────────────                  ─────────────────
users                              profiles
  ↓                                  ↓
ojt_docs (JSONB quiz)              lessons ← curriculum_days
  ↓                                  ↓
learning_progress                  quizzes ← quiz_pools
learning_records                     ↓
                                   quiz_attempts
                                   user_progress
                                   user_quiz_history
                                   user_question_history
```

### 9.3 결론

**두 시스템이 공존**:
1. `ojt_docs` 기반: 현재 OJT Master 앱
2. `lessons` 기반: 확장 LMS 시스템 (미사용 또는 개발 중)

---

## 10. 권장 조치

### 10.1 즉시 제거 권장 (1개)

| 테이블 | 사유 |
|--------|------|
| `poker_glossary` | 다른 프로젝트 테이블 |

### 10.2 정리 검토 필요 (12개)

**LMS 확장 테이블** - 사용 여부 확인 후 결정:

| 테이블 | 조치 |
|--------|------|
| lessons, lesson_versions | 사용 중이면 유지, 아니면 제거 |
| quizzes, quiz_pools, quiz_attempts | 사용 중이면 유지, 아니면 제거 |
| curriculum_days | 사용 중이면 유지, 아니면 제거 |
| profiles | users와 통합 검토 |
| user_progress | learning_progress와 역할 구분 |
| achievements, user_achievements | 게임화 기능 사용 여부 확인 |
| user_quiz_history, user_question_history | 사용 여부 확인 |

### 10.3 유지 (10개)

**OJT 핵심 + 분석/로그**:
- users, teams, departments, ojt_docs
- learning_records, learning_progress
- admin_settings, audit_logs
- ai_processing_logs, content_creation_metrics (선택적)

---

## 11. SCHEMA.md 업데이트 계획

### 현재 문서화: 8개 테이블
### 실제 존재: 23개 테이블 + 2개 뷰

**선택지**:
1. **OJT 핵심만 문서화** (8개) - 현재 앱 기준
2. **전체 문서화** (23개) - 모든 테이블 포함
3. **정리 후 문서화** - 불필요 테이블 제거 후

---

## Appendix: 전체 테이블 데이터 존재 여부 확인 필요

```sql
-- 각 테이블 레코드 수 확인 쿼리
SELECT 'lessons' as table_name, COUNT(*) as count FROM lessons
UNION ALL SELECT 'quizzes', COUNT(*) FROM quizzes
UNION ALL SELECT 'curriculum_days', COUNT(*) FROM curriculum_days
UNION ALL SELECT 'profiles', COUNT(*) FROM profiles
UNION ALL SELECT 'user_progress', COUNT(*) FROM user_progress
UNION ALL SELECT 'achievements', COUNT(*) FROM achievements
UNION ALL SELECT 'poker_glossary', COUNT(*) FROM poker_glossary;
```

---

**Report End**
