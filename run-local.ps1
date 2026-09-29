Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  User Feedback Synthesizer — Local Dev Launcher" -ForegroundColor Cyan
Write-Host "  Frontend: React + Vite (port 3000)" -ForegroundColor Cyan
Write-Host "  Backend:  Python FastAPI (port 8000)" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$RootPath = Split-Path -Parent $MyInvocation.MyCommand.Path

# ── 1. Copy .env if missing ───────────────────────────────────────────────────
if (-not (Test-Path "$RootPath\backend\.env") -and (Test-Path "$RootPath\backend\.env.example")) {
    Write-Host "`n[1/4] Creating backend/.env from .env.example..." -ForegroundColor Yellow
    Copy-Item "$RootPath\backend\.env.example" "$RootPath\backend\.env"
} else {
    Write-Host "`n[1/4] backend/.env ready." -ForegroundColor Green
}
if (-not (Test-Path "$RootPath\frontend\.env") -and (Test-Path "$RootPath\frontend\.env.example")) {
    Copy-Item "$RootPath\frontend\.env.example" "$RootPath\frontend\.env"
}

# ── 2. Python virtual environment ─────────────────────────────────────────────
$VenvPython = "$RootPath\env1\Scripts\python.exe"
if (-not (Test-Path $VenvPython)) {
    Write-Host "`n[2/4] Creating Python virtual environment (env1)..." -ForegroundColor Yellow
    python -m venv "$RootPath\env1"
    & "$RootPath\env1\Scripts\pip.exe" install -r "$RootPath\backend\requirements.txt"
} else {
    Write-Host "`n[2/4] Python venv (env1) ready." -ForegroundColor Green
}

# ── 3. Frontend npm install ────────────────────────────────────────────────────
if (-not (Test-Path "$RootPath\frontend\node_modules")) {
    Write-Host "`n[3/4] Installing frontend npm packages..." -ForegroundColor Yellow
    Push-Location "$RootPath\frontend"
    npm install
    Pop-Location
} else {
    Write-Host "`n[3/4] Frontend node_modules ready." -ForegroundColor Green
}

# ── 4. Start both servers ──────────────────────────────────────────────────────
Write-Host "`n[4/4] Starting servers..." -ForegroundColor Cyan
Write-Host "  -> Backend:  http://localhost:8000" -ForegroundColor Green
Write-Host "  -> Backend Docs: http://localhost:8000/docs" -ForegroundColor Green
Write-Host "  -> Frontend: http://localhost:3000" -ForegroundColor Green
Write-Host ""

# Start Python FastAPI backend in a new window
$BackendProcess = Start-Process -FilePath $VenvPython `
    -ArgumentList "-m", "uvicorn", "backend.main:app", "--host", "127.0.0.1", "--port", "8000", "--reload" `
    -WorkingDirectory $RootPath `
    -PassThru

Start-Sleep -Seconds 2

# Start Vite frontend dev server
Push-Location "$RootPath\frontend"
npm run dev
Pop-Location

# Cleanup on exit
if ($BackendProcess -and -not $BackendProcess.HasExited) {
    Stop-Process -Id $BackendProcess.Id -Force -ErrorAction SilentlyContinue
}
