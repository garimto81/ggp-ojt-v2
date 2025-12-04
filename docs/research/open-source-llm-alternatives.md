# Open Source LLM Alternatives for OJT Master (2025)

**작성일**: 2025-12-04
**목적**: Google Gemini API 대체 가능한 오픈소스 LLM 조사
**현재 설정**: gemini-2.0-flash-exp, temperature=0.3, max_tokens=8192

---

## Executive Summary

OJT Master 프로젝트에서 Google Gemini API를 대체할 수 있는 3가지 주요 옵션을 제시합니다:

| 옵션 | 타입 | 비용 | 한국어 지원 | 프론트엔드 통합 | 추천 용도 |
|------|------|------|------------|----------------|-----------|
| **Groq Cloud API** | Cloud API | Free 티어 제공 | 우수 (Llama 모델) | ⭐⭐⭐ 쉬움 | 즉시 대체 가능 |
| **Ollama + 한국어 모델** | Self-Hosted | 서버 비용만 | ⭐⭐⭐ 최고 | ⭐⭐ 중간 | 데이터 프라이버시 중요 시 |
| **Together AI** | Cloud API | 유료 (저렴) | 우수 (Llama 모델) | ⭐⭐⭐ 쉬움 | 대규모 운영 시 |

---

## 1. 추천 옵션 상세 분석

### 옵션 1: Groq Cloud API (권장 - 즉시 대체)

**개요**
- Groq LPU 하드웨어 기반 초고속 추론 서비스
- OpenAI 호환 API 제공
- 프론트엔드에서 직접 호출 가능

**장점**
- ✅ **무료 티어 제공**: 프로토타입/소규모 운영 가능
- ✅ **초고속 응답**: 0.14초 first-token latency (업계 최고)
- ✅ **간단한 마이그레이션**: Gemini API와 유사한 구조
- ✅ **한국어 지원**: Llama 3.1/3.3 70B 모델 사용 시 우수
- ✅ **JSON 구조화 출력**: `json_mode` 지원

**단점**
- ❌ 제한된 모델 선택지 (Groq LPU 최적화 모델만)
- ❌ Free 티어 rate limit (조직당 제한)
- ❌ 완전한 데이터 프라이버시는 아님 (클라우드 서비스)

**가격**
```
Free Tier: 제한적 RPM/TPM (정확한 수치는 공식 문서 참조)
Developer Tier: Free의 10배 한도 제공
Llama 4 Scout 17B: $0.11/M input, $0.34/M output tokens
```

**코드 예시 (기존 Gemini 대비)**
```javascript
// 기존 Gemini
const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-goog-api-key': GEMINI_API_KEY
  },
  body: JSON.stringify({ contents: [...] })
});

// Groq 대체
const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${GROQ_API_KEY}`
  },
  body: JSON.stringify({
    model: 'llama-3.3-70b-versatile', // 한국어 + JSON 출력 우수
    messages: [...],
    temperature: 0.3,
    max_tokens: 8192,
    response_format: { type: 'json_object' } // JSON 강제
  })
});
```

**마이그레이션 체크리스트**
- [ ] Groq 계정 생성 및 API 키 발급 (https://console.groq.com)
- [ ] `.env` 파일에 `VITE_GROQ_API_KEY` 추가
- [ ] `src-vite/src/services/ai.js` 수정 (API endpoint + request format)
- [ ] 프롬프트 미세 조정 (Llama는 Gemini와 약간 다른 응답 스타일)
- [ ] Rate limit 모니터링 설정 (429 에러 핸들링)

---

### 옵션 2: Ollama + 한국어 특화 모델 (Self-Hosted)

**개요**
- 로컬/자체 서버에서 LLM 실행
- 완전한 데이터 프라이버시 보장
- 한국어 특화 모델 선택 가능

**장점**
- ✅ **완전한 프라이버시**: 데이터가 외부로 나가지 않음
- ✅ **비용 예측 가능**: API 호출 비용 없음 (서버 비용만)
- ✅ **한국어 최적화**: Motif 102B, KORani, Solar Pro 등
- ✅ **커스터마이징**: Fine-tuning, 프롬프트 엔지니어링 자유로움
- ✅ **오프라인 운영**: 인터넷 없이도 작동

**단점**
- ❌ 서버 인프라 필요 (GPU 권장: RTX 4090, A100 등)
- ❌ 초기 설정 복잡도 높음
- ❌ 프론트엔드 직접 호출 불가 (백엔드 필요)
- ❌ 유지보수 부담 (모델 업데이트, 서버 관리)

**추천 한국어 모델**
1. **Qwen3-8B**: 경량, 균형 잡힌 성능 (8B 파라미터)
2. **Meta-Llama-3.1-8B-Instruct**: 멀티링구얼 우수 (8B)
3. **Motif 102B**: KMMLU 64.74점 (GPT-4 수준) - 대형 모델
4. **Solar Pro 2** (Upstage): 한국어 특화, 효율적 (30B)

**아키텍처 (Backend 필요)**
```
React Frontend (Vite)
    ↓ HTTP Request
