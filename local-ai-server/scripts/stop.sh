#!/bin/bash
# OJT Master - Local AI Server 중지 스크립트

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

echo "Local AI Server 중지 중..."

# 모든 서비스 중지
docker compose --profile ollama down 2>/dev/null || true
docker compose down 2>/dev/null || true

echo "✓ 서버가 중지되었습니다."
