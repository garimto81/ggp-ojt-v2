# 제품 요구사항 정의서 (PRD)

> ⚠️ **원본 기획서**: 이 문서는 OJT Master의 원본 PRD입니다.
>
> 실제 MVP(v2.0.0)는 간소화된 아키텍처로 구현되었습니다.
> 현재 구현 상세: [CLAUDE.md](../CLAUDE.md)

## 구현 현황 (2025-11)

| 기획 | MVP 구현 |
|------|----------|
| Meta Llama 3.1 8B | Google Gemini API |
| vLLM + FastAPI | Supabase (BaaS) |
| Next.js 14 | React 18 (CDN, 단일 파일) |
| pgvector (RAG) | 미구현 |
| Redis 캐시 | Dexie.js (IndexedDB) |

---

**프로젝트명**: OJT Master (가칭: 개떡같이 말해도 찰떡같이 알아듣는 AI 튜터)

## 1. 개요 (Overview)

1.1 배경

현업 부서는 업무 과중으로 인해 체계적인 교육 자료(OJT)를 작성할 시간이 부족함.

"대충 적은 메모", "녹음 파일", "산발적인 위키 문서" 등으로 인수인계가 이루어져 신규 입사자의 업무 습득 속도가 느림.

교육 후 실제 이해도를 측정할 객관적인 지표가 부족함.

1.2 목표

Input Minimization: 현업 담당자가 비정형 데이터(메모, 음성, 채팅 로그)만 입력해도 고품질의 교육 자료 생성.

Output Maximization: AI가 구조화된 커리큘럼을 생성하고, 학습자의 이해도를 검증하는 퀴즈를 무작위로 출제.

Data-Driven: 학습 결과 및 퀴즈 점수를 데이터화하여 인사/채용 결정 및 수습 통과 여부의 보조 지표로 활용.

2. 타겟 유저 (User Personas)

2.1 멘토 (Content Creator / 현업 담당자)

Pain Point: 교육 자료 만들 시간이 없고 귀찮음. 문서 포맷팅(PPT, Word)에 스트레스 받음.

Needs: 그냥 알던 내용을 텍스트나 말로 던져주면 알아서 정리되길 원함.

2.2 멘티 (Learner / 신규 입사자)

Pain Point: 인수인계 자료가 중구난방이라 이해하기 힘들고, 누구에게 물어봐야 할지 모름.

Needs: 체계적인 커리큘럼, 핵심 요약, 그리고 내가 진짜 이해했는지 확인하고 싶음.

2.3 관리자 (Admin / HR)

Needs: 신규 입사자가 제대로 적응하고 있는지, 누가 교육을 잘 시키는지 정량적 데이터가 필요함.

3. 핵심 기능 (Key Features)

3.1 AI 자료 변환 엔진 (The "Chalttuck" Engine)

다중 포맷 입력 지원:

텍스트(메모장), PDF, Word, PPT.

음성 녹음 파일 (STT 변환 후 요약).

이미지 (OCR 후 내용 추출).

자동 구조화 및 윤문:

파편화된 정보를 서론-본론-결론 및 'Step-by-Step' 가이드로 재구성.

비속어, 은어, 모호한 표현을 표준 비즈니스 용어로 순화.

부족한 맥락 발견 시 멘토에게 역질문 생성 ("이 부분에 대한 구체적인 예시가 필요합니까?").

3.2 맞춤형 퀴즈 생성기 (Random Assessment System)

문항 자동 생성: 교육 자료의 내용을 바탕으로 OX, 4지선다, 단답형, 시나리오형 문제 생성.

난이도 조절: 학습자의 수준이나 직군에 따라 상/중/하 난이도 조절.

랜덤 출제 알고리즘:

문제 은행(Bank) 방식이 아니라, 매번 AI가 문맥을 비틀어 새로운 문제를 생성(부정행위 방지).

틀린 문제에 대해서는 해당 파트의 교육 자료 링크를 다시 추천(Re-learning).

3.3 대시보드 및 리포트

멘티 현황: 진도율, 퀴즈 평균 점수, 취약 파트 분석.

멘토 기여도: 자료 업로드 수, 멘티들의 피드백(별점 등).

4. 유저 시나리오 (User Stories)

ID

Actor

Story

Acceptance Criteria

US-01

멘토

회의 녹음 파일이나 대충 적은 메모를 업로드하여 매뉴얼을 만들고 싶다.

업로드 후 1분 내에 목차와 본문이 정리된 초안이 생성되어야 함.

US-02

멘토

생성된 자료에서 틀린 부분만 빠르게 수정하고 배포하고 싶다.

위키 형태의 에디터 제공, AI 수정 제안 기능 포함.

US-03

멘티

교육 자료를 학습한 후, 내가 제대로 이해했는지 시험을 보고 싶다.

학습 완료 버튼 클릭 시 즉시 5~10문항의 퀴즈 생성 및 응시 가능.

US-04

멘티

퀴즈에서 틀렸을 때 왜 틀렸는지 해설을 보고 싶다.

오답 노트 기능 제공, 관련 본문 하이라이팅.

US-05

관리자

특정 부서의 OJT 진행 상황을 한눈에 보고 싶다.

팀별/개인별 진척도 그래프 및 점수 평균 대시보드 제공.

5. 기술적 요구사항 (Technical Requirements)

5.1 AI & LLM (Open Source Strategy)

Core Model: Meta Llama 3.1 8B Instruct (한국어 Fine-tuned 버전).

선정 사유: 128k Context Window로 긴 OJT 문서 처리에 적합하며, 8B 사이즈로 단일 GPU 추론 가능.

Inference Engine: vLLM (Variable-length output optimization).

구성: AWQ (Activation-aware Weight Quantization) 4-bit 양자화 적용하여 메모리 점유율 최적화 및 추론 속도 향상.

RAG Engine:

Embedding Model: BAAI/bge-m3 (다국어 지원 및 긴 문맥 임베딩 성능 우수).

Retrieval Strategy: Hybrid Search (Keyword + Vector) 및 Rerank (Cross-Encoder) 적용.

Output Validation: Self-Correction Logic 적용 (퀴즈 정답 생성 후, 생성된 정답이 본문에 근거하는지 AI가 재검증).

5.2 Frontend / Backend / Infra

Web App: Next.js 14 (App Router).

UI Component: Tailwind CSS + Shadcn/ui.

Backend: Python FastAPI (Asynchronous Server).

선정 사유: LangChain, Pydantic 등 AI 라이브러리와의 네이티브 연동성 및 비동기 처리 성능 우수.

Database Stack:

RDBMS: PostgreSQL 16.

Vector Store: pgvector (PostgreSQL Extension) - 별도 벡터 DB 도입 없이 RDBMS 내에서 통합 관리.

Cache: Redis 7 (세션 관리 및 LLM 응답 캐싱).

6. 성공 지표 (Metrics)

자료 생성 시간 단축: 기존 OJT 자료 작성 시간 대비 80% 이상 단축.

학습 완료율: 배정된 OJT 코스의 90% 이상 완료.

퀴즈 통과율: 첫 시도 통과율 70% 이상 (적절한 난이도 유지).

유저 만족도: 멘토/멘티 NPS(순추천지수) 4.0/5.0 이상.

7. 향후 로드맵 (Roadmap)

Phase 1 (MVP): 텍스트/PDF 입력 → 텍스트 자료 생성 → 4지선다 퀴즈 기능 구현.

Next Step: MVP 운영 및 데이터 분석을 통해 후속 개발 방향 설정 예정.