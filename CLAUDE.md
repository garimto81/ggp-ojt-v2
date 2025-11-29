# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

OJT Master - AI 기반 신입사원 온보딩 교육 자료 생성 및 학습 관리 시스템 (v2.0.0)

## Tech Stack

| 영역 | 기술 |
|------|------|
| **Frontend** | React 18 (CDN, 단일 파일 SPA) |
| **Backend/DB** | Supabase (PostgreSQL + Auth) |
| **Local Cache** | Dexie.js (IndexedDB) |
| **AI** | Google Gemini API (gemini-2.0-flash-exp) |
| **Styling** | Tailwind CSS (CDN) |
| **Editor** | Quill 2.0 (Rich Text) |
| **PDF Parsing** | PDF.js 3.11.174 |
| **JSX Transform** | Babel Standalone (CDN) |
| **Hosting** | Vercel |

## Architecture

```text
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

단일 `index.html` 파일에 모든 React 코드가 포함된 SPA 구조:

```text
index.html
├── Supabase 초기화 (Auth + PostgreSQL)
├── Dexie.js 초기화 (로컬 캐시 + 오프라인 큐)
├── 콘텐츠 추출 함수
│   ├── extractPdfText() - PDF.js 텍스트 추출
│   └── extractUrlText() - CORS 프록시 웹페이지 추출
├── 자동 스텝 분할 로직
│   ├── estimateReadingTime() - 학습 시간 추정
│   ├── calculateRequiredSteps() - 필요 스텝 수 계산
│   └── splitContentForSteps() - 콘텐츠 분할
├── Gemini AI 콘텐츠 생성 함수
├── App 컴포넌트
│   ├── Google OAuth 인증
│   ├── 역할 기반 뷰 분기 (Mentor/Mentee)
│   ├── MentorDashboard (자료 생성 + Quill 에디터)
│   ├── MenteeList (팀별 로드맵 탐색)
│   └── MenteeStudy (학습 + 퀴즈)
└── 퀴즈 로직 (20문제 풀 → 4문제 랜덤 추출, 3/4 통과)
```

## Core Functions

### 콘텐츠 추출

| 함수 | 파라미터 | 반환값 | 설명 |
|------|----------|--------|------|
| `extractPdfText(file, setProgress)` | File, callback | string | PDF.js로 텍스트 추출 |
| `extractUrlText(url, setProgress)` | string, callback | string | CORS 프록시 경유 웹페이지 추출 |

### AI 생성

| 함수 | 파라미터 | 반환값 | 설명 |
|------|----------|--------|------|
| `generateOJTContent(rawText, team, step, setProgress, totalSteps)` | string, string, number, callback, number | Object | Gemini API로 OJT 콘텐츠 생성 |
| `checkAIStatus()` | - | {online, provider, model} | Gemini API 상태 확인 |

### 자동 분할

| 함수 | 파라미터 | 반환값 | 설명 |
|------|----------|--------|------|
| `estimateReadingTime(text)` | string | number | 예상 학습 시간 (분) |
| `calculateRequiredSteps(text)` | string | number | 필요 스텝 수 계산 |
| `splitContentForSteps(text, numSteps)` | string, number | string[] | 의미 단위 분할 |

### 캐시 관리

| 함수 | 설명 |
|------|------|
| `clearAllCache()` | Dexie 캐시 전체 초기화 |
| `checkCacheVersion()` | 캐시 버전 마이그레이션 |
| `processSyncQueue()` | 오프라인 큐 동기화 처리 |

## Constants

### 스텝 분할 설정

| 상수 | 값 | 설명 |
|------|-----|------|
| `STEP_TIME_LIMIT` | 40분 | 한 스텝당 최대 학습 시간 |
| `CHARS_PER_MINUTE` | 500자 | 분당 읽기 속도 (한국어) |
| `MAX_CHARS_PER_STEP` | 20,000자 | 스텝당 최대 글자 수 |

### 캐시 관리

| 상수 | 값 | 설명 |
|------|-----|------|
| `CACHE_VERSION` | 2 | Dexie 스키마 버전 |
| `MAX_SYNC_RETRIES` | 3 | 동기화 최대 재시도 |

### 퀴즈 설정

| 상수 | 값 | 설명 |
|------|-----|------|
| `QUIZ_PASS_THRESHOLD` | 3 | 통과 기준 (4문제 중) |

## Data Structure

### Supabase (PostgreSQL)

```sql
-- users: 사용자 프로필
users (id UUID PK, name, role, department, created_at, updated_at)

-- ojt_docs: OJT 문서
ojt_docs (id UUID PK, title, team, step, sections JSONB, quiz JSONB, author_id, author_name, estimated_minutes, created_at, updated_at)

