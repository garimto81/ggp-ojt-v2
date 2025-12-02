# 자동 워크플로우 규칙

슬래시 커맨드 없이 자동으로 트리거되는 워크플로우입니다.

---

## ⚠️ 보호된 파일 (서브 에이전트 수정 금지)

다음 파일들은 **메인 대화에서만 수정** 가능합니다. 서브 에이전트는 **절대 수정 금지**:

| 파일 | 이유 |
|------|------|
| `CLAUDE.md` | 프로젝트 핵심 설정, 충돌 시 치명적 |
| `.claude/**` | Claude 설정 파일들 |
| `pyproject.toml` | 프로젝트 설정 |
| `.env*` | 환경 변수 |

**서브 에이전트 프롬프트에 항상 포함**:
```
## 보호된 파일 (수정 금지)
다음 파일은 절대 수정하지 마세요:
- CLAUDE.md
- .claude/**
- pyproject.toml
- .env*

이 파일들의 수정이 필요하면 작업 완료 후 보고만 하세요.
```

---

## 1. 병렬 에이전트 자동 트리거

### 트리거 키워드
- "병렬로", "동시에", "에이전트들로", "parallel"
- "프론트/백엔드/인프라 같이"
- "여러 에이전트"

### 자동 실행 워크플로우

```
사용자: "프론트엔드, 백엔드, 인프라 에이전트들로 병렬로 작업해줘"
    ↓
[자동 감지] 병렬 작업 요청
    ↓
[Step 1] 각 에이전트별 Git 브랜치 생성
  - feature/frontend-{issue}
  - feature/backend-{issue}
  - feature/infra-{issue}
    ↓
[Step 2] 에이전트들 병렬 실행 (각자 브랜치에서)
    ↓
[Step 3] 완료 후 자동 리뷰 + PR 생성
```

---

## 2. 코드 완료 후 자동 리뷰

### 트리거 조건
에이전트가 다음 키워드로 완료 보고 시:
- "구현 완료", "작업 완료", "코드 작성 완료"
- "Implementation complete", "Done"

### 자동 실행

```
[에이전트] "Issue #20 프론트엔드 구현 완료"
    ↓
[자동 실행] code-reviewer 에이전트
  - 코드 품질 검사
  - 보안 취약점 검사
  - 아키텍처 일관성 검사
    ↓
[리뷰 결과]
  - 통과 → PR 생성 제안
  - 실패 → 수정 사항 목록 제공
```

---

## 2.5 프론트엔드 Playwright E2E 테스트 (필수)

### 트리거 조건
프론트엔드 코드 완료 시 **자동 실행**:
- `frontend/**` 파일 수정 완료
- "프론트엔드 구현 완료", "UI 완료"

### 테스트 워크플로우

```
[프론트엔드 구현 완료]
    │
    ▼
[2.5단계: playwright-engineer 에이전트]
Playwright E2E 테스트 자동 실행
    │
    ├─→ [실패] 테스트 결과 + 스크린샷 제공
    │      ↓
    │   frontend-developer가 수정
    │      ↓
    │   재테스트 (반복)
    │
    └─→ [통과] → 3단계(code-reviewer)로 진행
```

### Playwright 테스트 범위

| 카테고리 | 테스트 항목 | 필수 여부 |
|----------|------------|----------|
| **스모크** | 페이지 로딩, 기본 네비게이션 | ✅ 필수 |
| **기능** | 사용자 플로우 (로그인, CRUD) | ✅ 필수 |
| **반응형** | 모바일/태블릿/데스크탑 뷰포트 | ✅ 필수 |
| **접근성** | a11y 검사 (axe-core) | ⚠️ 권장 |
| **성능** | Lighthouse CI 점수 | ⚠️ 권장 |

### playwright-engineer 에이전트 프롬프트

```
## Playwright E2E 테스트 실행

### 작업 내용
1. 테스트 환경 확인 (Node.js, Playwright 설치)
2. 개발 서버 시작 (localhost:3000 또는 지정 포트)
3. Playwright 테스트 실행
4. 실패 시 스크린샷 + 트레이스 수집
5. 결과 보고

### 테스트 실행 명령어
```bash
# 전체 테스트
npx playwright test

# 특정 파일 테스트
npx playwright test tests/e2e/feature.spec.ts

# UI 모드 (디버깅)
npx playwright test --ui

# 리포트 생성
npx playwright show-report
```

### 필수 통과 기준
- [ ] 스모크 테스트 100% 통과
- [ ] 기능 테스트 100% 통과
- [ ] 반응형 테스트 (3개 뷰포트) 통과
- [ ] 콘솔 에러 0개

### 실패 시 제공 정보
- 실패한 테스트 이름 및 위치
- 스크린샷 (test-results/*.png)
- 트레이스 파일 (trace.zip)
- 에러 메시지 및 스택 트레이스

### 보호된 파일 (수정 금지)
- CLAUDE.md, .claude/**, pyproject.toml, .env*
```

### 테스트 게이트 규칙

