# OJT Master - Docker 배포 가이드

Docker Compose를 사용한 프론트엔드 배포 가이드입니다.

## ⚠️ 중요: AI 서버 구조

```
┌─────────────────────────────────────────────────────────────┐
│                     현재 배포 구조                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Browser ──HTTPS──▶ ojt-nginx:8443                          │
│                        │                                    │
│                        └── / ──▶ 정적 파일 (React SPA)       │
│                                                             │
│  React App ──HTTP──▶ ojt-local-ai:8001 (외부 AI 서버)        │
│                       (10.10.100.209:8001)                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### vLLM 서버 분리 이유

- **ojt-local-ai**: 별도 관리되는 vLLM 컨테이너 (이미 실행 중)
- **docker-compose**: 프론트엔드(nginx)만 관리
- GPU 리소스 공유 문제 방지
- AI 서버 독립적 관리 가능

## 요구사항

- Docker 20.10+
- Docker Compose 2.0+
- Node.js 18+ (프론트엔드 빌드용)

## 빠른 시작

### 1. SSL 인증서 생성 (자체 서명)

```bash
cd docker

# ssl 폴더 생성
mkdir -p ssl

# 자체 서명 인증서 생성
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout ssl/key.pem -out ssl/cert.pem \
  -subj "/CN=localhost"
```

### 2. 프론트엔드 빌드

```bash
cd ../src-vite
npm install
npm run build
```

### 3. Docker Compose 실행

```bash
cd ../docker
docker-compose up -d

# 로그 확인
docker-compose logs -f
```

### 4. 접속

- **프론트엔드**: https://localhost:8443 (자체 서명 인증서 경고 무시)

## AI 서버 관리

### ⚠️ vLLM은 docker-compose에 포함되지 않습니다

AI 서버는 별도의 `ojt-local-ai` 컨테이너에서 실행됩니다.

```bash
# AI 서버 상태 확인
docker ps | grep ojt-local-ai

# AI 서버 헬스체크
curl http://10.10.100.209:8001/health
```

### AI 서버가 없는 경우 (최초 설정)

```bash
docker run -d --name ojt-local-ai \
  --gpus all \
  -p 8001:8000 \
  --restart unless-stopped \
  vllm/vllm-openai:latest \
  --model Qwen/Qwen3-4B \
  --host 0.0.0.0 \
  --port 8000 \
  --max-model-len 4096 \
  --gpu-memory-utilization 0.7 \
  --enforce-eager
```

### 환경 변수 설정

프론트엔드에서 AI 서버 URL 설정:

```bash
# src-vite/.env
VITE_LOCAL_AI_URL=http://10.10.100.209:8001
```

### API 엔드포인트

| 엔드포인트 | 설명 |
|-----------|------|
| `http://10.10.100.209:8001/health` | 서버 상태 확인 |
| `http://10.10.100.209:8001/v1/models` | 사용 가능한 모델 목록 |
| `http://10.10.100.209:8001/v1/chat/completions` | 채팅 완성 API (OpenAI 호환) |

**예시 요청:**

```bash
curl http://10.10.100.209:8001/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "Qwen/Qwen3-4B",
    "messages": [{"role": "user", "content": "Hello!"}],
    "temperature": 0.3,
    "max_tokens": 1024
  }'
```

## 명령어 참조

```bash
# 프론트엔드 시작 (nginx만)
docker-compose up -d

# 프론트엔드 중지
docker-compose down

# 로그 확인
docker-compose logs -f nginx

# 프론트엔드 재시작 (빌드 후)
cd ../src-vite && npm run build
cd ../docker && docker-compose restart nginx

# 컨테이너 상태
docker-compose ps
```

## 문제 해결

### Mixed Content 에러

HTTPS 페이지에서 HTTP AI 서버 호출 시 발생할 수 있습니다.

**해결책**:
1. AI 서버도 HTTPS로 설정
2. 또는 브라우저에서 Mixed Content 허용 (개발용)

### 인증서 경고

자체 서명 인증서 사용 시 브라우저에서 경고가 표시됩니다:

- Chrome: "고급" → "localhost(안전하지 않음)으로 계속"
- Firefox: "위험을 감수하고 계속"

### AI 서버 연결 실패

```bash
# 1. AI 서버 실행 확인
docker ps | grep ojt-local-ai

# 2. 네트워크 연결 확인
curl http://10.10.100.209:8001/health

# 3. 방화벽 확인 (8001 포트)
```

## 프로덕션 배포 체크리스트

- [ ] Let's Encrypt SSL 인증서 적용
- [ ] 방화벽 설정 (8443만 허용)
- [ ] nginx 로그 경로 설정
- [ ] AI 서버 모니터링 설정
- [ ] 백업 전략 수립

## 관련 문서

- [AI 서비스 아키텍처](../docs/AI_ARCHITECTURE.md)
- [Issue #104: WebLLM + Fallback 개선](https://github.com/garimto81/ggp-ojt-v2/issues/104)
