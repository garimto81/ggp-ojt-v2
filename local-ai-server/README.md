# OJT Master - 사내 배포 패키지

OJT Master 앱과 AI 서버를 Docker로 사내 배포하기 위한 패키지입니다.

## 아키텍처

```
┌────────────────────────────────────────────────────────────┐
│                    사내 서버 (Docker)                        │
│                                                            │
│   ┌─────────────────────┐    ┌─────────────────────────┐  │
│   │   OJT Master App    │    │   AI Server (vLLM)      │  │
│   │   (React + Nginx)   │───▶│   Qwen3-4B              │  │
│   │   Port: 80          │    │   Port: 8000            │  │
│   └─────────────────────┘    └─────────────────────────┘  │
│                                        │                   │
│                                   ┌────┴────┐             │
│                                   │  GPU    │             │
│                                   │ (NVIDIA)│             │
│                                   └─────────┘             │
└────────────────────────────────────────────────────────────┘
         │
         │ http://<서버IP>/
         ▼
┌─────────────────┐
│  사내 사용자     │
│  (브라우저)      │
└─────────────────┘
```

## 요구사항

| 항목 | 최소 | 권장 |
|------|------|------|
| **OS** | Ubuntu 20.04+ / Windows 11 | Ubuntu 22.04 |
| **Docker** | 24.0+ | 25.0+ |
| **Docker Compose** | v2.0+ | v2.20+ |
| **NVIDIA Driver** | 525+ | 550+ |
| **GPU VRAM** | 4GB | 8GB+ |
| **RAM** | 16GB | 32GB |
| **Storage** | 30GB | 50GB |

## 빠른 시작

### 1. 패키지 복사

```bash
# 방법 1: Git Clone
git clone https://github.com/garimto81/ggp-ojt-v2.git
cd ggp-ojt-v2/local-ai-server

# 방법 2: ZIP 파일 복사 후 압축 해제
unzip local-ai-server.zip
cd local-ai-server
```

### 2. 환경 설정

```bash
# 환경변수 파일 생성
cp .env.example .env

# 필수 값 설정 (편집기로 .env 수정)
nano .env
```

**필수 설정 항목:**
```bash
# Supabase 연결 (Supabase 대시보드에서 확인)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. 서비스 시작

```bash
# 앱 + AI 서버 함께 시작
docker compose up -d

# 빌드 로그 확인
docker compose logs -f
```

### 4. 접속

```
앱:      http://<서버IP>/
AI API:  http://<서버IP>:8000/v1/models
```

## 배포 옵션

### 옵션 1: 앱 + AI 서버 통합 (기본)

```bash
docker compose up -d
```

- `ojt-app`: OJT Master 웹 앱 (포트 80)
- `ojt-local-ai`: AI 서버 (포트 8000)

### 옵션 2: AI 서버만 (앱은 Vercel 사용)

```bash
docker compose up -d vllm
```

- Vercel 배포된 앱에서는 사내 AI 서버 접근 불가
- 로컬 개발 환경에서 `VITE_LOCAL_AI_URL` 설정으로 연결

### 옵션 3: Ollama 사용 (간편 설정)

```bash
docker compose --profile ollama up -d
```

## 파일 구조

```
local-ai-server/
├── docker-compose.yml    # 서비스 정의 (앱 + AI 서버)
├── Dockerfile.app        # OJT Master 앱 이미지
├── Dockerfile            # AI 서버 이미지 (커스텀 시)
├── nginx.conf            # Nginx 설정 (SPA 라우팅)
├── .env.example          # 환경변수 템플릿
├── README.md             # 이 문서
└── scripts/
    ├── start.sh          # Linux 시작 스크립트
    ├── start.ps1         # Windows 시작 스크립트
    ├── stop.sh           # 중지 스크립트
    └── test-api.sh       # API 테스트
```

## 환경변수

| 변수 | 필수 | 기본값 | 설명 |
|------|------|--------|------|
| `VITE_SUPABASE_URL` | ✅ | - | Supabase 프로젝트 URL |
| `VITE_SUPABASE_ANON_KEY` | ✅ | - | Supabase Anon Key |
| `APP_PORT` | - | 80 | 앱 포트 |
| `PORT` | - | 8000 | AI API 포트 |
| `MODEL_NAME` | - | Qwen/Qwen3-4B | AI 모델 |
| `GPU_MEMORY_UTIL` | - | 0.9 | GPU 메모리 사용률 |

## 모델 선택

| 모델 | VRAM | 속도 | 품질 |
|------|------|------|------|
| `Qwen/Qwen3-0.6B` | ~1GB | 매우 빠름 | 낮음 |
| `Qwen/Qwen3-1.7B` | ~2GB | 빠름 | 보통 |
| **`Qwen/Qwen3-4B`** | ~4GB | 보통 | **좋음 (권장)** |
| `Qwen/Qwen3-8B` | ~8GB | 보통 | 우수 |
| `Qwen/Qwen3-14B` | ~14GB | 느림 | 매우 우수 |

모델 변경:
```bash
# .env 수정
MODEL_NAME=Qwen/Qwen3-8B

# 재빌드 및 재시작
docker compose down
docker compose up -d --build
```

## 관리 명령어

```bash
# 상태 확인
docker compose ps

# 로그 보기
docker compose logs -f
docker compose logs -f app      # 앱만
docker compose logs -f vllm     # AI 서버만

# 재시작
docker compose restart

# 중지
docker compose down

# 완전 삭제 (볼륨 포함)
docker compose down -v
```

## 문제 해결

### 앱 빌드 실패

```bash
# 로그 확인
docker compose logs app

# 수동 빌드
docker compose build app --no-cache
```

### AI 서버 시작 느림

첫 실행 시 모델 다운로드에 5-15분 소요됩니다.

```bash
# 다운로드 진행률 확인
docker compose logs -f vllm | grep -i download
```

### GPU 인식 안됨

```bash
# NVIDIA Container Toolkit 확인
nvidia-container-cli info

# Docker GPU 테스트
docker run --rm --gpus all nvidia/cuda:12.1-base-ubuntu22.04 nvidia-smi
```

### 포트 충돌

```bash
# 사용 중인 포트 확인
netstat -tlnp | grep -E '80|8000'

# .env에서 포트 변경
APP_PORT=8080
PORT=8001
```

## 업데이트

```bash
# 최신 코드 가져오기
git pull origin main

# 이미지 재빌드
docker compose build --no-cache

# 재시작
docker compose up -d
```

## 보안 권장사항

1. **방화벽**: 필요한 포트만 개방 (80, 8000)
2. **HTTPS**: 프로덕션에서는 리버스 프록시로 SSL 적용
3. **네트워크 분리**: AI 서버는 내부망에서만 접근 가능하도록 설정

## 라이선스

- OJT Master: MIT
- vLLM: Apache 2.0
- Qwen3: Tongyi Qianwen License
