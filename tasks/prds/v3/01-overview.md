# 01. Project Overview

> **Parent**: [Master PRD](./00-master-prd.md) | **Version**: 3.0.0

## 1.1 Background (배경)

### 현재 문제점

| 문제 | 영향 |
|------|------|
| 현업 부서 업무 과중 | 체계적인 OJT 자료 작성 시간 부족 |
| 비정형 인수인계 | "대충 적은 메모", "녹음 파일", "산발적 위키" |
| 객관적 지표 부재 | 신입사원 이해도 측정 불가 |
| 교육 품질 편차 | 멘토별 교육 품질 차이 심함 |

### 해결 방향

```
[비정형 입력]          [AI 처리]              [구조화된 출력]
메모/PDF/URL  ──────▶  Gemini API  ──────▶  교육 자료 + 퀴즈
                       WebLLM (fallback)
```

---

## 1.2 Goals (목표)

### Primary Goals

| 목표 | 설명 | 측정 지표 |
|------|------|----------|
| **Input Minimization** | 비정형 데이터만으로 고품질 교육 자료 생성 | 자료 생성 시간 80% ↓ |
| **Output Maximization** | AI가 구조화된 커리큘럼 + 퀴즈 자동 생성 | 퀴즈 10문항 이상/문서 |
| **Data-Driven** | 학습 결과 데이터화 → 인사 지표 활용 | 대시보드 리포트 |

### Secondary Goals

- 오프라인 학습 지원 (Dexie.js 로컬 캐싱)
- 다중 AI 엔진 지원 (Gemini + WebLLM)
- 팀별 커리큘럼 관리

---

## 1.3 Scope (범위)

### In Scope (v3.0)

| 영역 | 기능 |
|------|------|
| **콘텐츠 생성** | 텍스트/PDF/URL → AI 자료 변환 |
| **퀴즈 시스템** | 자동 생성, 난이도별, 랜덤 출제 |
| **학습 관리** | 진도 추적, 점수 기록, 완료 인증 |
| **대시보드** | Admin/Mentor/Mentee 역할별 뷰 |
| **인증** | Google OAuth + Email 로그인 |

### Out of Scope (Future)

| 영역 | 비고 |
|------|------|
| 음성 녹음 STT | Phase 2 이후 검토 |
| 이미지 OCR | Phase 2 이후 검토 |
| RAG (벡터 검색) | 현재 Supabase pgvector 미사용 |
| 실시간 협업 | 현재 미지원 |

---

## 1.4 Success Criteria (성공 기준)

### Quantitative

| 지표 | 현재 | 목표 | 측정 방법 |
|------|------|------|----------|
| 자료 생성 시간 | ~2시간 | ~20분 | 사용자 설문 |
| 학습 완료율 | N/A | 90% | `learning_records` |
| 퀴즈 통과율 | N/A | 70% (첫 시도) | `learning_records.passed` |
| 시스템 가용성 | N/A | 99.5% | Vercel Analytics |

### Qualitative

- 멘토: "자료 만들기 쉬워졌다"
- 멘티: "체계적으로 학습할 수 있다"
- 관리자: "교육 현황을 한눈에 파악할 수 있다"

---

## 1.5 Constraints (제약 사항)

| 제약 | 설명 | 대응 |
|------|------|------|
| **API 비용** | Gemini API 무료 할당량 제한 | WebLLM fallback |
| **브라우저 호환** | WebLLM은 WebGPU 필요 | Chrome 113+ 권장 |
| **오프라인** | Supabase 실시간 동기화 필요 | Dexie.js + sync_queue |
| **보안** | 민감 교육 자료 보호 | RLS + 역할 기반 접근 |

---

## 1.6 Assumptions (가정)

1. 사용자는 Chrome 최신 버전 사용
2. 인터넷 연결 상태에서 주로 사용 (오프라인은 보조)
3. 교육 자료는 텍스트 중심 (이미지/영상 보조)
4. 한국어가 주 언어 (영어 보조)

---

## Related Documents

- [User Personas](./02-user-personas.md)
- [AI Content Generation](./03-features/03-01-ai-content.md)
- [Tech Stack](./05-tech-stack.md)