-- learning_records: 학습 기록
learning_records (id UUID PK, user_id, doc_id, score, total_questions, passed, completed_at)
```

RLS 정책: `supabase_schema.sql`, `supabase_fix_rls.sql` 참조

### Dexie.js (로컬 캐시)

```javascript
localDb.version(1).stores({
  users: 'id, name, role',
  ojt_docs: 'id, team, step, author_id, updated_at',
  learning_records: 'id, user_id, doc_id',
  sync_queue: '++id, table, action, created_at'
});
```

## Key Configuration

> **보안 주의**: API 키는 환경 변수로 관리하세요. 아래는 구조 예시입니다.

```javascript
// Supabase
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;

// Google Gemini API
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = "gemini-2.0-flash-exp";
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models";
```

## Commands

```bash
# 로컬 개발 서버
npx serve . -p 3000

# E2E 테스트 실행
npm test
npm run test:headed    # 브라우저 보면서 실행
npm run test:report    # HTML 리포트 보기
```

## Role-Based Access

| 역할 | 권한 |
|------|------|
| **Mentor** | 비정형 텍스트 → AI 변환 → Supabase 저장, 자료 CRUD |
| **Mentee** | 팀별 로드맵 탐색 → 문서 학습 → 퀴즈 평가 (읽기 전용) |
| **Admin** | (향후) 사용자 관리, 통계 대시보드 |

## Sync Strategy (Online-First, Offline-Ready)

| 작업 | 흐름 |
|------|------|
| **READ** | Dexie 캐시 → (온라인) Supabase 동기화 |
| **WRITE** | Dexie 저장 → (온라인) Supabase / (오프라인) 큐잉 |
| **DELETE** | Dexie 삭제 → (온라인) Supabase / (오프라인) 큐잉 |

오프라인 큐는 `window.addEventListener('online')` 이벤트로 자동 처리

## Error Handling

### 에러 복구 전략

| 영역 | 전략 | 설명 |
|------|------|------|
| **Gemini API 응답** | Regex fallback | JSON 파싱 실패 시 정규식으로 필드 추출 |
| **퀴즈 부족** | 더미 생성 | 20개 미만 시 자동 채움 |
| **CORS 차단** | 다중 프록시 | allorigins.win, corsproxy.io 순차 시도 |
| **오프라인 동기화** | 재시도 + 폐기 | 3회 실패 시 큐에서 제거 |

### 사용자 피드백

- `alert()`: 로그인 오류, 저장 오류, 생성 오류
- `console.error()`: 상세 디버그 로그

## AI Content Generation

Google Gemini API를 사용한 클라우드 기반 AI 콘텐츠 생성:

프롬프트: 10년 경력 기업 교육 설계 전문가 역할
- 섹션 구조: 학습 목표 → 핵심 내용 → 실무 예시 → 주의사항
- 퀴즈: 기억형 40% / 이해형 35% / 적용형 25%
- 파라미터: temperature=0.3, maxOutputTokens=8192

**장점**: 클라우드 API로 로컬/웹 배포 환경 모두에서 AI 기능 사용 가능

## CORS Proxies

URL 콘텐츠 추출 시 사용하는 프록시 목록 (순차 시도):
1. `https://api.allorigins.win/raw?url=`
2. `https://corsproxy.io/?`

**제한사항**:
- 최대 추출 문자: 15,000자
- 일부 사이트는 차단될 수 있음

## Deployment

| 환경 | URL | AI 기능 |
|------|-----|---------|
| **Production** | https://ggp-ojt-v2.vercel.app | Gemini API 사용 가능 |
| **Local** | http://localhost:3000 | Gemini API 사용 가능 |

- **Branch**: main (Vercel 자동 배포)
- **Supabase Auth**: Google OAuth
- **AI**: Google Gemini API (무료 티어)

## Project Structure

```text
ggp_ojt_v2/
├── index.html              # 전체 앱 (단일 파일 SPA)
├── supabase_schema.sql     # Supabase 스키마 및 RLS 정책
├── supabase_fix_rls.sql    # RLS 수정 스크립트
├── package.json            # 프로젝트 메타데이터 (v2.0.0)
├── playwright.config.js    # E2E 테스트 설정
├── CLAUDE.md               # AI 개발 가이드 (이 파일)
├── docs/
│   ├── prd.md              # 원본 PRD (기획 참조용)
│   └── guide.md            # 배포 가이드 (구버전 - Firebase)
├── tasks/
│   └── prds/
│       ├── 0001-rbac-deployment.md
│       ├── 0002-mvp-optimized.md  # Ollama 버전 (레거시)
│       └── 0003-web-deployment.md # Supabase + Dexie.js 설계
└── tests/
    └── e2e-homepage.spec.js  # Playwright E2E 테스트
```

## GitHub Issues

| # | Status | Title |
|---|--------|-------|
| #16 | CLOSED | Bug: 캐시(IndexedDB) 정리 로직 부재 |
| #15 | CLOSED | Feature: Ollama → Google Gemini API 전환 |
| #13 | CLOSED | Bug: 로그인 후 역할 변경 불가 |
| #12 | CLOSED | Bug: Supabase RLS 재귀적 자기 참조 |
| #9 | OPEN | Feature: 관리자 페이지 및 인증 시스템 |
| #7 | CLOSED | Research: 유사 솔루션 벤치마킹 |
