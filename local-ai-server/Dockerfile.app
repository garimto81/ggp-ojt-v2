# OJT Master - Web Application (React + Vite)
# 사내 배포용 Docker 이미지

# === Build Stage ===
FROM node:20-alpine AS builder

WORKDIR /app

# 패키지 파일 복사
COPY src-vite/package*.json ./

# 의존성 설치
RUN npm ci --only=production=false

# 소스 복사
COPY src-vite/ ./

# 환경변수 (빌드 시 주입)
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_LOCAL_AI_URL
ARG VITE_R2_WORKER_URL

# 빌드
RUN npm run build

# === Production Stage ===
FROM nginx:alpine

# nginx 설정
COPY local-ai-server/nginx.conf /etc/nginx/conf.d/default.conf

# 빌드 결과물 복사
COPY --from=builder /app/dist /usr/share/nginx/html

# 헬스체크
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost/ || exit 1

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