**PR 생성 전 필수 통과:**

```
[프론트엔드 변경 감지]
    │
    ▼
[Playwright 테스트 실행]
    │
    ├─→ ❌ 실패 → PR 생성 차단
    │            ↓
    │         수정 요청 + 재테스트
    │
    └─→ ✅ 통과 → code-reviewer로 진행
```

### 테스트 실패 시 자동 재작업 루프

```
[2.5단계: playwright-engineer]
E2E 테스트 실행
    │
    ├─→ ✅ 통과
    │      ↓
    │   [3단계: code-reviewer]로 진행
    │
    └─→ ❌ 실패 (재시도 횟수 < 3)
           │
           ▼
       [실패 분석 리포트 생성]
         - 실패 테스트 목록
         - 스크린샷 (test-results/*.png)
         - 에러 스택 트레이스
         - 권장 수정 사항
           │
           ▼
       [frontend-developer 에이전트 자동 호출]
         - 실패 리포트 전달
         - 수정 지시
         - 동일 브랜치에서 수정
           │
           ▼
       [수정 완료 후]
         - 자동 커밋
         - 2.5단계로 돌아가서 재테스트
           │
           ▼
       [재시도 횟수 >= 3]
         - 사용자에게 에스컬레이션
         - 수동 개입 요청
```

**재작업 에이전트 프롬프트:**

```
## 프론트엔드 테스트 실패 수정 요청

### 실패한 테스트
{실패_테스트_목록}

### 에러 내용
{에러_스택_트레이스}

### 스크린샷
{test-results/*.png 경로}

### 수정 지시
1. 위 에러를 분석하고 원인을 파악하세요
2. 해당 컴포넌트/페이지를 수정하세요
3. 로컬에서 해당 테스트만 실행해서 확인:
   npx playwright test {실패_테스트_파일} --headed
4. 수정 완료 후 커밋하세요

### 브랜치
현재 브랜치: {브랜치명}
(새 브랜치 생성 금지, 현재 브랜치에서 수정)

### 재시도 현황
현재: {N}/3 회차

### 보호된 파일 (수정 금지)
- CLAUDE.md, .claude/**, pyproject.toml, .env*
```

---

## 2.6 코드 검증 및 재작업 워크플로우

### 검증 단계별 실패 처리

| 단계 | 검증 내용 | 실패 시 처리 |
|------|----------|-------------|
| **2.5** | Playwright E2E | frontend-developer 자동 재호출 |
| **3** | code-reviewer | 원본 에이전트 재호출 + 수정 지시 |
| **3** | security-auditor | security-auditor 자동 수정 또는 원본 에이전트 재호출 |
| **4** | PR 생성 | github-engineer 재시도 |

### 완전 독립 병렬 파이프라인 (권장)

**핵심: 3개 영역이 완전히 독립적으로 병렬 진행. 각각 자체 검증→리뷰→수정 루프 수행.**

```
[구현 에이전트 완료]
    │
    ▼
┌──────────────────────────────────────────────────────────────────┐
│                    3개 독립 파이프라인 병렬 실행                    │
├─────────────────────┬─────────────────────┬─────────────────────┤
│                     │                     │                     │
│  [프론트엔드 파이프]  │   [백엔드 파이프]    │   [인프라 파이프]    │
│                     │                     │                     │
│  playwright-engineer│   test-automator    │  deployment-engineer│
│         │           │         │           │         │           │
│         ▼           │         ▼           │         ▼           │
│      ✅/❌          │      ✅/❌          │      ✅/❌          │
│         │           │         │           │         │           │
│    [❌ 실패 시]      │    [❌ 실패 시]      │    [❌ 실패 시]      │
│    이슈 생성        │    이슈 생성        │    이슈 생성        │
│    debugger 분석    │    debugger 분석    │    security-auditor │
│    frontend-dev 수정│    backend-arch 수정│    deploy-eng 수정  │
│    → 재검증 (반복)   │    → 재검증 (반복)   │    → 재검증 (반복)   │
│         │           │         │           │         │           │
│    [✅ 통과 시]      │    [✅ 통과 시]      │    [✅ 통과 시]      │
│         ▼           │         ▼           │         ▼           │
│   code-reviewer     │   code-reviewer     │   code-reviewer     │
│         │           │         │           │         │           │
│      ✅/❌          │      ✅/❌          │      ✅/❌          │
│         │           │         │           │         │           │
│    [❌ 실패 시]      │    [❌ 실패 시]      │    [❌ 실패 시]      │
│    frontend-dev 수정│    backend-arch 수정│    deploy-eng 수정  │
│    → 재검증 (반복)   │    → 재검증 (반복)   │    → 재검증 (반복)   │
│         │           │         │           │         │           │
│    [✅ 통과 시]      │    [✅ 통과 시]      │    [✅ 통과 시]      │
│         ▼           │         ▼           │         ▼           │
│   github-engineer   │   github-engineer   │   github-engineer   │
│   (PR 생성)         │   (PR 생성)         │   (PR 생성)         │
│         │           │         │           │         │           │
└─────────┴───────────┴─────────┴───────────┴─────────┴───────────┘
          │                     │                     │
          ▼                     ▼                     ▼
     PR #frontend          PR #backend           PR #infra
          │                     │                     │
          └─────────────────────┴─────────────────────┘
                                │
                                ▼
                    [3개 PR 모두 생성 완료]
                                │
                                ▼
                    [5단계: github-engineer]
                      순차 머지 또는 통합 PR
```

