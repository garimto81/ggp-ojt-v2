# DB 마이그레이션 가이드

> OJT Master v2.0.0 → v2.1.0 데이터베이스 스키마 확장 가이드

## 개요

이 문서는 기존 Supabase 스키마를 확장하여 학습 진행률 추적, 팀 관리, 알림 기능을 추가하는 마이그레이션 가이드입니다.

## 마이그레이션 단계

| Phase | 작업 | 위험도 | 다운타임 |
|-------|------|:------:|:--------:|
| **1** | 인덱스 최적화 | 낮음 | 없음 |
| **2** | learning_progress 테이블 | 낮음 | 없음 |
| **3** | teams 테이블 분리 | 중간 | 없음 |
| **4** | notifications 테이블 | 낮음 | 없음 |
| **5** | 레거시 정리 | 중간 | 점검 필요 |

---

## Phase 1: 인덱스 최적화 (즉시 적용)

`supabase_performance.sql` 파일 실행:

```bash
# Supabase CLI 사용
supabase db push

# 또는 Supabase SQL Editor에서 직접 실행
```

### 추가되는 인덱스

| 인덱스명 | 테이블 | 타입 | 목적 |
|----------|--------|------|------|
| `idx_ojt_docs_sections_gin` | ojt_docs | GIN | JSONB 검색 |
| `idx_ojt_docs_quiz_gin` | ojt_docs | GIN | JSONB 검색 |
| `idx_ojt_docs_team_step` | ojt_docs | B-tree | 팀별 로드맵 |
| `idx_learning_records_user_passed` | learning_records | B-tree | 통과 기록 필터 |
| `idx_users_role` | users | B-tree | RLS 성능 |

---

## Phase 2: learning_progress 테이블 추가

### 스키마

```sql
CREATE TABLE IF NOT EXISTS learning_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  doc_id UUID NOT NULL REFERENCES ojt_docs(id) ON DELETE CASCADE,

  -- 진행 상태
  status TEXT DEFAULT 'not_started'
    CHECK (status IN ('not_started', 'in_progress', 'completed', 'passed')),

  -- 학습 시간 추적
  started_at TIMESTAMPTZ,
  last_accessed_at TIMESTAMPTZ,
  total_time_seconds INTEGER DEFAULT 0,

  -- 콘텐츠 진행률
  current_section INTEGER DEFAULT 0,
  sections_completed INTEGER DEFAULT 0,

  -- 퀴즈 시도 기록
  quiz_attempts INTEGER DEFAULT 0,
  best_score INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, doc_id)
);

-- 인덱스
CREATE INDEX idx_progress_user ON learning_progress(user_id);
CREATE INDEX idx_progress_status ON learning_progress(user_id, status);

-- RLS 정책
ALTER TABLE learning_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own progress"
  ON learning_progress FOR SELECT
  USING (user_id = auth.uid() OR is_admin());

CREATE POLICY "Users can manage own progress"
  ON learning_progress FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
```

### 기존 데이터 마이그레이션

```sql
-- learning_records에서 초기 데이터 생성
INSERT INTO learning_progress (user_id, doc_id, status, quiz_attempts, best_score, created_at)
SELECT
  user_id,
  doc_id,
  CASE WHEN passed THEN 'passed' ELSE 'completed' END as status,
  1 as quiz_attempts,
  score as best_score,
  completed_at as created_at
FROM learning_records
ON CONFLICT (user_id, doc_id) DO UPDATE
SET
  quiz_attempts = learning_progress.quiz_attempts + 1,
  best_score = GREATEST(learning_progress.best_score, EXCLUDED.best_score);
```

---

## Phase 3: teams 테이블 분리

### 스키마

```sql
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view teams"
  ON teams FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage teams"
  ON teams FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());
```

### 초기 데이터 마이그레이션

