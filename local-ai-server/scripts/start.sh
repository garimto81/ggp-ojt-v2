#!/bin/bash
# OJT Master - Local AI Server 시작 스크립트

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  OJT Master - Local AI Server${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# .env 파일 확인
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}[!] .env 파일이 없습니다. .env.example에서 복사합니다...${NC}"
    cp .env.example .env
    echo -e "${GREEN}[✓] .env 파일 생성 완료${NC}"
fi

# Docker 확인
if ! command -v docker &> /dev/null; then
    echo -e "${RED}[✗] Docker가 설치되어 있지 않습니다.${NC}"
    echo "    https://docs.docker.com/engine/install/ 참조"
    exit 1
fi

# Docker Compose 확인
if ! docker compose version &> /dev/null; then
    echo -e "${RED}[✗] Docker Compose가 설치되어 있지 않습니다.${NC}"
    exit 1
fi

# NVIDIA GPU 확인
if command -v nvidia-smi &> /dev/null; then
    echo -e "${GREEN}[✓] NVIDIA GPU 감지됨${NC}"
    nvidia-smi --query-gpu=name,memory.total --format=csv,noheader
else
    echo -e "${YELLOW}[!] NVIDIA GPU를 찾을 수 없습니다. CPU 모드로 실행됩니다 (느림).${NC}"
fi

echo ""

# 옵션 선택
echo "실행 모드를 선택하세요:"
echo "  1) vLLM (권장 - 고성능)"
echo "  2) Ollama (간편 설정)"
echo ""
read -p "선택 [1/2]: " choice

case $choice in
    2)
        echo -e "${GREEN}[*] Ollama 모드로 시작합니다...${NC}"
        docker compose --profile ollama up -d
        echo ""
        echo -e "${GREEN}[✓] 서버 시작 완료!${NC}"
        echo ""
        echo "API 엔드포인트: http://localhost:11434"
        echo "OJT Master 설정: VITE_LOCAL_AI_URL=http://<서버IP>:11434"
        ;;
    *)
        echo -e "${GREEN}[*] vLLM 모드로 시작합니다...${NC}"
        docker compose up -d
        echo ""
        echo -e "${GREEN}[✓] 서버 시작 완료!${NC}"
        echo ""
        echo "API 엔드포인트: http://localhost:8000"
        echo "OJT Master 설정: VITE_LOCAL_AI_URL=http://<서버IP>:8000"
        ;;
esac

echo ""
echo "모델 로딩에 1-5분 정도 소요될 수 있습니다."
echo "로그 확인: docker compose logs -f"
