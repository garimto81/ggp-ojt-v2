# 성능 최적화 가이드

> OJT Master v2.1.0 Supabase 성능 최적화 종합 가이드

## 개요

이 문서는 Supabase PostgreSQL 데이터베이스의 성능을 최적화하기 위한 인덱스, RLS, 캐싱 전략을 다룹니다.

---

## 1. JSONB 최적화

### 1.1 GIN 인덱스

`sections`와 `quiz` JSONB 컬럼에 GIN 인덱스를 추가하여 검색 성능을 향상합니다.

```sql
-- sections JSONB 검색 최적화
CREATE INDEX idx_ojt_docs_sections_gin ON ojt_docs USING GIN (sections);

-- quiz JSONB 검색 최적화
CREATE INDEX idx_ojt_docs_quiz_gin ON ojt_docs USING GIN (quiz);
```

**효과**: 순차 스캔(Sequential Scan) → 인덱스 스캔으로 전환하여 **100배 이상 성능 향상**

### 1.2 GIN 인덱스 지원 연산자

| 연산자 | 설명 | 예시 |
|--------|------|------|
| `@>` | 포함 여부 | `sections @> '[{"title": "학습 목표"}]'` |
| `?` | 키 존재 여부 | `quiz ? 'question'` |
| `?|` | 키 배열 중 하나 존재 | `quiz ?| array['question', 'answer']` |

### 1.3 Supabase 클라이언트 사용 예시

```javascript
// sections에서 특정 title 검색
const { data } = await supabase
  .from('ojt_docs')
  .select('*')
  .contains('sections', [{ title: '학습 목표' }]);
```

---

## 2. RLS (Row Level Security) 최적화

### 2.1 SELECT 래핑으로 캐싱

`auth.uid()`를 `(SELECT auth.uid())`로 래핑하면 PostgreSQL이 결과를 캐싱합니다.

```sql
-- ❌ 비효율적 (매 행마다 함수 호출)
USING (auth.uid() = id)

-- ✅ 효율적 (statement당 1회만 호출)
USING ((SELECT auth.uid()) = id)
```

**효과**: **94.97% 성능 향상**

### 2.2 인덱스 추가

RLS 정책에서 사용하는 컬럼에 인덱스를 추가합니다.

```sql
-- users.role 인덱스 (is_admin 함수 최적화)
CREATE INDEX idx_users_role ON users(role);
```

### 2.3 Security Definer 함수 최적화

NULL 체크를 추가하여 비인증 사용자의 불필요한 DB 조회를 방지합니다.

```sql
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  -- 비인증 시 즉시 반환 (DB 조회 없음)
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  RETURN COALESCE(
    (SELECT role = 'admin' FROM public.users WHERE id = auth.uid()),
    false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
```

### 2.4 역할(Role) 명시

`TO authenticated`를 지정하여 익명 사용자의 RLS 평가를 방지합니다.

```sql
CREATE POLICY "Authenticated users can view docs"
  ON ojt_docs FOR SELECT
  TO authenticated  -- anon 역할 제외
  USING (true);
```

---

## 3. 인덱스 전략

### 3.1 인덱스 유형별 사용 가이드

| 인덱스 유형 | 사용 시나리오 | 예시 |
|------------|--------------|------|
| **B-tree** (기본) | 등호, 범위 검색 | `WHERE team = 'dev'` |
| **GIN** | JSONB, 배열, 전문 검색 | `WHERE sections @> '...'` |
| **BRIN** | 시계열 데이터 | `WHERE created_at > NOW() - '7 days'` |
| **복합** | 다중 컬럼 필터 | `WHERE team = 'dev' AND step = 1` |

### 3.2 권장 인덱스

```sql
-- 팀별 로드맵 조회
CREATE INDEX idx_ojt_docs_team_step ON ojt_docs(team, step);

-- 학습 기록 필터
CREATE INDEX idx_learning_records_user_passed ON learning_records(user_id, passed);

-- 시계열 검색
CREATE INDEX idx_ojt_docs_created_brin ON ojt_docs USING BRIN (created_at);
```

### 3.3 부분 인덱스 (Partial Index)

자주 검색하는 조건에만 인덱스를 생성하여 크기를 줄입니다.

```sql
-- 통과한 기록만 인덱싱
CREATE INDEX idx_learning_records_passed ON learning_records(user_id, passed)
  WHERE passed = true;

-- 최근 30일 알림만 인덱싱
CREATE INDEX idx_notifications_recent ON notifications(user_id, created_at)
  WHERE created_at > NOW() - INTERVAL '30 days';
```

