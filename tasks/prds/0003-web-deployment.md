# PRD-0003: OJT Master 웹 배포 버전 (Supabase + Dexie.js)

> ✅ **현재 활성 문서**: 이 PRD는 v2.0.0 웹 배포 버전의 설계 문서입니다.
>
> 최종 업데이트: 2025-11-29 (Gemini API 전환 반영)

## 1. 목표

### 핵심 목표
- **온라인 서비스**: Vercel 배포로 어디서나 접근 가능
- **다중 사용자 지원**: Supabase로 사용자 간 데이터 공유
- **오프라인 지원**: Dexie.js 로컬 캐시로 끊김 없는 UX

### 설계 원칙
- **Online-First, Offline-Ready**: 온라인 우선, 오프라인 대비
- **Eventual Consistency**: 최종 일관성 보장
- **Graceful Degradation**: 네트워크 불안정 시 로컬 폴백

---

## 2. 아키텍처

### 2.1 시스템 구성도

```
┌─────────────────────────────────────────────────────────────┐
│                      클라이언트 (브라우저)                      │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │   React UI  │───▶│  Dexie.js   │◀──▶│  Supabase   │     │
│  │             │    │ (IndexedDB) │    │   Client    │     │
│  └─────────────┘    └──────┬──────┘    └──────┬──────┘     │
│                            │                   │            │
│                     로컬 캐시              API 호출          │
└────────────────────────────┼───────────────────┼────────────┘
                             │                   │
                             ▼                   ▼
                    ┌────────────────┐   ┌────────────────┐
                    │  IndexedDB     │   │   Supabase     │
                    │  (브라우저)     │   │   (PostgreSQL) │
                    └────────────────┘   └────────────────┘
```

### 2.2 데이터 흐름

```
[사용자 액션]
      │
      ▼
┌─────────────────┐
│ 1. Dexie 캐시   │ ← 즉각 반응 (UX 향상)
│    저장/조회    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 2. 온라인 확인  │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
 온라인     오프라인
    │         │
    ▼         ▼
┌────────┐  ┌────────┐
│Supabase│  │ 큐잉   │
│ 동기화 │  │ (추후) │
└────────┘  └────────┘
```

---

## 3. 기술 스택

### 3.1 기술 구성

| 영역 | 기술 | 버전 | 역할 |
|------|------|------|------|
| **Frontend** | React 18 | CDN | UI 렌더링 |
| **Styling** | Tailwind CSS | CDN | 스타일링 |
| **Editor** | Quill 2.0 | CDN | 리치 텍스트 에디터 |
| **Local DB** | Dexie.js | 4.x | IndexedDB 래퍼, 로컬 캐시 |
| **Cloud DB** | Supabase | - | PostgreSQL + Auth |
| **AI** | Google Gemini API | gemini-2.0-flash-exp | 클라우드 LLM (자료 생성) |
| **PDF** | PDF.js | 3.11.174 | PDF 텍스트 추출 |
| **JSX** | Babel Standalone | CDN | JSX 트랜스파일 |
| **Hosting** | Vercel | - | 정적 배포 |

### 3.2 CDN 의존성

```html
<!-- Supabase Client -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

<!-- Dexie.js (IndexedDB Wrapper) -->
<script src="https://unpkg.com/dexie@4/dist/dexie.min.js"></script>

<!-- React 18 -->
<script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
<script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>

<!-- Babel (JSX Transform) -->
<script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>

<!-- PDF.js (PDF 텍스트 추출) -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>

<!-- Quill 2.0 -->
<link href="https://cdn.jsdelivr.net/npm/quill@2/dist/quill.snow.css" rel="stylesheet">
<script src="https://cdn.jsdelivr.net/npm/quill@2/dist/quill.js"></script>
```

---

## 4. 데이터베이스 설계

### 4.1 Supabase 스키마 (PostgreSQL)

```sql
-- users: 사용자 프로필
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  name TEXT NOT NULL,
  role TEXT CHECK (role IN ('admin', 'mentor', 'mentee')),
  department TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ojt_docs: OJT 자료
CREATE TABLE ojt_docs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  team TEXT NOT NULL,
  step INTEGER DEFAULT 1,
  sections JSONB DEFAULT '[]',
  quiz JSONB DEFAULT '[]',
  author_id UUID REFERENCES users(id),
  author_name TEXT,
  estimated_minutes INTEGER DEFAULT 30,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- learning_records: 학습 기록
CREATE TABLE learning_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  doc_id UUID REFERENCES ojt_docs(id),
  score INTEGER,
  total_questions INTEGER DEFAULT 4,
  passed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, doc_id)
);
```

### 4.2 Dexie.js 스키마 (IndexedDB 캐시)

