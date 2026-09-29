#!/usr/bin/env bash
set -e

echo "=========================================================="
echo "  User Feedback Synthesizer — GitHub Push Helper"
echo "=========================================================="

if [ -z "$1" ]; then
  echo "Usage: ./push-to-github.sh <your-github-repo-url>"
  echo "Example: ./push-to-github.sh https://github.com/your-username/user-feedback-synthesizer.git"
  exit 1
fi

REPO_URL="$1"

if [ ! -d ".git" ]; then
  echo "[1/4] Initializing Git repository..."
  git init
else
  echo "[1/4] Git repository already initialized."
fi

echo "[2/4] Staging project files (excluding .env, node_modules, .venv, data)..."
git add .

echo "[3/4] Creating commit..."
git commit -m "Initial commit: User Feedback Synthesizer (React + Vite + Python FastAPI + Hindsight)" || echo "No new changes to commit."

git branch -M main

if git remote | grep -q "^origin$"; then
  git remote set-url origin "$REPO_URL"
else
  git remote add origin "$REPO_URL"
fi

echo "[4/4] Pushing to GitHub ($REPO_URL)..."
git push -u origin main

echo ""
echo "Successfully pushed to GitHub: $REPO_URL"