Node.js/FastAPI Backend
    ↓ Ollama API (localhost:11434)
Ollama Server
    ↓ 모델 실행
GPU/CPU (Local/Cloud Server)
```

**코드 예시 (Backend 필요)**
```javascript
// Backend (Node.js + Express)
import ollama from 'ollama';

app.post('/api/generate', async (req, res) => {
  const response = await ollama.chat({
    model: 'qwen3:8b',
    messages: req.body.messages,
    options: {
      temperature: 0.3,
      num_predict: 8192
    },
    format: 'json' // JSON 출력 강제
  });

  res.json(response.message.content);
});

// Frontend (React)
const response = await fetch('http://localhost:3001/api/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ messages: [...] })
});
```

**인프라 요구사항**
| 모델 크기 | GPU 메모리 | 예상 성능 | 비용 (AWS/GCP) |
|----------|-----------|----------|----------------|
| 8B (Qwen3) | 6GB VRAM | 20-30 tokens/sec | ~$500/월 (g4dn.xlarge) |
| 70B (Llama 3.3) | 40GB VRAM | 5-10 tokens/sec | ~$3,000/월 (p3.8xlarge) |
| 102B (Motif) | 80GB+ VRAM | 3-5 tokens/sec | ~$5,000/월 (p3.16xlarge) |

**마이그레이션 체크리스트**
- [ ] 서버 준비 (AWS, GCP, 또는 온프레미스)
- [ ] Ollama 설치 (`curl -fsSL https://ollama.com/install.sh | sh`)
- [ ] 모델 다운로드 (`ollama pull qwen3:8b`)
- [ ] Backend API 개발 (Node.js/Python FastAPI)
- [ ] CORS 설정 (프론트엔드 → 백엔드)
- [ ] 프론트엔드 API endpoint 변경

---

### 옵션 3: Together AI (대규모 운영용)

**개요**
- 200+ 오픈소스 모델 제공하는 클라우드 플랫폼
- 자동 최적화 및 수평 확장 지원
- 프로덕션 레벨 SLA 제공

**장점**
- ✅ **다양한 모델 선택**: Llama, Qwen, Mistral 등 200+
- ✅ **높은 성능**: Sub-100ms latency
- ✅ **합리적 가격**: Llama 3 8B Lite $0.10/M tokens (GPT-4o-mini 대비 1/6)
- ✅ **한국어 지원**: Llama 3.3 70B, Qwen 모델 사용 시
- ✅ **OpenAI 호환 API**: 쉬운 마이그레이션

**단점**
- ❌ 무료 티어 없음 (유료 전용)
- ❌ Groq보다는 느림 (하지만 여전히 빠름)

**가격 (예시)**
```
Llama 3 8B Lite: $0.10/M tokens
Llama 3.3 70B: ~$0.88/M input tokens (정확한 가격은 공식 사이트 확인)
Qwen3 모델: 모델별 상이
```

