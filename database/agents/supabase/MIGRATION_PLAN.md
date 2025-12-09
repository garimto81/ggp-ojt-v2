# Supabase 테이블 수정 계획 v2.0

**Date**: 2025-12-10
**Author**: supabase-agent
**Status**: 🔄 재검토 필요
**Version**: 2.0.0 (실제 DB 기반 재수립)

---

## 핵심 발견사항

### 두 개의 시스템이 공존

실제 Supabase API 조회 결과, 데이터베이스에 **두 개의 별개 시스템**이 존재합니다:

| 시스템 | 핵심 테이블 | 데이터 현황 | 상태 |
|--------|-------------|-------------|------|
| **OJT Master** | ojt_docs, learning_records, learning_progress | 운영 데이터 | ✅ 운영 중 |
| **LMS 확장** | lessons, quizzes, curriculum_days, profiles | 48개 레코드 | ⚠️ 검토 필요 |

### 데이터 존재 테이블

| 테이블 | 레코드 수 | 시스템 | 삭제 가능 |
|--------|----------|--------|-----------|
| lessons | 22 | LMS | ❌ 데이터 확인 필요 |
| achievements | 9 | 게임화 | ❌ 데이터 확인 필요 |
| curriculum_days | 7 | LMS | ❌ 데이터 확인 필요 |
| profiles | 5 | LMS | ❌ 데이터 확인 필요 |
| quizzes | 5 | LMS | ❌ 데이터 확인 필요 |
| poker_glossary | 0 | 무관 | ✅ 즉시 제거 가능 |

---

## 수정 계획

### Phase 0: 사전 확인 (필수)

**목적**: LMS 확장 시스템 사용 여부 결정

```bash
# 프론트엔드에서 LMS 테이블 참조 여부 확인
grep -r "lessons" src-vite/src/
grep -r "curriculum_days" src-vite/src/
grep -r "quizzes" src-vite/src/  # quizzes 테이블 (ojt_docs.quiz와 구분)
grep -r "profiles" src-vite/src/
grep -r "achievements" src-vite/src/
```

**결정 기준**:
- 참조 있음 → LMS 시스템 유지
- 참조 없음 → 테스트/레거시 데이터로 판단, 제거 검토

---

### Phase 1: 즉시 실행 가능 (승인 완료)

#### 1.1 poker_glossary 제거

**상태**: ✅ 승인됨 (0개 레코드, 무관한 프로젝트)

```sql
-- 파일: database/migrations/20251210_remove_poker_glossary.sql

-- Phase 1: 데이터 확인 (안전장치)
DO $$
DECLARE rec_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO rec_count FROM poker_glossary;
  IF rec_count > 0 THEN
    RAISE EXCEPTION 'poker_glossary에 데이터 %개 존재. 삭제 중단.', rec_count;
  END IF;
END $$;

-- Phase 2: 테이블 제거
DROP TABLE IF EXISTS public.poker_glossary;

-- Phase 3: 검증
SELECT 'poker_glossary 제거 완료' as status;
```

#### 1.2 admin_logs → audit_logs 통합

**상태**: ✅ 승인됨 (이전 세션)

```sql
-- 파일: database/migrations/20251210_admin_logs_integration.sql
-- (기존 20251209_table_cleanup.sql 내용 유지)
```

#### 1.3 content_reports 제거

**상태**: ✅ 승인됨 (미사용)

```sql
-- 파일: database/migrations/20251210_remove_content_reports.sql
-- (기존 스크립트 유지)
```

---

### Phase 2: 검토 후 결정 (LMS 확장 테이블)

#### 선택지 A: LMS 시스템 유지

LMS 기능을 향후 사용할 계획인 경우:

| 조치 | 테이블 |
|------|--------|
| 유지 | lessons, quizzes, curriculum_days, profiles |
| 유지 | quiz_pools, quiz_attempts, user_progress |
| 유지 | achievements, user_achievements |
| 유지 | user_quiz_history, user_question_history |
| 문서화 | SCHEMA.md에 LMS 섹션 추가 (완료) |

#### 선택지 B: LMS 시스템 제거

LMS 기능을 사용하지 않을 경우:

**주의**: 48개 레코드 손실

