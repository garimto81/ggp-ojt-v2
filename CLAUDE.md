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
| **AI** | Ollama (로컬 전용, qwen3:8b) |
| **Styling** | Tailwind CSS (CDN) |
| **Editor** | Quill 2.0 (Rich Text) |
| **Hosting** | Vercel |

## Architecture

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

단일 `index.html` 파일에 모든 React 코드가 포함된 SPA 구조:

```
index.html
├── Supabase 초기화 (Auth + PostgreSQL)
├── Dexie.js 초기화 (로컬 캐시 + 오프라인 큐)
├── Ollama AI 콘텐츠 생성 함수
├── App 컴포넌트
│   ├── Google OAuth 인증
│   ├── 역할 기반 뷰 분기 (Mentor/Mentee)
│   ├── MentorDashboard (자료 생성 + Quill 에디터)
│   ├── MenteeList (팀별 로드맵 탐색)
│   └── MenteeStudy (학습 + 퀴즈)
└── 퀴즈 로직 (4문제 랜덤 추출, 3/4 통과)
```

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

RLS 정책: `supabase_schema.sql` 참조

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

```javascript
// Supabase
const SUPABASE_URL = "https://cbvansmxutnogntbyswi.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_...";

// Ollama (로컬 전용 - 웹 배포 시 사용 불가)
const OLLAMA_URL = "http://localhost:11434";
const OLLAMA_MODEL = "qwen3:8b";
```

## Commands

```bash
# 로컬 개발 서버
npx serve . -p 3000

# Ollama 서버 실행 (CORS 허용)
set OLLAMA_ORIGINS=* && ollama serve

# 모델 다운로드
ollama pull qwen3:8b

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

## AI Content Generation

프롬프트: 10년 경력 기업 교육 설계 전문가 역할
- 섹션 구조: 학습 목표 → 핵심 내용 → 실무 예시 → 주의사항
- 퀴즈: 기억형 40% / 이해형 35% / 적용형 25%
- 파라미터: temperature=0.3, num_predict=8192

**주의**: 웹 배포(HTTPS) 환경에서는 localhost Ollama 연결 불가 (혼합 콘텐츠 차단)

## Deployment

| 환경 | URL | AI 기능 |
|------|-----|---------|
| **Production** | https://ggp-ojt-v2.vercel.app | 사용 불가 |
| **Local** | http://localhost:3000 | Ollama 사용 가능 |

- **Branch**: main (Vercel 자동 배포)
- **Supabase Auth**: Google OAuth

## Project Structure

```
ggp_ojt_v2/
├── index.html              # 전체 앱 (단일 파일 SPA)
├── supabase_schema.sql     # Supabase 스키마 및 RLS 정책
├── package.json            # 프로젝트 메타데이터 (v2.0.0)
├── playwright.config.js    # E2E 테스트 설정
├── CLAUDE.md               # AI 개발 가이드 (이 파일)
├── docs/
│   ├── prd.md              # 원본 PRD
│   └── guide.md            # 배포 가이드
├── tasks/
│   └── prds/
│       ├── 0001-rbac-deployment.md
│       ├── 0002-mvp-optimized.md
│       └── 0003-web-deployment.md  # 웹 배포 설계
└── tests/
    └── e2e/
        └── basic.spec.js   # Playwright E2E 테스트
```

## GitHub Issues

| # | Status | Title |
|---|--------|-------|
| #11 | CLOSED | Feature: 웹 배포 시 DB 저장 로직 구현 |
| #10 | CLOSED | Bug: Google OAuth 리다이렉트 |
| #9 | OPEN | Feature: 관리자 페이지 및 인증 시스템 |
| #8 | CLOSED | Feature: 웹 배포 (Vercel) |
| #7 | OPEN | Research: 유사 솔루션 벤치마킹 |