```javascript
const db = new Dexie('OJTMasterCache');

db.version(1).stores({
  // 로컬 캐시 테이블
  users: 'id, name, role',
  ojt_docs: 'id, team, step, author_id, updated_at',
  learning_records: 'id, user_id, doc_id',

  // 동기화 메타데이터
  sync_queue: '++id, table, action, data, created_at',
  sync_meta: 'table, last_synced_at'
});
```

### 4.3 RLS 정책 (Row Level Security)

| 테이블 | SELECT | INSERT | UPDATE | DELETE |
|--------|--------|--------|--------|--------|
| `users` | 본인 + Admin | 본인 | 본인 | - |
| `ojt_docs` | 로그인 사용자 | Mentor/Admin | 작성자 | 작성자/Admin |
| `learning_records` | 본인 + Admin | 본인 | 본인 | - |

---

## 5. 동기화 설계

### 5.1 동기화 전략

```
┌────────────────────────────────────────────────────────────┐
│                    Sync Strategy                            │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  1. READ (조회)                                             │
│     ┌─────────┐     ┌─────────┐     ┌─────────┐           │
│     │ Dexie   │ ──▶ │ 캐시    │ ──▶ │ 반환    │           │
│     │ 조회    │     │ HIT?    │     │         │           │
│     └─────────┘     └────┬────┘     └─────────┘           │
│                          │ MISS                            │
│                          ▼                                  │
│                    ┌─────────┐     ┌─────────┐            │
│                    │Supabase │ ──▶ │ Dexie   │            │
│                    │ 조회    │     │ 저장    │            │
│                    └─────────┘     └─────────┘            │
│                                                             │
│  2. WRITE (저장)                                            │
│     ┌─────────┐     ┌─────────┐     ┌─────────┐           │
│     │ Dexie   │ ──▶ │ 온라인? │ ──▶ │Supabase │           │
│     │ 저장    │     │         │     │ 동기화  │           │
│     └─────────┘     └────┬────┘     └─────────┘           │
│                          │ 오프라인                         │
│                          ▼                                  │
│                    ┌─────────┐                             │
│                    │ Queue   │ ← 나중에 동기화              │
│                    │ 저장    │                             │
│                    └─────────┘                             │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

### 5.2 코드 구현

```javascript
// =========================================
// Dexie + Supabase 동기화 레이어
// =========================================

const db = new Dexie('OJTMasterCache');
db.version(1).stores({
  users: 'id, name, role',
  ojt_docs: 'id, team, step, author_id, updated_at',
  learning_records: 'id, user_id, doc_id',
  sync_queue: '++id, table, action, data, created_at'
});

// 온라인 상태 확인
const isOnline = () => navigator.onLine;

// =========================================
// 읽기 함수 (캐시 우선)
// =========================================

const syncGet = async (table, id) => {
  // 1. 로컬 캐시 먼저 확인
  let cached = await db[table].get(id);

  // 2. 온라인이면 Supabase에서 최신 데이터 가져오기
  if (isOnline()) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (data) {
      // 캐시 업데이트
      await db[table].put(data);
      cached = data;
    }
  }

  return cached;
};

const syncGetAll = async (table, filters = {}) => {
  // 1. 로컬 캐시에서 먼저 반환 (빠른 UX)
  let query = db[table].toCollection();

  if (filters.team) {
    query = db[table].where('team').equals(filters.team);
  }

  let cached = await query.toArray();

  // 2. 온라인이면 백그라운드에서 동기화
  if (isOnline()) {
    syncFromSupabase(table, filters);
  }

  return cached;
};

// 백그라운드 동기화
const syncFromSupabase = async (table, filters = {}) => {
  let query = supabase.from(table).select('*');

  if (filters.team) {
    query = query.eq('team', filters.team);
  }

  const { data, error } = await query;

  if (data) {
    // 캐시 일괄 업데이트
    await db[table].bulkPut(data);
  }
};

// =========================================
// 쓰기 함수 (로컬 먼저, 동기화 후)
// =========================================

const syncPut = async (table, data) => {
  // 1. 로컬 캐시에 즉시 저장
  await db[table].put(data);

  // 2. 온라인이면 Supabase에 동기화
  if (isOnline()) {
    try {
      const { error } = await supabase
        .from(table)
        .upsert(data);

      if (error) throw error;
    } catch (e) {
      // 실패 시 큐에 저장
      await db.sync_queue.add({
        table,
        action: 'upsert',
        data,
        created_at: new Date().toISOString()
      });
    }
  } else {
    // 오프라인이면 큐에 저장
    await db.sync_queue.add({
      table,
      action: 'upsert',
      data,
      created_at: new Date().toISOString()
    });
  }

  return data;
};