---

## 4. 캐싱 전략 (Dexie.js)

### 4.1 현재 구조

```javascript
const localDb = new Dexie('OJTMasterCache');
localDb.version(1).stores({
  users: 'id, name, role',
  ojt_docs: 'id, team, step, author_id, updated_at',
  learning_records: 'id, user_id, doc_id',
  sync_queue: '++id, table, action, created_at'
});
```

### 4.2 캐시 무효화 전략

```javascript
// 캐시 버전 관리
const CACHE_VERSION = 2;
const CACHE_VERSION_KEY = 'ojt_cache_version';

// 버전 불일치 시 캐시 초기화
const checkCacheVersion = async () => {
  const storedVersion = parseInt(localStorage.getItem(CACHE_VERSION_KEY) || '0', 10);
  if (storedVersion < CACHE_VERSION) {
    await clearAllCache();
    localStorage.setItem(CACHE_VERSION_KEY, String(CACHE_VERSION));
  }
};
```

### 4.3 오프라인 큐 처리

```javascript
// 온라인 복귀 시 큐 처리
window.addEventListener('online', processSyncQueue);

const processSyncQueue = async () => {
  const queue = await localDb.sync_queue.toArray();
  for (const item of queue) {
    try {
      await syncToSupabase(item);
      await localDb.sync_queue.delete(item.id);
    } catch (e) {
      item.retries = (item.retries || 0) + 1;
      if (item.retries >= MAX_SYNC_RETRIES) {
        await localDb.sync_queue.delete(item.id);  // 폐기
      }
    }
  }
};
```

---

## 5. 실시간 구독 최적화

### 5.1 필터링으로 구독 범위 제한

```javascript
// ❌ 전체 테이블 구독 (비효율적)
supabase
  .channel('all')
  .on('postgres_changes', { table: 'ojt_docs' }, handler)
  .subscribe();

// ✅ 팀별 필터링 (효율적)
supabase
  .channel(`team-${currentTeam}`)
  .on('postgres_changes', {
    table: 'ojt_docs',
    filter: `team=eq.${currentTeam}`
  }, handler)
  .subscribe();
```

### 5.2 Private Channel 사용

```javascript
const channel = supabase.channel('updates', { config: { private: true } });
```

---

## 6. 성능 모니터링

### 6.1 인덱스 사용률 확인

```sql
SELECT
  tablename,
  indexname,
  idx_scan as index_scans,
  CASE
    WHEN idx_scan = 0 THEN 'UNUSED - 삭제 검토'
    WHEN idx_scan < 100 THEN 'LOW - 모니터링 필요'
    ELSE 'ACTIVE'
  END as status
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;
```

### 6.2 캐시 히트율 확인

```sql
SELECT
  'cache hit rate' AS metric,
  ROUND(
    SUM(heap_blks_hit)::numeric /
    NULLIF(SUM(heap_blks_hit) + SUM(heap_blks_read), 0)::numeric * 100,
    2
  ) AS ratio_percent
FROM pg_statio_user_tables;
```

**목표**: 99% 이상

### 6.3 느린 쿼리 확인

```sql
SELECT
  query,
  calls,
  mean_exec_time,
  max_exec_time
FROM pg_stat_statements
WHERE query LIKE '%ojt_docs%'
ORDER BY mean_exec_time DESC
LIMIT 10;
```

---

## 7. 체크리스트

### 즉시 적용

- [x] GIN 인덱스 추가 (`supabase_performance.sql`)
- [x] RLS 함수 NULL 체크
- [x] `idx_users_role` 인덱스

### 권장 적용

- [ ] 복합 인덱스 추가
- [ ] BRIN 인덱스 추가
- [ ] 실시간 구독 필터링

### 모니터링

- [ ] 캐시 히트율 99% 이상 확인
- [ ] 미사용 인덱스 정리
- [ ] 느린 쿼리 최적화

---

## 참고 자료

- [Supabase Query Optimization](https://supabase.com/docs/guides/database/query-optimization)
- [PostgreSQL GIN Indexes](https://www.postgresql.org/docs/current/gin.html)
- [RLS Performance Best Practices](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv)
- [Supabase Realtime Benchmarks](https://supabase.com/docs/guides/realtime/benchmarks)
