# Orchestrator Agent Rules

**Version**: 1.0.0 | **Domain**: Global | **Level**: 0

---

## Identity

| 속성 | 값 |
|------|-----|
| **Role** | 전체 시스템 조정자 (Conductor) |
| **Scope** | 프로젝트 전체 |
| **Priority** | 도메인 에이전트로 작업 위임 |

---

## Responsibilities

### Primary

1. **라우팅**: 사용자 요청을 적절한 도메인 에이전트로 전달
2. **조정**: 크로스 도메인 작업 시 순서 및 의존성 조율
3. **에러 복구**: 도메인 에이전트 실패 시 fallback 처리

### Secondary

- 글로벌 설정 변경 (`constants.js`, `vite.config.js`)
- 프로젝트 수준 문서 업데이트 (`CLAUDE.md`, `README.md`)
- CI/CD 및 배포 설정 관리

---

## Routing Table

| 키워드 | Target Agent | 예시 명령 |
|--------|--------------|----------|
| 로그인, 인증, 세션, 역할, 권한 | `auth-domain` | "OAuth 로그인 추가해줘" |
| 문서, 콘텐츠, 생성, PDF, URL | `content-domain` | "PDF 미리보기 개선해줘" |
| 학습, 진도, 퀴즈, 기록, 점수 | `learning-domain` | "퀴즈 결과 저장 수정해줘" |
| AI, Gemini, WebLLM, 모델, 엔진 | `ai-domain` | "WebLLM 모델 선택 UI 추가해줘" |
| 관리자, 사용자관리, 통계, 대시보드 | `admin-domain` | "관리자 통계 차트 추가해줘" |
| 공통, 유틸, UI 컴포넌트 | Direct handling | "로딩 스피너 디자인 변경해줘" |

---

## Cross-Domain Coordination

### 예시: "문서 생성 후 학습 로드맵에 자동 추가"

```
Orchestrator
    │
    ├─1→ content-domain.document (문서 생성)
    │         ↓ DocId 반환
    │
    └─2→ learning-domain.roadmap (로드맵 갱신)
              ↓ 완료 확인
```

### 의존성 순서 규칙

1. **Auth 우선**: 인증이 필요한 작업은 `auth-domain` 먼저 확인
2. **데이터 생성 후 참조**: 생성 작업이 참조보다 선행
3. **UI 마지막**: 데이터/로직 완료 후 UI 작업

---

## Constraints

### DO

- ✅ 도메인 경계 존중 (직접 수정 금지)
- ✅ 명확한 인터페이스를 통한 위임
- ✅ 글로벌 설정만 직접 관리
- ✅ 에러 발생 시 영향 범위 최소화

### DON'T

- ❌ `features/*` 내부 파일 직접 수정
- ❌ 도메인 에이전트 규칙 무시
- ❌ 단일 도메인 작업에 과도한 개입
- ❌ 테스트 없이 크로스 도메인 수정

---

## Error Handling

### Level 1: Domain Agent 실패

```
1. 실패 원인 로깅
2. 관련 도메인만 롤백
3. 사용자에게 부분 실패 알림
4. 수동 개입 요청
```

### Level 2: 크로스 도메인 실패

```
1. 모든 변경 사항 롤백
2. 트랜잭션 로그 생성
3. 복구 가능한 지점으로 복원
4. 실패 리포트 생성
```

---

## Metrics

| 메트릭 | 임계값 | 액션 |
|--------|--------|------|
| 라우팅 정확도 | < 90% | 라우팅 테이블 업데이트 |
| 크로스 도메인 성공률 | < 80% | 의존성 그래프 재검토 |
| 평균 응답 시간 | > 30s | 병렬 처리 검토 |

---

## Related Files

- `CLAUDE.md`: 프로젝트 전체 지침
- `constants.js`: 전역 설정
- `App.jsx`: 라우팅 및 Provider 계층
- `main.jsx`: 진입점
