@echo off
setlocal enabledelayedexpansion

echo ==========================================================
echo   User Feedback Synthesizer — GitHub Push Helper (Windows)
echo ==========================================================

if "%~1"=="" (
  echo Usage: push-to-github.bat ^<your-github-repo-url^>
  echo Example: push-to-github.bat https://github.com/your-username/user-feedback-synthesizer.git
  exit /b 1
)

set REPO_URL=%~1

if not exist ".git" (
  echo [1/4] Initializing Git repository...
  git init
) else (
  echo [1/4] Git repository already initialized.
)

echo [2/4] Staging project files (excluding .env, node_modules, .venv, data)...
git add .

echo [3/4] Creating commit...
git commit -m "Initial commit: User Feedback Synthesizer (React + Vite + Python FastAPI + Hindsight)"

git branch -M main

git remote remove origin >nul 2>&1
git remote add origin "%REPO_URL%"

echo [4/4] Pushing to GitHub (%REPO_URL%)...
git push -u origin main

echo.
echo Successfully pushed to GitHub: %REPO_URL%
pause
