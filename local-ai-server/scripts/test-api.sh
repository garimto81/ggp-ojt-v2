#!/bin/bash
# OJT Master - Local AI Server API 테스트

set -e

# 기본 URL
BASE_URL="${1:-http://localhost:8000}"

echo "========================================="
echo "  Local AI Server API Test"
echo "  URL: $BASE_URL"
echo "========================================="
echo ""

# 1. 헬스체크
echo "[1/3] 헬스체크..."
if curl -sf "$BASE_URL/health" > /dev/null 2>&1; then
    echo "  ✓ 서버 정상"
else
    echo "  ✗ 서버 응답 없음"
    exit 1
fi

# 2. 모델 목록
echo ""
echo "[2/3] 사용 가능한 모델..."
curl -s "$BASE_URL/v1/models" | python3 -m json.tool 2>/dev/null || \
    curl -s "$BASE_URL/v1/models"

# 3. 채팅 테스트
echo ""
echo "[3/3] 채팅 테스트..."
echo ""

RESPONSE=$(curl -s "$BASE_URL/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "Qwen/Qwen3-4B",
    "messages": [
      {"role": "system", "content": "당신은 OJT 교육 전문가입니다. 간단히 답변하세요."},
      {"role": "user", "content": "OJT가 무엇인가요? 한 문장으로 답해주세요."}
    ],
    "temperature": 0.3,
    "max_tokens": 100
  }')

echo "응답:"
echo "$RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data['choices'][0]['message']['content'])" 2>/dev/null || \
    echo "$RESPONSE"

echo ""
echo "========================================="
echo "  테스트 완료!"
echo "========================================="