const syncAdd = async (table, data) => {
  // ID 생성
  const newData = {
    ...data,
    id: data.id || crypto.randomUUID()
  };

  // 1. 로컬 캐시에 즉시 저장
  await db[table].add(newData);

  // 2. 온라인이면 Supabase에 동기화
  if (isOnline()) {
    try {
      const { error } = await supabase
        .from(table)
        .insert(newData);

      if (error) throw error;
    } catch (e) {
      await db.sync_queue.add({
        table,
        action: 'insert',
        data: newData,
        created_at: new Date().toISOString()
      });
    }
  } else {
    await db.sync_queue.add({
      table,
      action: 'insert',
      data: newData,
      created_at: new Date().toISOString()
    });
  }

  return newData;
};

const syncDelete = async (table, id) => {
  // 1. 로컬 캐시에서 삭제
  await db[table].delete(id);

  // 2. 온라인이면 Supabase에서 삭제
  if (isOnline()) {
    try {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (e) {
      await db.sync_queue.add({
        table,
        action: 'delete',
        data: { id },
        created_at: new Date().toISOString()
      });
    }
  } else {
    await db.sync_queue.add({
      table,
      action: 'delete',
      data: { id },
      created_at: new Date().toISOString()
    });
  }
};

// =========================================
// 오프라인 큐 처리 (온라인 복귀 시)
// =========================================

const processOfflineQueue = async () => {
  const queue = await db.sync_queue.toArray();

  for (const item of queue) {
    try {
      if (item.action === 'upsert') {
        await supabase.from(item.table).upsert(item.data);
      } else if (item.action === 'insert') {
        await supabase.from(item.table).insert(item.data);
      } else if (item.action === 'delete') {
        await supabase.from(item.table).delete().eq('id', item.data.id);
      }

      // 성공하면 큐에서 제거
      await db.sync_queue.delete(item.id);
    } catch (e) {
      console.error('Sync failed:', e);
      // 실패하면 다음에 재시도
    }
  }
};

// 온라인 상태 변경 감지
window.addEventListener('online', () => {
  console.log('Online - Processing queue...');
  processOfflineQueue();
});
```

### 5.3 충돌 해결 전략

```
┌────────────────────────────────────────────────────────────┐
│                 Conflict Resolution                         │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  전략: Last-Write-Wins (LWW)                                │
│                                                             │
│  1. updated_at 타임스탬프 비교                              │
│  2. 더 최신 데이터가 우선                                    │
│  3. 동일 시간이면 서버(Supabase) 우선                       │
│                                                             │
│  예외:                                                       │
│  - learning_records: 항상 클라이언트 우선 (학습 기록 보존)  │
│  - users: 항상 서버 우선 (프로필 일관성)                    │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

---

## 6. 인증 흐름

### 6.1 Google OAuth 흐름

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  사용자   │────▶│  Google  │────▶│ Supabase │────▶│   앱     │
│          │     │  OAuth   │     │   Auth   │     │          │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
     │                                                    │
     │  1. 로그인 클릭                                     │
     │ ────────────────────────────────────────────────▶  │
     │                                                    │
     │  2. Google 로그인 팝업                              │
     │ ◀────────────────────────────────────────────────  │
     │                                                    │
     │  3. 인증 완료, 토큰 발급                            │
     │ ────────────────────────────────────────────────▶  │
     │                                                    │
     │  4. 프로필 확인 → 역할 선택 또는 대시보드            │
     │ ◀────────────────────────────────────────────────  │
```

### 6.2 세션 관리

```javascript
// 앱 초기화 시 세션 확인
useEffect(() => {
  const initAuth = async () => {
    // 1. Supabase 세션 확인
    const { data: { session } } = await supabase.auth.getSession();

    if (session?.user) {
      // 2. 로컬 캐시에서 프로필 조회
      const profile = await syncGet('users', session.user.id);

      if (profile?.role) {
        // 역할 있으면 대시보드로
        setUser(profile);
        setViewState(profile.role === 'mentor' ? 'mentor_dashboard' : 'mentee_list');
      } else {
        // 역할 없으면 선택 화면으로
        setUser({
          id: session.user.id,
          name: session.user.user_metadata?.full_name,
          role: null
        });
        setViewState('role_select');
      }
    } else {
      setViewState('login');
    }
  };

  initAuth();

  // 인증 상태 변경 구독
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setViewState('login');
      }
    }
  );

  return () => subscription.unsubscribe();
}, []);
```

---

## 7. 배포 구성

### 7.1 환경 구성

| 환경 | URL | 용도 |
|------|-----|------|
| **Production** | https://ggp-ojt-v2.vercel.app | 실서비스 |
| **Development** | http://localhost:3000 | 로컬 개발 |

### 7.2 환경 변수

```javascript
// 하드코딩 (단일 파일 SPA)
// ⚠️ 보안 주의: 프로덕션에서는 Supabase Edge Function 프록시 권장
const SUPABASE_URL = "https://cbvansmxutnogntbyswi.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_...";

