# PRD vs Supabase DB 비교 분석 보고서

**Date**: 2025-12-09
**Prepared by**: supabase-agent
**Version**: 2.0.0 (완전판)

---

## 1. Executive Summary

OJT Master 프로젝트의 PRD 문서와 실제 Supabase 데이터베이스 스키마를 비교 분석한 결과입니다.

### 분석 결과 요약

| 항목 | 수량 | 상세 |
|------|------|------|
| **PRD 정의 테이블** | 7개 | users, teams, ojt_docs, learning_records, learning_progress, doc_sections, quiz_pools |
| **실제 구현 테이블** | 10개 | 핵심 5개 + 추가 5개 |
| **PRD에 없는 테이블** | 5개 | departments, admin_settings, admin_logs, content_reports, audit_logs |
| **미구현 테이블** | 2개 | doc_sections, quiz_pools (v3 계획) |
| **중복/유사 테이블** | ⚠️ 1쌍 | admin_logs ↔ audit_logs (목적 중복 가능성) |

---

## 2. 테이블 비교 분석 (완전판)

### 2.1 전체 테이블 목록

#### SQL 파일별 테이블 정의 현황

| SQL 파일 | 정의된 테이블 |
|----------|---------------|
| `supabase_master.sql` | users, teams, ojt_docs, learning_records, learning_progress |
| `database/init/01_init.sql` | users, teams, ojt_docs, learning_records, learning_progress, **content_reports**, **admin_settings**, **admin_logs** |
| `database/fixes/supabase_audit_logs.sql` | **audit_logs** |
| `database/migrations/20251209_departments_table.sql` | **departments** |

### 2.2 실제 구현된 테이블 (10개)

