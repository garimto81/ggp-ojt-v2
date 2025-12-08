# OJT Master - Local AI Server

OJT Master와 연동되는 로컬 AI 서버입니다. Docker 기반으로 별도 장비에서 실행할 수 있습니다.

## 요구사항

| 항목 | 최소 | 권장 |
|------|------|------|
| **OS** | Ubuntu 20.04+ / Windows 11 | Ubuntu 22.04 |
| **Docker** | 24.0+ | 25.0+ |
| **NVIDIA Driver** | 525+ | 550+ |
| **CUDA** | 12.1+ | 12.4+ |
| **GPU VRAM** | 4GB | 8GB+ |
| **RAM** | 16GB | 32GB |
| **Storage** | 20GB | 50GB (모델 캐시) |

## 빠른 시작

### 1. 환경 설정

```bash
# 저장소 클론 또는 이 디렉토리 복사
cd local-ai-server

# 환경변수 설정
cp .env.example .env

# 필요시 .env 파일 수정 (모델, 포트 등)
```

### 2. 서버 실행

```bash
# 옵션 1: vLLM (권장 - 고성능)
docker compose up -d

# 옵션 2: Ollama (간편 설정)
docker compose --profile ollama up -d
```

### 3. 상태 확인

```bash
# 로그 확인
docker compose logs -f

# 헬스체크
curl http://localhost:8000/health
```

### 4. API 테스트

```bash
curl http://localhost:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "Qwen/Qwen3-4B",
    "messages": [{"role": "user", "content": "안녕하세요!"}],
    "temperature": 0.3,
    "max_tokens": 512
  }'
```

## OJT Master 연동

OJT Master 프로젝트의 `.env` 파일에 서버 URL 추가:

```bash
# src-vite/.env
VITE_LOCAL_AI_URL=http://<이 서버 IP>:8000
```

예시:
```bash
VITE_LOCAL_AI_URL=http://192.168.1.100:8000
```

## 모델 선택 가이드

| 모델 | VRAM | 속도 | 품질 | 용도 |
|------|------|------|------|------|
| `Qwen/Qwen3-0.6B` | ~1GB | 매우 빠름 | 낮음 | 테스트용 |
| `Qwen/Qwen3-1.7B` | ~2GB | 빠름 | 보통 | 저사양 서버 |
| **`Qwen/Qwen3-4B`** | ~4GB | 보통 | **좋음** | **권장** |
| `Qwen/Qwen3-8B` | ~8GB | 보통 | 우수 | RTX 3080+ |
| `Qwen/Qwen3-14B` | ~14GB | 느림 | 매우 우수 | RTX 4090 |
| `Qwen/Qwen3-32B` | ~32GB | 느림 | 최고 | A100/H100 |

모델 변경:
```bash
# .env 파일 수정
MODEL_NAME=Qwen/Qwen3-8B

# 재시작
docker compose down && docker compose up -d
```

## 서버 관리

### 시작/중지

```bash
# 시작
docker compose up -d

# 중지
docker compose down

# 재시작
docker compose restart

# 로그 보기
docker compose logs -f
```

### 모델 캐시 관리

```bash
# 캐시 용량 확인
docker volume ls
docker system df

# 캐시 삭제 (모델 재다운로드 필요)
docker volume rm ojt-hf-cache
```

### GPU 사용량 확인

```bash
# NVIDIA SMI
nvidia-smi

# 실시간 모니터링
watch -n 1 nvidia-smi
```

## 문제 해결

### GPU를 인식하지 못함

```bash
# NVIDIA Container Toolkit 설치 확인
nvidia-container-cli info

# Docker GPU 테스트
docker run --rm --gpus all nvidia/cuda:12.1-base-ubuntu22.04 nvidia-smi
```

### Out of Memory (OOM)

```bash
# 더 작은 모델 사용
MODEL_NAME=Qwen/Qwen3-1.7B

# 또는 컨텍스트 길이 줄이기
MAX_MODEL_LEN=4096

# 또는 GPU 메모리 사용률 조정
GPU_MEMORY_UTIL=0.8
```

### 서버 시작이 느림

첫 실행 시 모델 다운로드에 시간이 걸립니다 (Qwen3-4B 기준 약 8GB).

```bash
# 다운로드 진행률 확인
docker compose logs -f | grep -i download
```

### 연결 거부됨

```bash
# 방화벽 확인
sudo ufw allow 8000/tcp

# 또는 Windows
netsh advfirewall firewall add rule name="OJT AI Server" dir=in action=allow protocol=tcp localport=8000
```

## API 엔드포인트

| 엔드포인트 | 메서드 | 설명 |
|-----------|--------|------|
| `/health` | GET | 헬스체크 |
| `/v1/models` | GET | 사용 가능한 모델 목록 |
| `/v1/chat/completions` | POST | 채팅 완성 (OpenAI 호환) |
| `/v1/completions` | POST | 텍스트 완성 |

### 요청 예시

```javascript
// JavaScript/TypeScript
const response = await fetch('http://localhost:8000/v1/chat/completions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: 'Qwen/Qwen3-4B',
    messages: [
      { role: 'system', content: '당신은 OJT 교육 전문가입니다.' },
      { role: 'user', content: '안전 교육에 대해 설명해주세요.' }
    ],
    temperature: 0.3,
    max_tokens: 1024
  })
});

const data = await response.json();
console.log(data.choices[0].message.content);
```

## 아키텍처

```
┌─────────────────────────────────────────────────────────┐
│                    OJT Master (브라우저)                   │
│  ┌─────────────────────────────────────────────────────┐ │
│  │                   contentGenerator.js                │ │
│  │  1순위: Local AI → 2순위: WebLLM → 3순위: Fallback  │ │
│  └──────────────────────────┬──────────────────────────┘ │
└─────────────────────────────┼───────────────────────────┘
                              │ HTTP (OpenAI API)
                              ▼
┌─────────────────────────────────────────────────────────┐
│              Local AI Server (이 패키지)                  │
│  ┌─────────────────────────────────────────────────────┐ │
│  │          Docker Container (vLLM/Ollama)             │ │
│  │  ┌─────────────────────────────────────────────────┐│ │
│  │  │              Qwen3-4B Model                     ││ │
│  │  │              (GPU Accelerated)                  ││ │
│  │  └─────────────────────────────────────────────────┘│ │
│  └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## 라이선스

이 패키지는 OJT Master 프로젝트의 일부입니다.

- vLLM: Apache 2.0
- Ollama: MIT
- Qwen3: Tongyi Qianwen License