// Google Gemini API (HTTP Referer 제한 설정됨)
const GEMINI_API_KEY = "AIza...";  // Google AI Studio에서 발급
const GEMINI_MODEL = "gemini-2.0-flash-exp";
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models";
```

### 7.3 Vercel 배포

```bash
# 자동 배포 (main 브랜치 푸시 시)
git push origin main

# 배포 URL
https://ggp-ojt-v2.vercel.app
```

---

## 8. 제한사항 및 해결방안

### 8.1 현재 제한사항

| 제한사항 | 영향 | 해결방안 | 상태 |
|----------|------|----------|------|
| ~~Ollama 로컬 전용~~ | ~~웹에서 AI 기능 사용 불가~~ | Google Gemini API로 전환 | ✅ **해결됨** |
| 오프라인 큐 | 오프라인 시 데이터 손실 가능 | Dexie.js sync_queue 구현 | ✅ **해결됨** |
| 충돌 해결 단순화 | 동시 수정 시 데이터 덮어쓰기 | LWW 전략으로 대응 | ⚠️ 유지 |
| API 키 클라이언트 노출 | 보안 위험 | HTTP Referer 제한 + Edge Function 권장 | ⚠️ 부분 해결 |

### 8.2 Google Gemini API 사용

```
┌────────────────────────────────────────────────────────────┐
│                 Google Gemini API 구성                       │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Google AI Studio에서 API 키 발급                        │
│     https://aistudio.google.com/app/apikey                 │
│                                                             │
│  2. API 키 제한 설정 (권장)                                 │
│     - HTTP Referer 제한: ggp-ojt-v2.vercel.app/*           │
│                                                             │
│  3. 무료 티어 제한                                          │
│     - 분당 15 요청                                          │
│     - 일일 1,500 요청                                       │
│                                                             │
│  ✅ 장점: 로컬/웹 환경 모두에서 AI 기능 사용 가능           │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

---

## 9. 로드맵

### Phase 2.1 (단기) - ✅ 완료

| 우선순위 | 기능 | 상태 |
|:--------:|------|------|
| 1 | Dexie.js 캐시 레이어 구현 | ✅ 완료 (Issue #11) |
| 2 | 오프라인 큐 처리 | ✅ 완료 |
| 3 | 캐시 버전 관리 및 마이그레이션 | ✅ 완료 (Issue #16) |
| 4 | Google Gemini API 전환 | ✅ 완료 (Issue #15) |
| 5 | PDF 텍스트 추출 | ✅ 완료 |
| 6 | URL 콘텐츠 추출 | ✅ 완료 |

### Phase 2.2 (중기) - 진행 중

| 우선순위 | 기능 | 상태 |
|:--------:|------|------|
| 1 | 관리자 페이지 | Issue #9 (리서치 완료) |
| 2 | Email/Password 인증 | 계획 |
| 3 | 오답 노트 | 계획 |
| 4 | 알림 시스템 | 계획 |

### Phase 2.3 (장기)

| 우선순위 | 기능 | 상태 |
|:--------:|------|------|
| 1 | 학습 진도 대시보드 | 계획 |
| 2 | 통계 차트 (Chart.js) | 계획 |
| 3 | 데이터 내보내기/가져오기 | 계획 |

---

## 10. 파일 구조

```
ggp_ojt_v2/
├── index.html              # 전체 앱 (단일 파일 SPA)
├── supabase_schema.sql     # Supabase 스키마
├── package.json            # 프로젝트 메타데이터
├── playwright.config.js    # E2E 테스트 설정
├── docs/
│   └── prd.md              # 원본 PRD
├── tasks/
│   └── prds/
│       ├── 0002-mvp-optimized.md  # MVP 설계 (로컬)
│       └── 0003-web-deployment.md  # 웹 배포 설계 (이 문서)
└── tests/
    └── e2e/
        └── basic.spec.js   # E2E 테스트
```

---

## 11. 참고 자료

- [Supabase 공식 문서](https://supabase.com/docs)
- [Dexie.js 공식 문서](https://dexie.org/docs/)
- [rxdb-supabase](https://github.com/marceljuenemann/rxdb-supabase)
- [PowerSync + Supabase](https://www.powersync.com/blog/bringing-offline-first-to-supabase)