**코드 예시**
```javascript
const response = await fetch('https://api.together.xyz/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${TOGETHER_API_KEY}`
  },
  body: JSON.stringify({
    model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
    messages: [...],
    temperature: 0.3,
    max_tokens: 8192,
    response_format: { type: 'json_object' }
  })
});
```

**마이그레이션 체크리스트**
- [ ] Together AI 계정 생성 (https://www.together.ai)
- [ ] 결제 정보 등록 (유료 서비스)
- [ ] API 키 발급
- [ ] 예산 알림 설정 (비용 관리)
- [ ] 프론트엔드 API endpoint 변경
- [ ] 프롬프트 테스트 및 최적화

---

## 2. 기술 스택별 상세 가이드

### 2.1 오픈소스 LLM 프레임워크 비교

| 프레임워크 | 타입 | 장점 | 단점 | 추천 상황 |
|-----------|------|------|------|----------|
| **Ollama** | 로컬 실행 | 사용 편의성 최고, CLI 우수 | 프론트엔드 직접 호출 불가 | 개발자 친화적, 빠른 프로토타입 |
| **llama.cpp** | 로컬 실행 | 성능 최적화, 하드웨어 유연성 | 설정 복잡, 낮은 수준 제어 | 최대 성능 필요, 커스터마이징 |
| **vLLM** | 프로덕션 서빙 | 고처리량, PagedAttention | 엔터프라이즈급 인프라 필요 | 대규모 트래픽, 동시 요청 많음 |
| **WebLLM** | 브라우저 내 | 서버 불필요, WebGPU 가속 | 모델 크기 제한, 로딩 시간 | 완전 오프라인 앱 |

### 2.2 한국어 지원 LLM 순위 (2025)

| 순위 | 모델 | 파라미터 | KMMLU 점수 | 접근성 | 비고 |
|------|------|---------|-----------|--------|------|
| 1 | **Motif** (Moreh) | 102B | 64.74 | Ollama, HuggingFace | GPT-4 수준, 오픈소스 |
| 2 | **Qwen3-235B-A22B** | 235B | - | API (Alibaba Cloud) | 엔터프라이즈급, 추론 능력 최고 |
| 3 | **Solar Pro 2** (Upstage) | 30B | - | Ollama, API | 효율성 우수 |
| 4 | **Llama 3.3 70B** | 70B | - | Ollama, Groq, Together | 범용성 최고, 멀티링구얼 |
| 5 | **Qwen3-8B** | 8B | - | Ollama, HuggingFace | 경량, 로컬 실행 최적 |
| 6 | **KORani-v3-13B** | 13B | - | HuggingFace | 한국어 특화 (KRAFTON) |

### 2.3 JSON 구조화 출력 지원

모든 LLM이 JSON 출력을 기본 지원하는 것은 아닙니다. 안정적인 JSON 생성을 위한 방법:

**방법 1: Native JSON Mode (권장)**
```javascript
// Groq, Together AI, OpenAI 호환 API
{
  response_format: { type: 'json_object' }
}
```

**방법 2: Structured Output Libraries**
- **Instructor** (Python): Pydantic 기반 스키마 검증
- **Outlines**: Regex, JSON Schema 기반 제약
- **vLLM Guided JSON**: 생성 시점에 형식 강제

**방법 3: Prompt Engineering (Fallback)**
```
시스템 프롬프트에 명시:
"You must respond ONLY with valid JSON. No markdown, no explanations."

예시 포함:
{
  "sections": [...],
  "quiz": [...]
}
```

---

## 3. 비용 비교 (월 1,000회 생성 가정)

**가정**:
- 입력 토큰: 500 tokens (프롬프트)
- 출력 토큰: 5,000 tokens (OJT 문서 + 퀴즈 20개)
- 월 생성 횟수: 1,000회

| 서비스 | 모델 | 입력 비용 | 출력 비용 | 월 총 비용 | 비고 |
|--------|------|----------|----------|-----------|------|
| **Google Gemini** | gemini-2.0-flash | $0.50 | $50.00 | **$50.50** | 현재 사용 중 (Free 티어 소진 시) |
| **Groq** | Llama 3.3 70B | $0.06 | $1.70 | **$1.76** | Free 티어 내 가능 |
| **Together AI** | Llama 3 8B Lite | $0.05 | $0.50 | **$0.55** | 가장 저렴 |
| **Ollama (Self)** | Qwen3-8B | $0 (API) | $0 (API) | **~$500** | 서버 비용 (AWS g4dn.xlarge) |

**분석**:
- **즉시 절감**: Groq Free 티어로 전환 시 월 $50 → $0
- **대규모 시**: Together AI가 가장 저렴 (Gemini 대비 99% 절감)
- **Self-Hosted**: 월 생성량이 10,000회 이상일 때 경제적

---

## 4. 프론트엔드 통합 가이드

### 4.1 클라우드 API (Groq/Together AI)

**장점**:
- ✅ 백엔드 불필요
- ✅ 즉시 마이그레이션 가능
- ✅ CDN 기반 고가용성

**보안 고려사항**:
```javascript
// ❌ 나쁜 예: API 키 프론트엔드 노출
const GROQ_API_KEY = 'gsk_...'; // .env에 하드코딩