| # | 테이블 | PRD 정의 | 출처 | 용도 |
|---|--------|----------|------|------|
| 1 | `users` | ✅ | master, init | 사용자 프로필 |
| 2 | `teams` | ✅ | master, init | 팀 마스터 (OJT 문서 분류) |
| 3 | `ojt_docs` | ✅ | master, init | OJT 교육 문서 |
| 4 | `learning_records` | ✅ | master, init | 학습 완료 기록 |
| 5 | `learning_progress` | ✅ | master, init | 학습 진행 상태 |
| 6 | `departments` | 🆕 | migration | 부서 마스터 (#178) |
| 7 | `admin_settings` | 🆕 | init | 관리자 설정 Key-Value |
| 8 | `admin_logs` | 🆕 | init | 관리자 활동 로그 |
| 9 | `content_reports` | 🆕 | init | 콘텐츠 신고 |
| 10 | `audit_logs` | 🆕 | fixes | 감사 로그 (역할변경, 문서삭제) |

### 2.3 PRD 정의 테이블 구현 상태

| 테이블 | PRD 문서 | 구현 상태 | 비고 |
|--------|----------|----------|------|
| `users` | SUPABASE_PRD, v3 | ✅ 구현됨 | department_id 추가됨 |
| `teams` | SUPABASE_PRD, v3 | ✅ 구현됨 | |
| `ojt_docs` | SUPABASE_PRD, v3 | ✅ 구현됨 | |
| `learning_records` | SUPABASE_PRD, v3 | ✅ 구현됨 | |
| `learning_progress` | SUPABASE_PRD, v3 | ✅ 구현됨 | |
| `doc_sections` | v3 계획 | ⚠️ 미구현 | JSONB로 대체 |
| `quiz_pools` | v3 계획 | ⚠️ 미구현 | JSONB로 대체 |

---

## 3. PRD에 없는 추가 테이블 상세 분석 (5개)

### 3.1 departments (신규 #178)

```sql
CREATE TABLE public.departments (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,        -- "개발팀", "디자인팀"
  slug TEXT NOT NULL UNIQUE,        -- "development", "design"
  description TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  color_theme TEXT,                 -- UI 배지 색상
  created_at, updated_at
);
```

| 항목 | 내용 |
|------|------|
| **출처** | `database/migrations/20251209_departments_table.sql` |
| **용도** | 사용자 부서 관리 마스터 테이블 |
| **필요성** | ✅ 필요 - teams(문서 분류)와 departments(사용자 부서) 개념 분리 |
| **권장** | PRD에 반영 필요 |

### 3.2 admin_settings

```sql
CREATE TABLE public.admin_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

| 항목 | 내용 |
|------|------|
| **출처** | `database/init/01_init.sql` |
| **용도** | 관리자 설정 Key-Value 저장소 |
| **주요 키** | `default_departments`, `default_roles` |
| **필요성** | ✅ 필요 - 동적 설정 관리에 유용 |
| **권장** | PRD에 반영 필요 |

### 3.3 admin_logs

```sql
CREATE TABLE public.admin_logs (
  id UUID PRIMARY KEY,
  admin_id UUID REFERENCES users(id),
  action TEXT NOT NULL,
  target_type TEXT,
  target_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

| 항목 | 내용 |
|------|------|
| **출처** | `database/init/01_init.sql` |
| **용도** | 관리자 활동 로그 |
| **필요성** | ⚠️ 검토 필요 - audit_logs와 중복 가능성 |
| **권장** | audit_logs와 통합 검토 |

### 3.4 content_reports

```sql
CREATE TABLE public.content_reports (
  id UUID PRIMARY KEY,
  doc_id UUID REFERENCES ojt_docs(id) ON DELETE CASCADE,
  reporter_id UUID REFERENCES users(id),
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved')),
  admin_notes TEXT,
  created_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ
);
```

| 항목 | 내용 |
|------|------|
| **출처** | `database/init/01_init.sql` |
| **용도** | 콘텐츠(문서) 신고 시스템 |
| **필요성** | ⚠️ 검토 필요 - 현재 사용 여부 확인 필요 |
| **권장** | 기능 사용 시 PRD 반영, 미사용 시 제거 검토 |

### 3.5 audit_logs

```sql
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'ROLE_CHANGE', 'LOGIN', 'LOGOUT',
    'DOC_CREATE', 'DOC_UPDATE', 'DOC_DELETE',
    'SECURITY_ALERT'
  )),
  table_name TEXT NOT NULL,
  record_id UUID,
  old_value JSONB,
  new_value JSONB,
  performed_by UUID REFERENCES auth.users(id),
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

| 항목 | 내용 |
|------|------|
| **출처** | `database/fixes/supabase_audit_logs.sql` |
| **용도** | 보안 감사 로그 (역할 변경, 문서 삭제 등) |
| **트리거** | `audit_user_role_change`, `audit_doc_delete` |
| **필요성** | ✅ 필요 - 보안 감사에 필수 |
| **권장** | PRD에 반영 필요, admin_logs와 역할 정리 |

---

## 4. 중복/유사 테이블 분석

### 4.1 ⚠️ admin_logs vs audit_logs

| 비교 항목 | admin_logs | audit_logs |
|-----------|------------|------------|
| **목적** | 관리자 활동 로그 | 보안 감사 로그 |
| **이벤트 타입** | 자유 텍스트 (action) | 제한된 enum (event_type) |
| **트리거** | 없음 (수동 기록) | 있음 (자동 기록) |
| **상세 정보** | details JSONB | old_value, new_value JSONB |
| **IP/UA 추적** | ❌ 없음 | ✅ 있음 |

**분석**: 두 테이블은 유사한 목적을 가지고 있어 **중복 가능성**이 있습니다.

**권장 조치**:
1. `audit_logs`를 주 감사 테이블로 사용 (트리거 기반 자동 기록)
2. `admin_logs`는 수동 기록이 필요한 경우에만 사용하거나 제거 검토
3. 또는 `admin_logs`를 `audit_logs`로 마이그레이션 후 통합

### 4.2 teams vs departments

| 비교 항목 | teams | departments |
|-----------|-------|-------------|
| **목적** | OJT 문서 분류 | 사용자 소속 부서 |
| **참조 위치** | ojt_docs.team_id | users.department_id |
| **예시** | Development, Design | 개발팀, 디자인팀 |

**분석**: 두 테이블은 **다른 목적**을 가지고 있어 **중복 아님**.
- `teams`: 콘텐츠(문서) 카테고리
- `departments`: 조직 구조(사용자 소속)

**권장**: 현재 분리 유지 ✅

---

## 5. 미구현 테이블 (PRD v3 계획)

### 5.1 doc_sections

| 항목 | 내용 |
|------|------|
| **PRD 정의** | 문서 섹션 정규화 테이블 |
| **현재 상태** | `ojt_docs.sections` JSONB로 대체 |
| **장단점** | JSONB: 단순, 빠름 / 정규화: 검색, 재사용 가능 |
| **권장** | ⏸️ 현재 JSONB 유지, 필요 시 v3에서 구현 |

### 5.2 quiz_pools

| 항목 | 내용 |
|------|------|
| **PRD 정의** | 퀴즈 문제 은행 테이블 |
| **현재 상태** | `ojt_docs.quiz` JSONB로 대체 |
| **장단점** | JSONB: 문서별 관리 / 정규화: 퀴즈 재사용, 난이도 관리 |
| **권장** | ⏸️ 현재 JSONB 유지, 필요 시 v3에서 구현 |

---

## 6. 권장 사항

### 6.1 즉시 조치 필요 (HIGH)

| # | 작업 | 설명 |
|---|------|------|
| 1 | SCHEMA.md 업데이트 | 누락된 5개 테이블 추가 문서화 |
| 2 | admin_logs vs audit_logs 정리 | 역할 명확화 또는 통합 |
| 3 | content_reports 사용 여부 확인 | 미사용 시 제거 검토 |

### 6.2 PRD 업데이트 필요 (MEDIUM)

| # | 작업 | 대상 |
|---|------|------|
| 1 | 테이블 추가 | departments, admin_settings, audit_logs |
| 2 | 테이블 검토 후 추가/제거 | admin_logs, content_reports |

### 6.3 향후 검토 (LOW)

| # | 작업 | 시기 |
|---|------|------|
| 1 | doc_sections 정규화 | v3 요구사항 확인 시 |
| 2 | quiz_pools 정규화 | 퀴즈 은행 기능 요청 시 |

---

## 7. 최종 테이블 매핑

```
PRD 정의                    실제 구현                    상태
─────────────────────      ────────────────────────    ────────
users                  ─►  users                       ✅ 일치
teams                  ─►  teams                       ✅ 일치
ojt_docs               ─►  ojt_docs                    ✅ 일치
learning_records       ─►  learning_records            ✅ 일치
learning_progress      ─►  learning_progress           ✅ 일치
doc_sections           ─►  (ojt_docs.sections JSONB)   ⏸️ 미구현
quiz_pools             ─►  (ojt_docs.quiz JSONB)       ⏸️ 미구현

PRD에 없음                  실제 구현                    상태
─────────────────────      ────────────────────────    ────────
(없음)                 ─►  departments                  🆕 추가됨
(없음)                 ─►  admin_settings               🆕 추가됨
(없음)                 ─►  admin_logs                   🆕 추가됨 ⚠️
(없음)                 ─►  content_reports              🆕 추가됨 ⚠️
(없음)                 ─►  audit_logs                   🆕 추가됨
```

---

## 8. 결론

### 핵심 테이블 (5개): ✅ 정상
PRD에서 정의한 핵심 5개 테이블은 모두 구현되어 있으며 스키마가 일치합니다.

### 추가 테이블 (5개): ⚠️ 문서화 필요
- `departments`: ✅ 필요 - PRD 반영 필요
- `admin_settings`: ✅ 필요 - PRD 반영 필요
- `audit_logs`: ✅ 필요 - PRD 반영 필요
- `admin_logs`: ⚠️ 검토 필요 - audit_logs와 중복 가능성
- `content_reports`: ⚠️ 검토 필요 - 사용 여부 확인 필요

### 미구현 테이블 (2개): ⏸️ 보류 적절
`doc_sections`와 `quiz_pools`는 현재 JSONB로 충분히 동작합니다.

### 중복 테이블: ⚠️ 정리 필요
`admin_logs`와 `audit_logs`는 역할이 유사하여 통합 또는 역할 명확화가 필요합니다.

---

## Appendix: SCHEMA.md 업데이트 필요 항목

현재 `database/agents/supabase/SCHEMA.md`에 누락된 테이블:

1. `admin_logs` - 추가 필요
2. `content_reports` - 추가 필요
3. `audit_logs` - 추가 필요

---

**Report End**
