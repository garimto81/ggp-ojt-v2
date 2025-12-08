# OJT Master - 사내 Docker 배포

Vercel 배포 대신 사내 서버에 Docker로 배포하기 위한 패키지입니다.

## 아키텍처

```
┌─────────────────────────────────────────────────────────┐
│                    사내 네트워크                          │
│                                                         │
│  ┌─────────────────────┐       ┌─────────────────────┐  │
│  │   OJT Master 앱     │       │   AI 서버 (별도)     │  │
│  │   (이 Docker)       │ ───▶  │   vLLM Qwen3-4B     │  │
│  │   Port: 80          │       │   10.10.100.209:8001│  │
│  └─────────────────────┘       └─────────────────────┘  │
│           │                                             │
│           │ Supabase (외부)                              │
│           ▼                                             │
│  ┌─────────────────────┐                               │
│  │   사내 사용자        │                               │
│  │   http://<서버IP>/   │                               │
│  └─────────────────────┘                               │
└─────────────────────────────────────────────────────────┘
```

## 요구사항

| 항목 | 요구사항 |
|------|----------|
| **Docker** | 24.0+ |
| **Docker Compose** | v2.0+ |
| **RAM** | 2GB+ |
| **Storage** | 5GB+ |

> GPU 불필요 (AI 서버는 별도 운영)

## 빠른 시작

### 1. 환경 설정

```bash
cd local-ai-server
cp .env.example .env
```

`.env` 파일 편집:
```bash
# 필수: Supabase 연결 정보
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# 필수: AI 서버 URL (이미 실행 중인 vLLM)
VITE_LOCAL_AI_URL=http://10.10.100.209:8001
```

### 2. 빌드 및 실행

```bash
docker compose up -d --build
```

### 3. 접속

```
http://<서버IP>/
```

## 관리 명령어

```bash
# 상태 확인
docker compose ps

# 로그 보기
docker compose logs -f

# 재시작
docker compose restart

# 중지
docker compose down

# 재빌드 (코드 변경 시)
docker compose up -d --build
```

## 환경변수

| 변수 | 필수 | 기본값 | 설명 |
|------|:----:|--------|------|
| `VITE_SUPABASE_URL` | ✅ | - | Supabase 프로젝트 URL |
| `VITE_SUPABASE_ANON_KEY` | ✅ | - | Supabase Anon Key |
| `VITE_LOCAL_AI_URL` | ✅ | - | 외부 AI 서버 URL |
| `APP_PORT` | - | 80 | 앱 포트 |
| `VITE_R2_WORKER_URL` | - | - | 이미지 업로드 Worker |

## 파일 구조

```
local-ai-server/
├── docker-compose.yml    # Docker 서비스 정의
├── Dockerfile.dev        # 앱 이미지 빌드
├── .env.example          # 환경변수 템플릿
└── README.md             # 이 문서
```

## 문제 해결

### 빌드 실패

```bash
# 캐시 없이 재빌드
docker compose build --no-cache
docker compose up -d
```

### AI 서버 연결 안됨

1. AI 서버 상태 확인:
```bash
curl http://10.10.100.209:8001/health
```

2. `.env`의 `VITE_LOCAL_AI_URL` 확인

3. 네트워크 방화벽 확인

### 포트 충돌

```bash
# 사용 중인 포트 확인
netstat -tlnp | grep 80

# .env에서 포트 변경
APP_PORT=8080
```

## 업데이트

```bash
# 최신 코드 가져오기
git pull origin main

# 재빌드 및 재시작
docker compose up -d --build
```

## 현재 배포 정보

| 항목 | 값 |
|------|-----|
| **앱 URL** | `http://<Docker서버IP>/` |
| **AI 서버** | `http://10.10.100.209:8001` |
| **모델** | `Qwen/Qwen3-4B` |
