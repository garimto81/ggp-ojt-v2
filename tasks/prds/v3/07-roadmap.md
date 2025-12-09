# 07. Development Roadmap

> **Parent**: [Master PRD](./00-master-prd.md) | **Version**: 3.0.0

## 7.1 Version History

| Version | Date | Highlights |
|---------|------|------------|
| v1.0.0 | 2025-10 | 초기 MVP (React CDN) |
| v2.0.0 | 2025-11 | Vite 마이그레이션, Supabase 도입 |
| v2.8.0 | 2025-12 | Gemini API + WebLLM |
| **v3.0.0** | 2025-12 | DB 스키마 재설계, 모듈형 PRD |

---

## 7.2 v3.0.0 Milestones

### Phase 1: DB Schema Redesign (1주)

| Task | Priority | Status |
|------|----------|--------|
| `doc_sections` 테이블 생성 | P0 | ⬜ |
| `quiz_pools` 테이블 생성 | P0 | ⬜ |
| `doc_feedback` 테이블 생성 | P1 | ⬜ |
| JSONB → 정규화 마이그레이션 | P0 | ⬜ |
| RLS 정책 업데이트 | P0 | ⬜ |

### Phase 2: Frontend Refactoring (2주)

| Task | Priority | Status |
|------|----------|--------|
| Feature-based 구조 전환 | P1 | ⬜ |
| React Query 도입 | P1 | ⬜ |
| 컴포넌트 분리 (Admin/Mentor/Mentee) | P1 | ⬜ |
| 에러 바운더리 강화 | P2 | ⬜ |

### Phase 3: Quiz System Enhancement (1주)

| Task | Priority | Status |
|------|----------|--------|
| 퀴즈 랜덤 출제 로직 | P1 | ⬜ |
| 오답 노트 기능 | P2 | ⬜ |
| 퀴즈 통계 대시보드 | P2 | ⬜ |

### Phase 4: Testing & Documentation (1주)

| Task | Priority | Status |
|------|----------|--------|
| 단위 테스트 작성 | P1 | ⬜ |
| E2E 테스트 업데이트 | P1 | ⬜ |
| API 문서화 | P2 | ⬜ |
| CLAUDE.md 업데이트 | P1 | ⬜ |

---

## 7.3 Future Roadmap

### v3.1.0 (2025 Q1)

| Feature | Description |
|---------|-------------|
| 적응형 퀴즈 | 사용자 수준에 따른 난이도 조절 |
| 오답 노트 | 틀린 문제 모아보기 |
| 힌트 시스템 | 퀴즈 힌트 기능 |
| 시간 제한 | 문항별 타이머 |

### v3.2.0 (2025 Q2)

| Feature | Description |
|---------|-------------|
| 음성 입력 | STT (Speech-to-Text) 지원 |
| 이미지 OCR | 이미지 텍스트 추출 |
| 문서 버전 관리 | doc_versions 테이블 |
| 협업 편집 | Supabase Realtime 활용 |

### v4.0.0 (2025 Q3)

| Feature | Description |
|---------|-------------|
| RAG 검색 | pgvector 기반 시맨틱 검색 |
| 챗봇 튜터 | AI 질의응답 |
| 맞춤형 학습 경로 | 개인화 커리큘럼 |

---

## 7.4 Technical Debt

| Item | Severity | Plan |
|------|----------|------|
| 테스트 커버리지 낮음 (~10%) | HIGH | v3.0 Phase 4 |
| api.js 단일 파일 | MEDIUM | Feature-based 분리 |
| 타입 안전성 없음 (JS) | LOW | TypeScript 전환 검토 |
| 번들 크기 (6MB WebLLM) | LOW | 코드 스플리팅 |

---

## 7.5 Success Metrics

### v3.0.0 Goals

| Metric | Target | Measure |
|--------|--------|---------|
| DB 마이그레이션 완료 | 100% | 데이터 정합성 검증 |
| 기존 기능 유지 | 100% | E2E 테스트 통과 |
| 테스트 커버리지 | 30%+ | Vitest coverage |
| 빌드 시간 | <3s | Vite build |
| Lighthouse 점수 | 80+ | Performance audit |

---

## 7.6 Risk Management

| Risk | Impact | Mitigation |
|------|--------|------------|
| 마이그레이션 데이터 손실 | HIGH | 백업 + 롤백 계획 |
| RLS 정책 오류 | HIGH | 테스트 환경에서 검증 |
| Gemini API 할당량 초과 | MEDIUM | WebLLM fallback |
| WebGPU 미지원 브라우저 | LOW | 안내 메시지 표시 |

---

## Related Documents

- [Master PRD](./00-master-prd.md)
- [Overview](./01-overview.md)
- [Migration Strategy](./04-database/04-03-migrations.md)
