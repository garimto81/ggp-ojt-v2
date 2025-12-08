# OJT Master - Local AI Server 시작 스크립트 (Windows PowerShell)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectDir = Split-Path -Parent $ScriptDir

Set-Location $ProjectDir

Write-Host "========================================" -ForegroundColor Green
Write-Host "  OJT Master - Local AI Server" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# .env 파일 확인
if (-not (Test-Path ".env")) {
    Write-Host "[!] .env 파일이 없습니다. .env.example에서 복사합니다..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
    Write-Host "[✓] .env 파일 생성 완료" -ForegroundColor Green
}

# Docker 확인
try {
    docker --version | Out-Null
    Write-Host "[✓] Docker 확인됨" -ForegroundColor Green
} catch {
    Write-Host "[✗] Docker가 설치되어 있지 않습니다." -ForegroundColor Red
    Write-Host "    https://docs.docker.com/desktop/install/windows-install/ 참조"
    exit 1
}

# NVIDIA GPU 확인
try {
    $gpuInfo = nvidia-smi --query-gpu=name,memory.total --format=csv,noheader 2>$null
    Write-Host "[✓] NVIDIA GPU 감지됨" -ForegroundColor Green
    Write-Host "    $gpuInfo"
} catch {
    Write-Host "[!] NVIDIA GPU를 찾을 수 없습니다. CPU 모드로 실행됩니다 (느림)." -ForegroundColor Yellow
}

Write-Host ""

# 옵션 선택
Write-Host "실행 모드를 선택하세요:"
Write-Host "  1) vLLM (권장 - 고성능)"
Write-Host "  2) Ollama (간편 설정)"
Write-Host ""
$choice = Read-Host "선택 [1/2]"

switch ($choice) {
    "2" {
        Write-Host "[*] Ollama 모드로 시작합니다..." -ForegroundColor Green
        docker compose --profile ollama up -d
        Write-Host ""
        Write-Host "[✓] 서버 시작 완료!" -ForegroundColor Green
        Write-Host ""
        Write-Host "API 엔드포인트: http://localhost:11434"
        Write-Host "OJT Master 설정: VITE_LOCAL_AI_URL=http://<서버IP>:11434"
    }
    default {
        Write-Host "[*] vLLM 모드로 시작합니다..." -ForegroundColor Green
        docker compose up -d
        Write-Host ""
        Write-Host "[✓] 서버 시작 완료!" -ForegroundColor Green
        Write-Host ""
        Write-Host "API 엔드포인트: http://localhost:8000"
        Write-Host "OJT Master 설정: VITE_LOCAL_AI_URL=http://<서버IP>:8000"
    }
}

Write-Host ""
Write-Host "모델 로딩에 1-5분 정도 소요될 수 있습니다."
Write-Host "로그 확인: docker compose logs -f"