### 각 파이프라인 상세 흐름

```
[단일 파이프라인 흐름] (프론트/백엔드/인프라 각각 동일)

┌─────────────────────────────────────────────────────┐
│ Step 1: 테스트/검증                                  │
├─────────────────────────────────────────────────────┤
│ 프론트: playwright-engineer (E2E 테스트)             │
│ 백엔드: test-automator (단위/통합 테스트)            │
│ 인프라: deployment-engineer (드라이런 검증)          │
└───────────────────────┬─────────────────────────────┘
                        │
            ┌───────────┴───────────┐
            │                       │
            ▼                       ▼
         ✅ 통과                  ❌ 실패
            │                       │
            │                       ▼
            │               [이슈 생성/업데이트]
            │               github-engineer
            │                       │
            │                       ▼
            │               [원인 분석]
            │               debugger / security-auditor
            │                       │
            │                       ▼
            │               [코드 수정]
            │               해당 영역 에이전트
            │                       │
            │                       ▼
            │               [재검증] ─────┐
            │                       │     │
            │               ✅/❌ ←──────┘
            │                       │     (최대 3회)
            │                       │
            └───────────┬───────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│ Step 2: 코드 리뷰                                    │
├─────────────────────────────────────────────────────┤
│ code-reviewer (해당 영역 전용)                       │
│ - Critical 0건, High 0건 필수                        │
└───────────────────────┬─────────────────────────────┘
                        │
            ┌───────────┴───────────┐
            │                       │
            ▼                       ▼
         ✅ 통과                  ❌ 실패
            │                       │
            │                       ▼
            │               [이슈 업데이트]
            │               github-engineer
            │                       │
            │                       ▼
            │               [코드 수정]
            │               해당 영역 에이전트
            │                       │
            │                       ▼
            │               [재리뷰] ─────┐
            │                       │     │
            │               ✅/❌ ←──────┘
            │                       │     (최대 2회)
            │                       │
            └───────────┬───────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│ Step 3: PR 생성                                      │
├─────────────────────────────────────────────────────┤
│ github-engineer                                      │
│ - 이슈 Close                                         │
│ - PR 생성 (해당 브랜치 → main)                       │
└─────────────────────────────────────────────────────┘
```

### 병렬 실행 규칙

```
## 완전 독립 병렬 실행

[각 파이프라인은 완전히 독립적]
- 프론트엔드: feature/frontend-mvp 브랜치
- 백엔드: feature/backend-mvp 브랜치
- 인프라: feature/infra-mvp 브랜치

[동시 실행 가능]
✅ 3개 파이프라인 전체 (검증 + 리뷰 + 수정 + PR)
✅ 각 파이프라인 내 단계별 진행
✅ 서로 다른 브랜치이므로 충돌 없음

[동시 실행 불가능]
❌ 동일 브랜치 내 여러 수정 에이전트
❌ 머지 단계 (순차 진행 필요)

[각 파이프라인 종료 조건]
- 검증 통과 + 코드 리뷰 통과 + PR 생성 완료
- 또는 최대 재시도 초과 시 에스컬레이션
```

### 파이프라인별 에이전트 체인

| 단계 | 프론트엔드 | 백엔드 | 인프라 |
|------|-----------|--------|--------|
| **검증** | playwright-engineer | test-automator | deployment-engineer |
| **분석** | debugger | debugger | security-auditor |
| **수정** | frontend-developer | backend-architect | deployment-engineer |
| **리뷰** | code-reviewer | code-reviewer | code-reviewer |
| **이슈** | github-engineer | github-engineer | github-engineer |
| **PR** | github-engineer | github-engineer | github-engineer |

### 전체 완료 조건

```
[워크플로우 종료 조건]

3개 파이프라인 모두:
✅ 검증 통과 (Critical 0, High 0)
✅ 코드 리뷰 통과 (Critical 0, High 0)
✅ PR 생성 완료

→ [5단계: github-engineer]
   - 3개 PR 순차 머지
   - 또는 통합 PR 생성
   - 문서 업데이트 요청 보고
   - 워크플로우 종료
```

[code-reviewer]
    │
    ├─→ ✅ 통과 → security-auditor (해당 시)
    └─→ ❌ 실패
           ↓
       [원본 구현 에이전트 재호출]
         - 리뷰 피드백 전달
         - 수정 요청
         - 동일 브랜치에서 작업
           ↓
       [수정 후 재검증]

