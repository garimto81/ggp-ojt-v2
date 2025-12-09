# OJT Master v3.0 - Master PRD

> **Version**: 3.0.0 | **Status**: Draft | **Last Updated**: 2025-12-09

## Executive Summary

OJT Master는 AI 기반 신입사원 온보딩 교육 자료 생성 및 학습 관리 시스템입니다.
현업 담당자가 비정형 데이터(메모, PDF, URL)만 입력하면 AI가 체계적인 교육 자료와 퀴즈를 자동 생성합니다.

### Key Metrics (Target)

| 지표 | 목표 |
|------|------|
| 자료 생성 시간 단축 | 기존 대비 80% ↓ |
| 학습 완료율 | 90% ↑ |
| 퀴즈 첫 시도 통과율 | 70% |
| NPS | 4.0/5.0 ↑ |

---

## Document Index

### Core Documents

| # | Document | Description | Tokens |
|---|----------|-------------|--------|
| 01 | [Overview](./01-overview.md) | 프로젝트 개요, 목표, 범위 | ~800 |
| 02 | [User Personas](./02-user-personas.md) | 사용자 페르소나 및 User Stories | ~600 |

### Feature Specifications

| # | Document | Description | Tokens |
|---|----------|-------------|--------|
| 03-01 | [AI Content Generation](./03-features/03-01-ai-content.md) | AI 콘텐츠 생성 엔진 | ~1200 |
| 03-02 | [Quiz System](./03-features/03-02-quiz-system.md) | 퀴즈 생성 및 평가 | ~800 |
| 03-03 | [Dashboard](./03-features/03-03-dashboard.md) | Admin/Mentor/Mentee 대시보드 | ~1000 |
| 03-04 | [Authentication](./03-features/03-04-auth.md) | 인증 및 권한 관리 | ~600 |

### Database Design (Focus Area)

| # | Document | Description | Tokens |
|---|----------|-------------|--------|
| 04-01 | [Schema Design](./04-database/04-01-schema.md) | ERD 및 테이블 정의 | ~1500 |
| 04-02 | [RLS Policies](./04-database/04-02-rls-policies.md) | Row Level Security 정책 | ~800 |
| 04-03 | [Migration Strategy](./04-database/04-03-migrations.md) | 마이그레이션 전략 | ~500 |

### Technical Specifications

| # | Document | Description | Tokens |
|---|----------|-------------|--------|
| 05 | [Tech Stack](./05-tech-stack.md) | 기술 스택 및 아키텍처 | ~800 |
| 06 | [API Specification](./06-api-spec.md) | Supabase API 명세 | ~1000 |
| 07 | [Roadmap](./07-roadmap.md) | 개발 로드맵 및 마일스톤 | ~400 |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend                              │
│  React 19 + Vite 7 │ Dexie.js (IndexedDB) │ Chart.js        │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      AI Layer                                │
│  Gemini API (Primary) │ WebLLM (Fallback, Browser-side)     │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Backend (BaaS)                          │
│  Supabase: PostgreSQL + Auth + RLS + Realtime               │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Storage                                 │
│  Cloudflare R2 (Images) │ Supabase Storage (optional)       │
└─────────────────────────────────────────────────────────────┘
```

---

## Quick Reference

### Roles & Permissions

| Role | View | Create Doc | Edit Doc | Delete Doc | View All Users |
|------|------|------------|----------|------------|----------------|
| Admin | All | ✅ | ✅ | ✅ | ✅ |
| Mentor | Own Team | ✅ | Own | Own | ❌ |
| Mentee | Assigned | ❌ | ❌ | ❌ | ❌ |

### Core Tables

| Table | Purpose |
|-------|---------|
| `users` | 사용자 프로필 및 역할 |
| `teams` | 팀/부서 마스터 |
| `ojt_docs` | OJT 교육 문서 |
| `doc_sections` | 문서 섹션 (정규화) |
| `quiz_pools` | 퀴즈 문제 은행 |
| `learning_records` | 학습 완료 기록 |
| `learning_progress` | 학습 진행 상태 |

---

## Change Log

| Version | Date | Changes |
|---------|------|---------|
| 3.0.0 | 2025-12-09 | 모듈형 PRD 구조 도입, DB 스키마 재설계 |
| 2.8.0 | 2025-12 | Gemini API 롤백, WebLLM fallback |
| 2.0.0 | 2025-11 | MVP 출시, Supabase 도입 |

---

## How to Use This PRD

1. **전체 구조 파악**: 이 마스터 문서에서 전체 구조 확인
2. **상세 내용 참조**: Document Index의 링크를 통해 상세 문서 참조
3. **AI 작업 시**: 필요한 섹션만 선택적으로 로드 (토큰 절약)
4. **업데이트**: 각 문서 독립적으로 업데이트, 마스터 문서에 변경 이력 기록