```sql
-- 기존 team 문자열에서 고유 팀 추출
INSERT INTO teams (name, slug, display_order)
SELECT DISTINCT
  team as name,
  LOWER(REGEXP_REPLACE(team, '[^a-zA-Z0-9가-힣]', '_', 'g')) as slug,
  ROW_NUMBER() OVER (ORDER BY team) as display_order
FROM ojt_docs
WHERE team IS NOT NULL
ON CONFLICT (name) DO NOTHING;

-- ojt_docs에 team_id 컬럼 추가
ALTER TABLE ojt_docs ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id);

-- 데이터 연결
UPDATE ojt_docs o
SET team_id = t.id
FROM teams t
WHERE o.team = t.name;

-- 인덱스 추가
CREATE INDEX idx_ojt_docs_team_id ON ojt_docs(team_id);
```

### 검증

```sql
SELECT
  COUNT(*) as total,
  COUNT(team_id) as migrated,
  COUNT(*) - COUNT(team_id) as pending
FROM ojt_docs;
```

---

## Phase 4: notifications 테이블 추가

### 스키마

```sql
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  type TEXT NOT NULL CHECK (type IN (
    'new_doc',
    'quiz_passed',
    'quiz_failed',
    'role_changed',
    'feedback_received'
  )),

  title TEXT NOT NULL,
  message TEXT,

  related_doc_id UUID REFERENCES ojt_docs(id) ON DELETE SET NULL,
  related_user_id UUID REFERENCES users(id) ON DELETE SET NULL,

  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read)
  WHERE is_read = false;
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);

-- RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
```

---

## Phase 5: 레거시 정리 (검증 후 선택적)

### ojt_docs.team 컬럼 제거

```sql
-- ⚠️ team_id 마이그레이션 완료 확인 후 실행
-- 1. NOT NULL 제약 추가
ALTER TABLE ojt_docs ALTER COLUMN team_id SET NOT NULL;

-- 2. 기존 team 컬럼 제거 (백업 후 진행)
-- ALTER TABLE ojt_docs DROP COLUMN team;
```

---

## 롤백 계획

### Phase 2 롤백

```sql
DROP TABLE IF EXISTS learning_progress CASCADE;
```

### Phase 3 롤백

```sql
ALTER TABLE ojt_docs DROP COLUMN IF EXISTS team_id;
DROP INDEX IF EXISTS idx_ojt_docs_team_id;
DROP TABLE IF EXISTS teams CASCADE;
```

### Phase 4 롤백

```sql
DROP TABLE IF EXISTS notifications CASCADE;
```

---

## Dexie.js 스키마 업데이트

클라이언트 코드(`index.html`)에서 Dexie 스키마 업데이트:

```javascript
// 버전 업그레이드
const CACHE_VERSION = 3;

localDb.version(3).stores({
  users: 'id, name, role',
  teams: 'id, slug, display_order',  // 신규
  ojt_docs: 'id, team_id, team, step, author_id, updated_at',
  learning_records: 'id, user_id, doc_id',
  learning_progress: 'id, user_id, doc_id, status',  // 신규
  notifications: 'id, user_id, is_read, created_at',  // 신규
  sync_queue: '++id, table, action, created_at'
});
```

---

## 체크리스트

### 마이그레이션 전

- [ ] 현재 DB 백업 완료
- [ ] Supabase Studio에서 현재 스키마 확인
- [ ] 테스트 환경에서 스크립트 검증

### 마이그레이션 후

- [ ] 인덱스 생성 확인 (`SELECT * FROM pg_indexes WHERE schemaname = 'public'`)
- [ ] RLS 정책 확인 (`SELECT * FROM pg_policies`)
- [ ] 데이터 무결성 확인
- [ ] 클라이언트 앱 테스트

---

## 참고 자료

- [Supabase Database Migrations](https://supabase.com/docs/guides/deployment/database-migrations)
- [PostgreSQL GIN Indexes](https://www.postgresql.org/docs/current/gin.html)
- [Row Level Security Best Practices](https://supabase.com/docs/guides/database/postgres/row-level-security)