[security-auditor] (인증/보안 코드인 경우)
    │
    ├─→ ✅ 통과 → PR 생성
    └─→ ❌ 취약점 발견
           ↓
       [심각도 분류]
         │
         ├─→ 🔴 Critical → 사용자 에스컬레이션
         │                  (자동 수정 금지)
         │
         └─→ 🟡 Medium/Low
                ↓
            [security-auditor 자동 수정]
              또는
            [원본 에이전트 + 보안 가이드라인 재호출]
                ↓
            [재검증]
```

### 재시도 정책

| 검증 유형 | 최대 재시도 | 실패 시 행동 |
|----------|-----------|-------------|
| E2E 테스트 | 3회 | 사용자 에스컬레이션 |
| 코드 리뷰 | 2회 | 사용자 에스컬레이션 |
| 보안 감사 | 1회 (Critical) | 즉시 에스컬레이션 |
| 보안 감사 | 2회 (Medium) | 에스컬레이션 |

### 코드 리뷰 통과 기준 (엄격 모드)

**조건부 통과는 허용하지 않음. 전체 통과만 PR 진행 가능.**

```
[코드 리뷰 결과]
    │
    ├─→ ✅ 전체 통과 (Critical 0, High 0)
    │      ↓
    │   PR 생성 진행
    │
    └─→ ❌ 조건부 통과 / 실패 (Critical > 0 또는 High > 0)
           ↓
       [원본 에이전트 자동 재호출]
         - 리뷰 피드백 전달
         - Critical/High 이슈 수정 지시
         - 동일 브랜치에서 수정
           ↓
       [수정 후 재리뷰]
```

**통과 기준:**
| 심각도 | PR 진행 조건 |
|--------|-------------|
| Critical | 0건 필수 |
| High | 0건 필수 |
| Medium | 허용 (권장 수정) |
| Low | 허용 (선택 수정) |

---

## 2.7 완전 자동화 이슈 해결 루프

### 핵심 원칙
**문제 발견 → 이슈 생성/업데이트 → 해결책 설계 → 코드 수정 → 재검증 → 전체 통과까지 반복**

### 자동화 루프 흐름

```
[코드 리뷰 실패]
    │
    ▼
[1단계: github-engineer] 이슈 처리
  - 기존 이슈 있으면 → 코멘트 추가
  - 새 이슈면 → 신규 이슈 생성
  - 라벨: bug, security, critical 등
    │
    ▼
[2단계: debugger / security-auditor] 원인 분석
  - 문제 원인 파악
  - 해결책 설계
  - 수정 계획 수립
    │
    ▼
[3단계: 원본 구현 에이전트] 코드 수정
  - frontend-developer / backend-architect / deployment-engineer
  - 동일 브랜치에서 수정
  - 수정 커밋
    │
    ▼
[4단계: 검증 에이전트] 재검증
  - playwright-engineer (프론트엔드)
  - test-automator (백엔드)
  - code-reviewer (전체)
    │
    ├─→ ❌ 실패 → 1단계로 돌아감 (최대 3회)
    │
    └─→ ✅ 전체 통과 (Critical 0, High 0)
           ↓
       [5단계: github-engineer]
         - 이슈 Close
         - PR 생성
         - 워크플로우 종료
```

### 필요 에이전트 체인

| 순서 | 에이전트 | 역할 | 자동 트리거 |
|------|---------|------|------------|
| 1 | `github-engineer` | 이슈 생성/업데이트/Close | 리뷰 실패 시 |
| 2 | `debugger` | 버그 원인 분석 + 해결책 설계 | 이슈 생성 후 |
| 2-alt | `security-auditor` | 보안 이슈 분석 + 수정 가이드 | 보안 이슈일 때 |
| 3 | `frontend-developer` | 프론트엔드 코드 수정 | 프론트엔드 이슈 |
| 3-alt | `backend-architect` | 백엔드 코드 수정 | 백엔드 이슈 |
| 3-alt | `deployment-engineer` | 인프라 코드 수정 | 인프라 이슈 |
| 4 | `playwright-engineer` | E2E 재검증 | 프론트엔드 수정 후 |
| 4-alt | `test-automator` | 단위/통합 테스트 | 백엔드 수정 후 |
| 5 | `code-reviewer` | 최종 코드 리뷰 | 테스트 통과 후 |
| 6 | `github-engineer` | PR 생성 + 이슈 Close | 전체 통과 시 |

### 이슈 자동 생성 템플릿

```markdown
## [CODE-REVIEW] {영역} - {심각도} 이슈 발견

### 발견 위치
- **브랜치**: {브랜치명}
- **파일**: {파일경로}:{라인번호}
- **심각도**: {Critical/High/Medium/Low}

### 문제 설명
{이슈 상세 설명}

### 현재 코드
\`\`\`{언어}
{문제 코드}
\`\`\`

### 권장 수정
\`\`\`{언어}
{수정 코드}
\`\`\`

### 관련 정보
- 코드 리뷰 결과: {리뷰 요약}
- 자동 생성: github-engineer 에이전트
- 라벨: code-review, {심각도}, {영역}
```