| 단계 | 테이블 | 레코드 | 조치 |
|------|--------|--------|------|
| 1 | quiz_attempts | 0 | DROP |
| 2 | user_progress | 0 | DROP |
| 3 | user_quiz_history | 0 | DROP |
| 4 | user_question_history | 0 | DROP |
| 5 | quiz_pools | 0 | DROP |
| 6 | quizzes | 5 | 백업 후 DROP |
| 7 | lesson_versions | 0 | DROP |
| 8 | lessons | 22 | 백업 후 DROP |
| 9 | curriculum_days | 7 | 백업 후 DROP |
| 10 | profiles | 5 | 백업 후 DROP |
| 11 | user_achievements | 0 | DROP |
| 12 | achievements | 9 | 백업 후 DROP |
| 13 | ai_processing_logs | 0 | DROP |
| 14 | content_creation_metrics | 0 | DROP |

```sql
-- 백업 스크립트 (제거 전 필수)
COPY lessons TO '/tmp/backup_lessons.csv' CSV HEADER;
COPY quizzes TO '/tmp/backup_quizzes.csv' CSV HEADER;
COPY curriculum_days TO '/tmp/backup_curriculum_days.csv' CSV HEADER;
COPY profiles TO '/tmp/backup_profiles.csv' CSV HEADER;
COPY achievements TO '/tmp/backup_achievements.csv' CSV HEADER;
```

---

### Phase 3: 최적화 (선택)

#### 3.1 users.department → department_id 마이그레이션

```sql
-- Step 1: 기존 TEXT → department_id FK 데이터 이전
UPDATE users u
SET department_id = d.id
FROM departments d
WHERE u.department = d.name
  AND u.department_id IS NULL;

-- Step 2: (향후) department 컬럼 제거
-- ALTER TABLE users DROP COLUMN department;
```

---

## 승인 요청

### 질문사항

1. **LMS 확장 테이블 처리 방향**:
   - [ ] A: 유지 (향후 사용 계획 있음)
   - [ ] B: 제거 (테스트/레거시 데이터)

2. **게임화 테이블 (achievements) 처리**:
   - [ ] 유지
   - [ ] 제거

### 체크리스트 (Phase 1)

- [x] admin_logs 통합 승인
- [x] content_reports 제거 승인
- [x] poker_glossary 제거 가능 확인 (0개 레코드)
- [ ] **사용자 최종 승인 대기**

---

## 롤백 계획

### poker_glossary 복구

```sql
-- 파일: database/migrations/20251210_remove_poker_glossary_rollback.sql
CREATE TABLE IF NOT EXISTS public.poker_glossary (
  term TEXT PRIMARY KEY,
  definition TEXT NOT NULL,
  aliases TEXT[] DEFAULT '{}',
  context_examples TEXT[] DEFAULT '{}',
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

GRANT ALL ON public.poker_glossary TO authenticated;
```

### LMS 테이블 복구 (선택지 B 선택 시)

백업 파일에서 복구:
```sql
COPY lessons FROM '/tmp/backup_lessons.csv' CSV HEADER;
-- ... 기타 테이블
```

---

## 최종 테이블 구조 (목표)

### Phase 1 완료 후 (21개)

```
유지 테이블 (21개)
─────────────────
OJT 핵심 (8개):
  users, teams, departments, ojt_docs,
  learning_records, learning_progress, admin_settings, audit_logs

LMS 확장 (8개) - 검토 대기:
  lessons, lesson_versions, quizzes, quiz_pools, quiz_attempts,
  curriculum_days, user_progress, profiles

게임화 (2개) - 검토 대기:
  achievements, user_achievements

분석 (2개) - 검토 대기:
  ai_processing_logs, content_creation_metrics

퀴즈 이력 (2개) - 검토 대기:
  user_quiz_history, user_question_history

시스템 뷰 (2개):
  cache_hit_ratio, index_usage_stats

제거 예정 (2개)
─────────────────
- poker_glossary    → 다른 프로젝트 테이블
- admin_logs        → audit_logs로 통합 (이미 승인)
- content_reports   → 미사용 (이미 승인)
```

---

## 실행 순서

| # | 작업 | 우선순위 | 위험도 | 상태 |
|---|------|----------|--------|------|
| 1 | poker_glossary 제거 | HIGH | NONE | 🔄 승인 대기 |
| 2 | admin_logs → audit_logs 통합 | HIGH | LOW | ✅ 승인됨 |
| 3 | content_reports 제거 | HIGH | NONE | ✅ 승인됨 |
| 4 | LMS 테이블 처리 결정 | MEDIUM | MEDIUM | 🔄 검토 필요 |
| 5 | 게임화 테이블 처리 결정 | LOW | LOW | 🔄 검토 필요 |

---

**Document End**
