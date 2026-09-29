#!/usr/bin/env bash
set -e

echo "=========================================================="
echo "  User Feedback Synthesizer — Localhost Launcher (macOS/Linux)"
echo "  Stack: React + Vite + TypeScript + Python FastAPI + Hindsight"
echo "=========================================================="

# 1. Create .env from .env.example if not present
if [ ! -f ".env" ] && [ -f ".env.example" ]; then
  echo "[1/4] Creating .env from .env.example..."
  cp .env.example .env
else
  echo "[1/4] .env configuration ready."
fi

# 2. Setup Python venv & install FastAPI backend dependencies
PYTHON_CMD="python3"
if ! command -v python3 >/dev/null 2>&1; then
  PYTHON_CMD="python"
fi

if [ ! -d ".venv" ]; then
  echo "[2/4] Creating Python virtual environment (.venv)..."
  $PYTHON_CMD -m venv .venv
fi

echo "[3/4] Installing Python FastAPI dependencies into .venv..."
.venv/bin/pip install --upgrade pip >/dev/null 2>&1 || true
.venv/bin/pip install -r backend/requirements.txt

# 3. Install Frontend npm packages if needed
if [ ! -d "node_modules" ]; then
  echo "[4/4] Installing frontend npm dependencies..."
  npm install
else
  echo "[4/4] Frontend node_modules ready."
fi

echo ""
echo "Starting application on localhost..."
echo "  -> Frontend UI:        http://localhost:3000"
echo "  -> FastAPI Backend:    http://localhost:8000"
echo "  -> FastAPI Swagger UI: http://localhost:8000/docs"
echo ""

npm run dev
