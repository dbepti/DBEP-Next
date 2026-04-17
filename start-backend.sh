#!/bin/bash
cd /workspaces/DBEP-Next/backend
echo "🚀 Starting backend port 8000..."
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
