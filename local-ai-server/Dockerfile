# OJT Master - Local AI Server (Qwen3)
# Docker 기반 로컬 LLM 서버 (OpenAI 호환 API)

FROM vllm/vllm-openai:latest

# 환경 변수
ENV MODEL_NAME="Qwen/Qwen3-4B"
ENV MAX_MODEL_LEN=8192
ENV GPU_MEMORY_UTILIZATION=0.9
ENV HOST=0.0.0.0
ENV PORT=8000

# 헬스체크
HEALTHCHECK --interval=30s --timeout=10s --start-period=120s --retries=3 \
    CMD curl -f http://localhost:${PORT}/health || exit 1

# 포트 노출
EXPOSE ${PORT}

# 시작 명령
CMD python -m vllm.entrypoints.openai.api_server \
    --model ${MODEL_NAME} \
    --host ${HOST} \
    --port ${PORT} \
    --max-model-len ${MAX_MODEL_LEN} \
    --gpu-memory-utilization ${GPU_MEMORY_UTILIZATION} \
    --trust-remote-code
