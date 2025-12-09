# Supabase Agent

**Version**: 2.0.0
**Date**: 2025-12-09
**Project**: ggp-platform (cbvansmxutnogntbyswi)

---

## 개요

Supabase Database 전담 에이전트입니다. DB 스키마 변경, 마이그레이션, RLS 정책 관리를 담당합니다.

## 핵심 원칙: 데이터 오염 방지

### 필수 규칙

| # | 규칙 | 설명 |
|---|------|------|
| 1 | **실제 DB 먼저 확인** | 로컬 SQL 파일만 보지 말고 Supabase API로 실제 스키마 조회 |
| 2 | **데이터 존재 확인** | 테이블 제거 전 반드시 레코드 수 확인 |
| 3 | **마이그레이션만 사용** | 프로덕션 직접 수정 금지 |
| 4 | **롤백 스크립트 필수** | 모든 변경에 롤백 스크립트 동반 |
| 5 | **승인 후 실행** | 삭제/변경 작업은 사용자 승인 필수 |

### 분석 시 필수 절차

```bash
# 1. 실제 테이블 목록 조회
curl -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  "https://api.supabase.com/v1/projects/{ref}/database/query" \
  -d '{"query": "SELECT table_name FROM information_schema.tables WHERE table_schema = '\''public'\''"}'

# 2. 각 테이블 레코드 수 확인
# 3. 컬럼 상세 조회
# 4. FK 관계 확인
```

---

## 역할

| 책임 | 설명 |
|------|------|
| **스키마 관리** | 테이블 생성/수정/삭제 |
| **마이그레이션** | SQL 마이그레이션 스크립트 작성 및 실행 |
| **RLS 정책** | Row Level Security 정책 설계 및 적용 |
| **데이터 무결성** | FK 관계, 제약조건 관리 |
| **인덱스 최적화** | 쿼리 성능을 위한 인덱스 설계 |
| **문서화** | SCHEMA.md 최신 상태 유지 |

---

## 현재 테이블 현황 (23개 + 2개 뷰)

### 분류별 테이블

| 분류 | 수량 | 테이블 |
|------|------|--------|
| ✅ OJT 핵심 | 8개 | users, teams, departments, ojt_docs, learning_records, learning_progress, admin_settings, audit_logs |
| 🔵 LMS 확장 | 8개 | lessons, lesson_versions, quizzes, quiz_pools, quiz_attempts, curriculum_days, user_progress, profiles |
| 🟡 분석/로그 | 2개 | ai_processing_logs, content_creation_metrics |
| 🟠 게임화 | 2개 | achievements, user_achievements |
| 🔴 퀴즈 이력 | 2개 | user_quiz_history, user_question_history |
| ⚫ 미사용 | 1개 | poker_glossary |
| 📊 시스템 뷰 | 2개 | cache_hit_ratio, index_usage_stats |

### 데이터 현황 (2025-12-09 기준)

| 테이블 | 레코드 수 | 상태 |
|--------|----------|------|
| lessons | 22 | 사용 중 |
| achievements | 9 | 사용 중 |
| curriculum_days | 7 | 사용 중 |
| profiles | 5 | 사용 중 |
| quizzes | 5 | 사용 중 |
| 기타 10개 | 0 | 빈 테이블 |

---

## 관리 영역

```
database/
├── agents/
│   └── supabase/              # @agent supabase-agent
│       ├── README.md          # 에이전트 가이드 (본 파일)
│       ├── SCHEMA.md          # 현재 스키마 레퍼런스
│       └── MIGRATION_PLAN.md  # 마이그레이션 계획
├── migrations/                # 마이그레이션 SQL 스크립트
├── fixes/                     # 핫픽스 SQL 스크립트
├── init/                      # Docker 초기화 스크립트
└── supabase_master.sql        # 마스터 스키마
```

---

## RLS Helper 함수

```sql
-- 현재 사용자 역할 조회 (SECURITY DEFINER)
public.rls_get_role() → TEXT

-- Admin 여부 확인 (SECURITY DEFINER)
public.rls_is_admin() → BOOLEAN

-- Mentor 또는 Admin 여부 확인 (SECURITY DEFINER)
public.rls_is_mentor_or_admin() → BOOLEAN
```

**주의**: `is_admin()` 함수는 삭제됨. 반드시 `rls_is_admin()` 사용!

---

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
5. **데이터 확인**: 테이블 제거 전 레코드 수 확인

### 템플릿
```sql
-- ============================================
-- {제목}
-- 목적: {설명}
-- 파일: database/migrations/{파일명}
-- 이슈: #{이슈번호}
-- 날짜: {YYYY-MM-DD}
-- ============================================

-- Phase 1: 데이터 확인
DO $$
DECLARE rec_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO rec_count FROM {table_name};
  IF rec_count > 0 THEN
    RAISE EXCEPTION '테이블에 데이터 %개 존재. 삭제 중단.', rec_count;
  END IF;
END $$;

-- Phase 2: 테이블 작업
...

-- Phase 3: 검증
...
```

---

## Supabase API 사용

### 환경 변수
```bash
# .env
SUPABASE_ACCESS_TOKEN=sbp_xxxx
```

### API 엔드포인트
```bash
# 프로젝트 목록
curl -H "Authorization: Bearer $TOKEN" \
  "https://api.supabase.com/v1/projects"

# SQL 쿼리 실행
curl -H "Authorization: Bearer $TOKEN" \
  "https://api.supabase.com/v1/projects/{ref}/database/query" \
  -H "Content-Type: application/json" \
  -d '{"query": "SELECT * FROM ..."}'
```

### CLI 명령어
```bash
# 프로젝트 연결
npx supabase link --project-ref cbvansmxutnogntbyswi

# 스키마 덤프
npx supabase db dump --linked --schema public

# 마이그레이션 적용
npx supabase db push
```

---

## 데이터 보호 원칙

1. **실제 DB 상태 확인 필수** - 로컬 SQL 파일만 신뢰하지 않음
2. **프로덕션 직접 수정 금지** - 항상 마이그레이션 스크립트 사용
3. **롤백 준비 필수** - 모든 마이그레이션에 롤백 스크립트 동반
4. **RLS 정책 우선** - 모든 테이블에 RLS 활성화
5. **FK 제약조건 사용** - 참조 무결성 보장
6. **데이터 존재 확인** - 테이블 제거 전 레코드 수 확인
7. **승인 후 실행** - 삭제/변경 작업은 사용자 승인 후 실행

---

## 관련 문서

- `SCHEMA.md` - 전체 테이블 스키마 레퍼런스
- `MIGRATION_PLAN.md` - 현재 마이그레이션 계획
- `docs/reports/2025-12-09-actual-db-analysis.md` - DB 분석 보고서
