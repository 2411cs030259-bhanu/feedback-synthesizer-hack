@echo off
setlocal

echo ==========================================================
echo   User Feedback Synthesizer - Local Dev Launcher (Windows)
echo   Frontend: React + Vite (port 3000)
echo   Backend:  Python FastAPI (port 8000)
echo ==========================================================

REM 1. Copy .env files if missing
if not exist "backend\.env" (
    if exist "backend\.env.example" (
        echo [1/4] Creating backend\.env from .env.example...
        copy /Y "backend\.env.example" "backend\.env" >nul
    )
) else (
    echo [1/4] backend\.env ready.
)
if not exist "frontend\.env" (
    if exist "frontend\.env.example" (
        copy /Y "frontend\.env.example" "frontend\.env" >nul
    )
)

REM 2. Create Python venv if missing
if not exist "env1\Scripts\python.exe" (
    echo [2/4] Creating Python virtual environment (env1)...
    python -m venv env1
    call env1\Scripts\pip.exe install -r backend\requirements.txt
) else (
    echo [2/4] Python venv (env1) ready.
)

REM 3. Install frontend deps if missing
if not exist "frontend\node_modules" (
    echo [3/4] Installing frontend npm packages...
    cd frontend
    call npm install
    cd ..
) else (
    echo [3/4] Frontend node_modules ready.
)

REM 4. Start backend in a new window, then start frontend in this window
echo.
echo [4/4] Starting servers...
echo   -^> Backend:      http://localhost:8000
echo   -^> Backend Docs: http://localhost:8000/docs
echo   -^> Frontend:     http://localhost:3000
echo.

start "FastAPI Backend" env1\Scripts\python.exe -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload

timeout /t 2 /nobreak >nul

cd frontend
call npm run dev
cd ..

pause