### 자동 이슈 Close 조건

```
[재검증 통과]
    │
    ▼
[github-engineer]
  1. 관련 이슈 검색 (라벨: code-review)
  2. 이슈 코멘트 추가:
     "✅ 수정 완료 - 커밋 {hash}에서 해결됨"
  3. 이슈 Close
  4. PR 생성
```

---

## 2.8 완전 자동화를 위한 에이전트 설계

### 현재 부족한 에이전트 기능

| 기능 | 현재 상태 | 필요 조치 |
|------|----------|----------|
| 이슈 자동 생성 | `github-engineer`로 가능 | 템플릿 표준화 필요 |
| 원인 분석 | `debugger` 있음 | 리뷰 결과 파싱 로직 필요 |
| 자동 수정 지시 | 수동 프롬프트 | 자동 프롬프트 생성 필요 |
| 재검증 트리거 | 수동 호출 | 자동 체인 필요 |
| 이슈 Close | `github-engineer`로 가능 | 조건부 트리거 필요 |

### 신규 필요: 오케스트레이터 에이전트

**`workflow-orchestrator`** (새로 설계 필요)

```
역할: 전체 워크플로우 상태 관리 + 에이전트 자동 호출

기능:
1. 워크플로우 상태 추적 (어느 단계인지)
2. 리뷰 결과 파싱 → 이슈 목록 추출
3. 적절한 에이전트 자동 호출
4. 재시도 횟수 관리
5. 전체 통과 시 워크플로우 종료

프롬프트 예시:
"
## 워크플로우 오케스트레이션

### 현재 상태
- 단계: 코드 리뷰 실패
- 재시도: 1/3
- 실패 이슈: 3건 (Critical 2, High 1)

### 이슈 목록
1. [Critical] useSearch.ts - useEffect 의존성 누락
2. [Critical] VideoPlayer.tsx - any 타입 사용
3. [High] auth.py - 시크릿 키 하드코딩

### 다음 액션
1. github-engineer로 이슈 3건 생성
2. debugger로 원인 분석
3. frontend-developer/backend-architect로 수정
4. code-reviewer로 재검증
"
```

### 자동 에이전트 체인 구현 방안

**방법 1: context-manager 활용**
```
[context-manager]
  - 워크플로우 상태 저장
  - 이슈 목록 관리
  - 에이전트 호출 순서 결정
```

**방법 2: task-decomposition-expert 활용**
```
[task-decomposition-expert]
  - 리뷰 결과 → 작업 분해
  - 에이전트 할당
  - 의존성 관리
```

**방법 3: seq-engineer 활용 (권장)**
```
[seq-engineer]
  - 순차적 사고로 단계별 처리
  - 조건부 분기 지원
  - 상태 추적 내장
```

---

### 에스컬레이션 메시지

```
## ⚠️ 자동 재작업 한도 초과

### 상황
- 검증 단계: {단계명}
- 재시도 횟수: {N}/{최대}
- 마지막 실패 원인: {에러_요약}

### 실패 이력
1. 1차 시도: {에러1}
2. 2차 시도: {에러2}
3. 3차 시도: {에러3}

### 권장 조치
1. 실패 로그 확인: {로그_경로}
2. 수동으로 테스트 실행: {테스트_명령어}
3. 근본 원인 분석 필요

### 선택지
- [ ] 수동으로 수정 후 계속
- [ ] 해당 기능 건너뛰기
- [ ] 전체 작업 중단
```

---

## 3. PR 자동 생성 조건

다음 조건 **모두** 충족 시 자동으로 PR 생성 제안:

| 조건 | 설명 |
|------|------|
| ✅ 브랜치 존재 | feature/* 브랜치에 커밋 있음 |
| ✅ 코드 리뷰 통과 | code-reviewer 에이전트 승인 |
| ✅ 충돌 없음 | main 브랜치와 머지 충돌 없음 |
| ✅ 테스트 통과 | **프론트엔드: Playwright E2E 필수** |
| ✅ E2E 통과 | **프론트엔드 변경 시 필수** |

---

## 4. 에이전트 자동 체인

복잡한 작업 요청 시 에이전트들이 자동으로 연계됩니다.

### 체인 흐름

```
[사용자 요청]
"Issue #20, #21, #22 구현해줘"
    │
    ▼
[1단계: task-decomposition-expert]
작업 분해 및 에이전트 할당
  - Issue #20 → frontend-developer
  - Issue #21 → frontend-developer
  - Issue #22 → frontend-developer
    │
    ▼
[2단계: 구현 에이전트들]
각자 브랜치에서 병렬 작업
    │
    ▼
[2.5단계: playwright-engineer] ⭐ NEW
프론트엔드 변경 시 E2E 테스트 (필수 게이트)
  - 스모크 테스트
  - 기능 테스트
  - 반응형 테스트
  ❌ 실패 시 → 2단계로 돌아가서 수정
    │
    ▼
[3단계: code-reviewer]
자동 코드 리뷰
    │
    ▼
[4단계: github-engineer]
PR 생성
    │
    ▼
[5단계: github-engineer 에이전트]
PR 리뷰 + 머지 + 문서 업데이트 요청 보고
```

---

## 5. 관련 에이전트

| 단계 | 에이전트 | 자동 실행 조건 |
|------|---------|---------------|
| 분해 | `task-decomposition-expert` | 복잡한 멀티 이슈 요청 |
| 계획 | `context-manager` | 장기 작업, 컨텍스트 유지 필요 |
| 구현 | `frontend-developer`, `backend-architect`, `deployment-engineer` | 이슈 타입에 따라 |
| **E2E 테스트** | **`playwright-engineer`** | **프론트엔드 구현 완료 시 (필수)** |
| 리뷰 | `code-reviewer` | 코드 작성 완료 시 |
| 보안 | `security-auditor` | 인증/권한/입력 처리 코드 |
| PR 생성 | `github-engineer` | 리뷰 통과 시 |
| **5단계 통합** | **`github-engineer`** | **PR 생성 완료 후 자동** |

### 5단계 상세: `github-engineer` 에이전트 (PR 머지 모드)

PR 생성 후 동일한 `github-engineer` 에이전트가 머지까지 처리합니다.

**자동 실행 프롬프트:**
```
## 5단계: PR 머지 및 문서 업데이트

### 작업 내용
1. PR 상태 확인 (gh pr list)
2. 충돌 여부 확인
3. 머지 실행 (사용자 승인 요청)
4. 브랜치 정리

### 문서 업데이트 요청 (보고만)
다음 파일들의 업데이트가 필요합니다 (메인에서 처리):
- CLAUDE.md: [변경 내용]
- PRD 문서: [완료된 이슈]

### 보호된 파일 (수정 금지)
- CLAUDE.md, .claude/**, pyproject.toml, .env*
```

**처리 흐름:**
1. PR 상태 확인
2. 충돌 없으면 → 머지 승인 요청
3. 머지 완료 후 → 문서 업데이트 **요청만** 보고
4. 메인 대화에서 CLAUDE.md 등 보호된 파일 업데이트

---

## 6. 자동화 예시

### 예시 1: 단순 병렬 작업

```
사용자: "프론트엔드와 백엔드 에이전트로 동시에 작업해줘"

[자동 실행]
1. git checkout -b feature/frontend-work
2. git checkout -b feature/backend-work
3. 두 에이전트 병렬 실행
4. 완료 후 각각 PR 생성
```

### 예시 2: 복잡한 기능 구현

```
사용자: "사용자 인증 시스템 구현해줘"

[자동 체인]
1. task-decomposition-expert: 작업 분해
   - DB 스키마 → database-architect
   - API 엔드포인트 → backend-architect
   - 로그인 UI → frontend-developer
   - 보안 검토 → security-auditor

2. 순차/병렬 실행 계획 수립
   - Phase 1: DB 스키마 (의존성 없음)
   - Phase 2: API + UI (DB 완료 후, 병렬)
   - Phase 3: 보안 검토 (전체 완료 후)

3. 각 Phase 완료 시 자동 리뷰 + PR
```

### 예시 3: 리뷰 후 자동 수정

```
[code-reviewer 결과]
- ❌ SQL Injection 취약점 발견 (line 45)
- ❌ 하드코딩된 비밀번호 (line 72)
- ⚠️ 미사용 import (line 3)

[자동 액션]
1. 보안 취약점 → security-auditor에게 수정 요청
2. 수정 완료 후 재리뷰
3. 통과 시 PR 생성
```

---

## 7. 사용자 개입 필요 시점

자동 워크플로우가 **멈추고 사용자 승인을 요청**하는 경우:

| 상황 | 이유 |
|------|------|
| PR 머지 | 최종 코드 반영은 사용자 결정 |
| 충돌 해결 | Git 충돌은 수동 판단 필요 |
| 아키텍처 변경 | 큰 구조 변경은 승인 필요 |
| 보안 이슈 | 심각한 취약점은 즉시 알림 |
| 비용 발생 | 클라우드 리소스 생성 등 |

---

## 8. 비활성화 방법

자동 워크플로우를 끄고 싶으면:

```
사용자: "자동 리뷰 없이 작업해줘"
사용자: "브랜치 생성 없이 main에서 작업해줘"
```

또는 `.claude/settings.local.json`에서:
```json
{
  "autoWorkflow": {
    "enabled": false
  }
}
```

---

## 9. 🚀 GitHub Actions Matrix 통합 (v2.0)

### 파일 위치
- `.github/workflows/parallel-quality-gates.yml`
- `.github/workflows/pr-agent.yml`
- `.pr_agent.toml`

### GitHub Actions Matrix 전략

```yaml
# 3개 영역 완전 독립 병렬 테스트
strategy:
  matrix:
    area: [frontend, backend, infra]
  fail-fast: false  # 하나 실패해도 나머지 계속
  max-parallel: 3   # 최대 3개 병렬
```

### 워크플로우 흐름

```
[PR 생성/업데이트]
    │
    ▼
[Phase 1: 변경 감지]
  dorny/paths-filter 액션
  - frontend/** → frontend 테스트
  - backend/** → backend 테스트
  - docker-compose* → infra 테스트
    │
    ▼
[Phase 2: Matrix 병렬 테스트]
  ┌─────────────────────────────────────────────┐
  │  [frontend]   │  [backend]   │   [infra]    │
  │  Playwright   │   pytest     │  docker-     │
  │  E2E 테스트   │   --cov      │  compose     │
  │               │              │  config      │
  └───────┬───────┴───────┬──────┴───────┬──────┘
          │               │              │
          ▼               ▼              ▼
       결과 아티팩트 업로드
    │
    ▼
[Phase 3: 코드 리뷰 게이트]
  - 전체 통과 시 → PR-Agent 리뷰
  - 실패 시 → PR 블록
    │
    ▼
[Phase 4: 자동 라벨링]
  - frontend/backend/infra 라벨 추가
```

### Qodo PR-Agent 명령어

PR 코멘트에서 사용 가능:

| 명령어 | 설명 |
|--------|------|
| `/review` | 코드 리뷰 실행 |
| `/describe` | PR 설명 자동 생성 |
| `/improve` | 코드 개선 제안 |
| `/ask <질문>` | PR 관련 질문 |
| `/test` | 테스트 코드 제안 |
| `/update_changelog` | 체인지로그 업데이트 |

---

## 10. 🧠 LangGraph 상태 관리 (v2.0)

### StateGraph 개념

LangGraph는 DAG(방향성 비순환 그래프) 기반으로 에이전트 워크플로우를 관리합니다.

```
[StateGraph] 중앙 상태 저장소
    │
    ├─ 파이프라인별 진행 상태
    │    - frontend: { step: "test", retry: 1, status: "failed" }
    │    - backend: { step: "review", retry: 0, status: "passed" }
    │    - infra: { step: "pr", retry: 0, status: "pending" }
    │
    ├─ 실패 이력 + 복구 지점
    │    - checkpoints: [{ step: "test", timestamp, state }]
    │    - 타임트래블 디버깅 가능
    │
    └─ 에이전트 컨텍스트 공유
         - 공유 메모리 (이전 분석 결과)
         - 이슈 목록
         - 수정 가이드라인
```

### Claude Code에서의 상태 관리 구현

```
## 워크플로우 상태 추적 (context-manager 활용)

[상태 파일: .claude/workflow_state.json]
{
  "workflow_id": "mvp-2024-001",
  "started_at": "2024-01-15T10:00:00Z",
  "pipelines": {
    "frontend": {
      "branch": "feature/frontend-mvp",
      "current_step": "test",
      "steps_completed": ["implement"],
      "retry_count": 0,
      "issues": [],
      "last_checkpoint": { ... }
    },
    "backend": { ... },
    "infra": { ... }
  },
  "global_issues": [],
  "checkpoints": []
}
```

### 체크포인트 & 복구

```
[실패 발생 시]
    │
    ▼
[체크포인트 저장]
  - 현재 단계
  - 파일 변경 내역 (git stash)
  - 에러 컨텍스트
    │
    ▼
[복구 옵션]
  1. 자동 재시도 (max 3회)
  2. 이전 체크포인트로 롤백
  3. 사용자 개입 요청
```

---

## 11. 💬 Group Chat 패턴 (v2.0)

### Maker-Checker + Group Chat 하이브리드

```
[기존 방식: 순차적]
Maker(구현) → Checker(리뷰) → 실패 시 Maker 재호출

[개선 방식: Group Chat]
Maker(구현) → Checker(리뷰) → 실패 시 Group Chat 세션
```

### Group Chat 세션 흐름

```
[리뷰 실패: Critical/High 이슈 발견]
    │
    ▼
[Group Chat 세션 시작]
┌─────────────────────────────────────────────────────────────┐
│                    [Orchestrator]                           │
│                  세션 진행 및 합의 도출                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [debugger]              [security-auditor]                 │
│  "스택 트레이스 분석      "보안 관점에서 이 코드는           │
│   결과, 의존성 배열       SQL Injection 위험이 있습니다.     │
│   누락이 원인입니다"      prepared statement 사용 권장"       │
│                                                             │
│  [구현 에이전트]          [architect-reviewer]               │
│  "수정 방향 제안:         "아키텍처 관점에서                 │
│   useCallback 사용 +      서비스 레이어 분리 필요"           │
│   의존성 명시"                                               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
[Consensus 도출]
  - 참여 에이전트 분석 결과 종합
  - 최적 해결책 선정
  - 우선순위 결정
    │
    ▼
[단일 수정 계획 생성]
  1. SQL Injection 수정 (Critical, security-auditor 제안)
  2. useEffect 의존성 수정 (High, debugger 제안)
  3. 서비스 레이어 리팩토링 (Medium, architect 제안)
    │
    ▼
[구현 에이전트 수정 실행]
    │
    ▼
[재검증]
```

### Group Chat 트리거 조건

| 조건 | 동작 |
|------|------|
| 단순 실패 (1-2건) | 기존 순차 방식 |
| 복잡 실패 (3건+) | Group Chat 세션 |
| Critical 보안 이슈 | security-auditor 필수 참여 |
| 아키텍처 이슈 | architect-reviewer 필수 참여 |
| 재시도 2회 초과 | Group Chat 강제 |

### Group Chat 에이전트 프롬프트

```
## Group Chat 세션 시작

### 현재 이슈
{이슈_목록}

### 참여 에이전트
- debugger: 버그 원인 분석
- security-auditor: 보안 취약점 분석
- architect-reviewer: 아키텍처 일관성 검토
- {구현_에이전트}: 수정 방향 제안

### 세션 규칙
1. 각 에이전트는 자신의 전문 영역에서 분석 제공
2. 다른 에이전트의 의견에 동의/반박 가능
3. Orchestrator가 최종 합의 도출
4. 합의된 수정 계획만 실행

### 합의 형식
```json
{
  "consensus": true,
  "fixes": [
    { "priority": 1, "issue": "...", "solution": "...", "agent": "..." }
  ],
  "dissent": []  // 합의 실패 항목
}
```
```

### seq-engineer 기반 오케스트레이션

```
[seq-engineer 역할]
  │
  ├─ 순차적 사고로 문제 분해
  │    "이 이슈는 3개의 독립적인 문제로 분리됩니다..."
  │
  ├─ 에이전트 호출 순서 결정
  │    "먼저 debugger로 원인 파악, 그 다음..."
  │
  ├─ 조건부 분기 처리
  │    "보안 이슈가 있으면 security-auditor 추가..."
  │
  └─ 상태 추적 및 체크포인트
       "현재 2/5 단계 완료, 다음 단계..."
```

---

## 12. 🔄 통합 워크플로우 v2.0

### 전체 아키텍처

```
┌─────────────────────────────────────────────────────────────────┐
│                     [사용자 요청]                                │
│                "병렬로 MVP 구현해줘"                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  [Layer 1: Claude Code]                         │
│                 context-manager + 에이전트들                      │
│                                                                 │
│  ┌──────────────┬──────────────┬──────────────┐                │
│  │  Frontend    │   Backend    │    Infra     │                │
│  │  Pipeline    │   Pipeline   │   Pipeline   │                │
│  └──────┬───────┴──────┬───────┴──────┬───────┘                │
│         │              │              │                         │
│         ▼              ▼              ▼                         │
│  ┌──────────────────────────────────────────┐                  │
│  │         [상태 관리: workflow_state.json]  │                  │
│  │         체크포인트 + 복구 지점            │                  │
│  └──────────────────────────────────────────┘                  │
│                              │                                  │
│                              ▼                                  │
│  ┌──────────────────────────────────────────┐                  │
│  │         [실패 시: Group Chat 세션]        │                  │
│  │         다중 에이전트 협의                │                  │
│  └──────────────────────────────────────────┘                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ git push
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  [Layer 2: GitHub Actions]                      │
│                 Matrix 병렬 테스트 + PR-Agent                    │
│                                                                 │
│  ┌──────────────────────────────────────────┐                  │
│  │  parallel-quality-gates.yml              │                  │
│  │  - 변경 감지                             │                  │
│  │  - Matrix 병렬 테스트                    │                  │
│  │  - 코드 리뷰 게이트                      │                  │
│  └──────────────────────────────────────────┘                  │
│                                                                 │
│  ┌──────────────────────────────────────────┐                  │
│  │  pr-agent.yml + .pr_agent.toml           │                  │
│  │  - AI 자동 코드 리뷰                     │                  │
│  │  - PR 설명 자동 생성                     │                  │
│  │  - 개선 제안                             │                  │
│  └──────────────────────────────────────────┘                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  [Layer 3: 최종 결과]                            │
│                                                                 │
│  ✅ 모든 테스트 통과                                             │
│  ✅ PR-Agent 리뷰 통과 (Critical 0, High 0)                      │
│  ✅ 3개 PR 생성 완료                                             │
│  ➡️ 머지 승인 대기                                               │
└─────────────────────────────────────────────────────────────────┘
```

### 활성화 방법

**GitHub Actions 활성화:**
1. Repository Settings → Actions → General
2. "Allow all actions" 선택
3. Secrets 설정: `OPENAI_API_KEY` (PR-Agent용)

**Claude Code에서 v2.0 워크플로우 사용:**
```
사용자: "v2.0 워크플로우로 병렬 작업해줘"
```

또는 `.claude/settings.local.json`:
```json
{
  "autoWorkflow": {
    "enabled": true,
    "version": "2.0",
    "features": {
      "githubActionsMatrix": true,
      "prAgent": true,
      "stateManagement": true,
      "groupChat": true
    }
  }
}
```