// ✅ 좋은 예 1: Vercel Edge Function
// api/generate.js (Vercel Serverless Function)
export default async function handler(req, res) {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` }
  });
  res.json(await response.json());
}

// ✅ 좋은 예 2: Cloudflare Worker (기존 R2 Worker 확장)
// ojt-r2-upload/src/index.js
export default {
  async fetch(request, env) {
    if (request.url.includes('/api/ai')) {
      return handleAI(request, env.GROQ_API_KEY);
    }
    // 기존 R2 업로드 로직
  }
}
```

### 4.2 Self-Hosted (Ollama)

**아키텍처**:
```
Frontend (React Vite)
    ↓ fetch('/api/generate')
Backend API (Node.js/FastAPI)
    ↓ ollama.chat()
Ollama Server (localhost:11434)
    ↓ 모델 추론
GPU/CPU
```

**React 훅 예시**:
```javascript
// src-vite/src/hooks/useOllama.js
import { useState } from 'react';

export function useOllama() {
  const [loading, setLoading] = useState(false);

  const generate = async (prompt) => {
    setLoading(true);
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'qwen3:8b',
          prompt,
          options: { temperature: 0.3 }
        })
      });
      return await response.json();
    } finally {
      setLoading(false);
    }
  };

  return { generate, loading };
}
```

### 4.3 브라우저 내 LLM (WebLLM) - 실험적

**장점**:
- ✅ 완전 오프라인
- ✅ 서버 비용 0원
- ✅ 데이터 프라이버시 최상

**단점**:
- ❌ 초기 모델 다운로드 시간 (1-5분)
- ❌ 모델 크기 제한 (4GB 미만 권장)
- ❌ 사용자 GPU 성능 의존

**코드 예시**:
```javascript
import { CreateWebWorkerMLCEngine } from "@mlc-ai/web-llm";

const engine = await CreateWebWorkerMLCEngine(
  new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' }),
  "Llama-3.1-8B-Instruct-q4f32_1-MLC" // 4GB WebGPU 모델
);

const reply = await engine.chat.completions.create({
  messages: [{ role: "user", content: "Generate OJT content..." }],
  temperature: 0.3,
  max_tokens: 8192
});
```

---

## 5. 마이그레이션 로드맵

### Phase 1: 평가 (1-2일)

- [ ] Groq 계정 생성 및 API 키 발급
- [ ] 로컬 테스트 환경 구축
  ```bash
  cd src-vite
  cp .env.example .env.test
  echo "VITE_GROQ_API_KEY=your-key" >> .env.test
  ```
- [ ] 기존 프롬프트로 10회 테스트 생성
- [ ] 출력 품질 비교 (Gemini vs Groq)
- [ ] JSON 파싱 에러율 측정

### Phase 2: PoC 구현 (3-5일)

- [ ] `src-vite/src/services/ai.js` 분기 처리
  ```javascript
  const AI_PROVIDER = import.meta.env.VITE_AI_PROVIDER || 'gemini'; // 'groq', 'together'

  if (AI_PROVIDER === 'groq') {
    return groqGenerateContent(prompt);
  }
  ```
- [ ] Groq API 래퍼 함수 작성
- [ ] 에러 핸들링 (Rate limit 429, 타임아웃)
- [ ] 단위 테스트 작성 (`src-vite/src/utils/api.test.js`)

### Phase 3: A/B 테스트 (1주)

- [ ] 프로덕션에 Feature Flag 배포
  ```javascript
  const useGroq = localStorage.getItem('use_groq_ai') === 'true';
  ```
- [ ] 멘토 5명에게 테스트 요청
- [ ] 피드백 수집 (속도, 품질, 에러율)
- [ ] 비용 모니터링 (Groq Dashboard)

### Phase 4: 전체 마이그레이션 (2-3일)

- [ ] 기본값을 Groq로 변경 (`VITE_AI_PROVIDER=groq`)
- [ ] Gemini를 Fallback으로 유지
  ```javascript
  try {
    return await groqGenerate(prompt);
  } catch (error) {
    console.warn('Groq failed, fallback to Gemini', error);
    return await geminiGenerate(prompt);
  }
  ```
- [ ] 문서 업데이트 (`CLAUDE.md`, `README.md`)
- [ ] 버전 업데이트 (v2.6.0)

### Phase 5: Self-Hosted 검토 (선택, 2-4주)

**트리거**: 월 생성량 > 10,000회 또는 데이터 규제 요구사항 발생 시

- [ ] 인프라 선정 (AWS, GCP, Azure, 온프레미스)
- [ ] Ollama 서버 구축
- [ ] Backend API 개발 (Node.js/FastAPI)
- [ ] 모델 성능 테스트 (Qwen3, Llama 3.3, Motif)
- [ ] 부하 테스트 (동시 요청 처리)
- [ ] 프론트엔드 API endpoint 전환

---

## 6. 위험 요소 및 완화 방안

| 위험 요소 | 영향도 | 확률 | 완화 방안 |
|----------|--------|------|----------|
| **한국어 품질 저하** | 높음 | 중간 | 프롬프트 재조정, Few-shot 예시 추가, Llama 3.3 70B 사용 |
| **JSON 파싱 에러** | 중간 | 낮음 | `response_format: json_object` 강제, Regex fallback 유지 |
| **Rate Limit 초과** | 중간 | 중간 | 큐잉 시스템 구현, Developer 티어 업그레이드 |
| **API 서비스 다운** | 높음 | 낮음 | Fallback 체인 (Groq → Together → Gemini) |
| **Self-Hosted 장애** | 높음 | 중간 | 모니터링 알림, 자동 재시작, 클라우드 백업 |
| **비용 초과** | 중간 | 낮음 | 일일 한도 설정, 알림 트리거 |

---

## 7. 권장 결정 트리

```
OJT Master AI 백엔드 선택
    ↓
[지금 당장 비용 절감 필요?]
    YES → Groq Free Tier (즉시 마이그레이션, 1-2일)
    NO → 다음 질문
    ↓
[월 생성량 > 10,000회?]
    YES → 다음 질문
    NO → Groq Developer Tier 또는 Together AI
    ↓
[데이터 프라이버시가 법적 요구사항?]
    YES → Ollama Self-Hosted (투자 필요, 2-4주)
    NO → Together AI (확장성 + 합리적 비용)
    ↓
[GPU 서버 운영 경험 있음?]
    YES → Ollama + vLLM (최고 성능)
    NO → Together AI (관리형 서비스)
```

---

## 8. 최종 권장사항

### 단기 (1-2주): Groq Cloud API

**이유**:
1. 즉시 마이그레이션 가능 (코드 변경 최소)
2. Free 티어로 비용 $0
3. 초고속 응답 (0.14초 first-token)
4. 한국어 지원 우수 (Llama 3.3 70B)
5. JSON 출력 안정적

**실행 계획**:
```bash
# 1일차: 평가
- Groq 가입, API 키 발급
- 10회 테스트 생성, 품질 확인

# 2일차: 구현
- ai.js 수정 (Groq API 추가)
- Feature flag 배포

# 3-7일차: A/B 테스트
- 멘토 피드백 수집
- 에러율 모니터링

# 8일차: 전환
- 기본값 Groq, Gemini Fallback
- 문서 업데이트, 버전 2.6.0 배포
```

### 중기 (1-3개월): Together AI 검토

**트리거**: Groq Rate Limit 부족 또는 더 다양한 모델 필요 시

**장점**:
- 200+ 모델 선택지
- 합리적 가격 ($0.55/월 for Llama 3 8B Lite)
- 프로덕션 SLA

### 장기 (6개월+): Ollama Self-Hosted 검토

**트리거**:
- 월 생성량 > 10,000회
- 데이터 규제 강화 (금융, 의료 등)
- 비용 구조 변경 필요

**투자 필요**:
- 서버 인프라: ~$500-5,000/월 (모델 크기 따라)
- 개발 공수: 2-4주 (Backend API, 모니터링)
- 유지보수: DevOps 리소스 필요

---

## 9. 참고 자료

### 공식 문서
- [Groq Documentation](https://console.groq.com/docs)
- [Together AI Pricing](https://www.together.ai/pricing)
- [Ollama Documentation](https://ollama.com/docs)
- [WebLLM GitHub](https://github.com/mlc-ai/web-llm)

### 벤치마크 및 비교
- [Best Open Source LLMs of 2025 - Klu](https://klu.ai/blog/open-source-llm-models)
- [Top 10 Open Source LLMs for 2025 - Instaclustr](https://www.instaclustr.com/education/open-source-ai/top-10-open-source-llms-for-2025/)
- [Ollama vs llama.cpp vs vLLM - HouseOfFOSS](https://www.houseoffoss.com/post/ollama-vs-llama-cpp-vs-vllm-local-llm-deployment-in-2025)
- [11 Best LLM API Providers - Helicone](https://www.helicone.ai/blog/llm-api-providers)

### 한국어 LLM
- [Ultimate Guide - Best Open Source LLM For Korean - SiliconFlow](https://www.siliconflow.com/articles/en/best-open-source-llm-for-korean)
- [Awesome Korean LLM - GitHub](https://github.com/NomaDamas/awesome-korean-llm)
- [Introducing Motif - Moreh](https://www.moreh.io/blog/introducing-motif-a-high-performance-open-source-korean-llm-by-moreh-241202)
- [Navigating Korean LLM Research - Hugging Face](https://huggingface.co/blog/amphora/navigating-ko-llm-research-1)

### JSON 구조화 출력
- [Awesome LLM JSON - GitHub](https://github.com/imaurer/awesome-llm-json)
- [Structured Outputs in vLLM - Red Hat](https://developers.redhat.com/articles/2025/06/03/structured-outputs-vllm-guiding-ai-responses)
- [Improving LLM Output Reliability - Matt Adams](https://www.matt-adams.co.uk/2025/02/12/structured-data-generation.html)

### 프론트엔드 통합
- [Ollama JavaScript Library - GitHub](https://github.com/ollama/ollama-js)
- [react-ollama - GitHub](https://github.com/incandesc3nce/react-ollama)
- [How to Use Ollama for Front-end - DEV Community](https://dev.to/ppaanngggg/how-to-use-ollama-for-front-end-with-streaming-output-5efj)
- [Self-Hosted LLM: 5-Step Deployment Guide - Plural](https://www.plural.sh/blog/self-hosting-large-language-models/)

---

## Sources

- [Best Open Source LLMs of 2025 — Klu](https://klu.ai/blog/open-source-llm-models)
- [Top 10 open source LLMs for 2025](https://www.instaclustr.com/education/open-source-ai/top-10-open-source-llms-for-2025/)
- [The 6 Best LLM Tools To Run Models Locally](https://getstream.io/blog/best-local-llm-tools/)
- [Ollama vs llama.cpp vs vLLM : Local LLM Deployment in 2025](https://www.houseoffoss.com/post/ollama-vs-llama-cpp-vs-vllm-local-llm-deployment-in-2025)
- [11 Best LLM API Providers: Compare Inferencing Performance & Pricing](https://www.helicone.ai/blog/llm-api-providers)
- [Groq is fast, low cost inference](https://groq.com/)
- [Pricing - OpenRouter](https://openrouter.ai/pricing)
- [Ultimate Guide - The Best Open Source LLM For Korean In 2025](https://www.siliconflow.com/articles/en/best-open-source-llm-for-korean)
- [GitHub - NomaDamas/awesome-korean-llm](https://github.com/NomaDamas/awesome-korean-llm)
- [Introducing Motif: A High-Performance Open-Source Korean LLM by Moreh](https://www.moreh.io/blog/introducing-motif-a-high-performance-open-source-korean-llm-by-moreh-241202)
- [GitHub - mlc-ai/web-llm: High-performance In-browser LLM Inference Engine](https://github.com/mlc-ai/web-llm)
- [GitHub - open-webui/open-webui](https://github.com/open-webui/open-webui)
- [AnythingLLM | The all-in-one AI application for everyone](https://anythingllm.com/)
- [GitHub - imaurer/awesome-llm-json](https://github.com/imaurer/awesome-llm-json)
- [Structured Outputs in vLLM: Guiding AI responses](https://developers.redhat.com/articles/2025/06/03/structured-outputs-vllm-guiding-ai-responses)
- [GitHub - ollama/ollama-js: Ollama JavaScript library](https://github.com/ollama/ollama-js)
- [How to Use Ollama for Front-end with Streaming Output](https://dev.to/ppaanngggg/how-to-use-ollama-for-front-end-with-streaming-output-5efj)
- [Rate Limits - GroqDocs](https://console.groq.com/docs/rate-limits)
- [GroqCloud Developer Tier: Fast, Affordable API Access for Devs](https://groq.com/blog/developer-tier-now-available-on-groqcloud)
- [Gemini Developer API pricing](https://ai.google.dev/gemini-api/docs/pricing)
- [Together AI - Pricing](https://www.together.ai/pricing)
