# OJT Master - Clear Vite Cache Script
# Issue #52: Google login localhost redirect fix
# Usage: .\scripts\clear-cache.ps1

Write-Host "OJT Master - Cache Cleanup" -ForegroundColor Cyan
Write-Host "=========================" -ForegroundColor Cyan

# 1. Remove Vite cache
$viteCache = "node_modules/.vite"
if (Test-Path $viteCache) {
    Remove-Item -Recurse -Force $viteCache
    Write-Host "[OK] Removed $viteCache" -ForegroundColor Green
} else {
    Write-Host "[SKIP] $viteCache not found" -ForegroundColor Yellow
}

# 2. Remove dist folder
$distFolder = "dist"
if (Test-Path $distFolder) {
    Remove-Item -Recurse -Force $distFolder
    Write-Host "[OK] Removed $distFolder" -ForegroundColor Green
} else {
    Write-Host "[SKIP] $distFolder not found" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Cache cleared. Next steps:" -ForegroundColor Cyan
Write-Host "1. Clear browser cache (Ctrl+Shift+Delete)" -ForegroundColor White
Write-Host "2. Restart dev server: npm run dev" -ForegroundColor White
Write-Host "3. Check console for '[Supabase] Connected to:' message" -ForegroundColor White
