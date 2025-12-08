# OJT Master - Docker 배포 가이드

Docker Compose를 사용한 로컬 AI 서버 + 프론트엔드 통합 배포 가이드입니다.

## 개요

```
┌─────────────────────────────────────────────────────────────┐
│                    Docker Compose 구조                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Browser ──HTTPS──▶ nginx:443                               │
│                        │                                    │
│                        ├── / ──▶ 정적 파일 (React)           │
│                        │                                    │
│                        └── /api/v1/* ──▶ vLLM:8001          │
│                                          (Local AI)         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 장점

- **Same-Origin**: Mixed Content 문제 없음 (HTTPS → HTTPS)
- **보안**: vLLM이 외부에 직접 노출되지 않음
- **단순화**: 단일 도메인으로 모든 서비스 접근

## 요구사항

- Docker 20.10+
- Docker Compose 2.0+
- NVIDIA GPU + NVIDIA Container Toolkit
- Node.js 18+ (프론트엔드 빌드용)

### NVIDIA Container Toolkit 설치

```bash
# Ubuntu/Debian
distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
curl -s -L https://nvidia.github.io/nvidia-docker/gpgkey | sudo apt-key add -
curl -s -L https://nvidia.github.io/nvidia-docker/$distribution/nvidia-docker.list | \
  sudo tee /etc/apt/sources.list.d/nvidia-docker.list

sudo apt-get update
sudo apt-get install -y nvidia-container-toolkit
sudo systemctl restart docker
```

## 빠른 시작

### 1. SSL 인증서 생성 (자체 서명)

```bash
cd docker

# 자체 서명 인증서 생성
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout ssl/key.pem -out ssl/cert.pem \
  -subj "/CN=localhost"
```

### 2. 환경 변수 설정

```bash
cp .env.docker.example .env.docker
# 필요한 값 수정
```

### 3. 프론트엔드 빌드

```bash
cd ../src-vite

# .env 파일에 Docker용 설정 적용
echo "VITE_LOCAL_AI_URL=/api" >> .env

npm install
npm run build
```

### 4. Docker Compose 실행

```bash
cd ../docker
docker-compose up -d

# 로그 확인
docker-compose logs -f
```

### 5. 접속

- **프론트엔드**: https://localhost (자체 서명 인증서 경고 무시)
- **AI API**: https://localhost/api/v1/chat/completions

## 설정 커스터마이징

### GPU 메모리 부족 시

`docker-compose.yml`에서 vLLM 옵션 조정:

```yaml
command: >
  --model Qwen/Qwen3-4B
  --host 0.0.0.0
  --port 8001
  --max-model-len 4096          # 8192 → 4096
  --gpu-memory-utilization 0.6  # 0.8 → 0.6
```

### 다른 모델 사용

```yaml
command: >
  --model Qwen/Qwen2.5-7B-Instruct  # 더 큰 모델
  # 또는
  --model Qwen/Qwen2.5-1.5B-Instruct  # 더 작은 모델
```

### 외부 접근 허용

1. 방화벽에서 443 포트 오픈
2. Let's Encrypt로 실제 SSL 인증서 발급
3. nginx.conf의 `server_name` 수정

## 문제 해결

### vLLM 컨테이너 시작 실패

```bash
# GPU 확인
docker run --rm --gpus all nvidia/cuda:12.0-base nvidia-smi

# 로그 확인
docker-compose logs vllm
```

### Mixed Content 에러

nginx 프록시를 통해 접근하고 있는지 확인:

```javascript
// 올바른 설정 (.env)
VITE_LOCAL_AI_URL=/api  // Same-Origin

// 잘못된 설정
VITE_LOCAL_AI_URL=http://localhost:8001  // Mixed Content!
```

### 인증서 경고

자체 서명 인증서 사용 시 브라우저에서 경고가 표시됩니다:

- Chrome: "고급" → "localhost(안전하지 않음)으로 계속"
- Firefox: "위험을 감수하고 계속"

프로덕션 환경에서는 Let's Encrypt 사용을 권장합니다.

## 명령어 참조

```bash
# 시작
docker-compose up -d

# 중지
docker-compose down

# 로그 확인
docker-compose logs -f [service_name]

# 재시작
docker-compose restart [service_name]

# 컨테이너 상태
docker-compose ps

# 리소스 사용량
docker stats
```

## 프로덕션 배포 체크리스트

- [ ] Let's Encrypt SSL 인증서 적용
- [ ] 방화벽 설정 (443만 허용)
- [ ] nginx 로그 경로 설정
- [ ] vLLM 모델 최적화
- [ ] 모니터링 설정 (Prometheus, Grafana 등)
- [ ] 백업 전략 수립

## 관련 문서

- [PRD 0007: AI 배포 아키텍처](../tasks/prds/0007-ai-deployment-architecture.md)
- [Issue #104: WebLLM + Fallback 개선](https://github.com/garimto81/ggp-ojt-v2/issues/104)
