#!/bin/bash
set -e

echo "=== DBEP-Next Codespaces Setup ==="

# Backend setup
echo "--- Installing Python dependencies ---"
cd /workspaces/next/backend
pip install -r requirements.txt --quiet

# Frontend setup
echo "--- Installing Node dependencies ---"
cd /workspaces/next/frontend
npm install --silent

# Copy env templates if .env doesn't exist
cd /workspaces/next
if [ ! -f backend/.env ]; then
  cp backend/.env.example backend/.env
  echo "Created backend/.env from template — fill in SUPABASE credentials"
fi
if [ ! -f frontend/.env.local ]; then
  cp frontend/.env.local.example frontend/.env.local
  echo "Created frontend/.env.local from template — fill in SUPABASE credentials"
fi

echo ""
echo "=== Setup selesai! ==="
echo ""
echo "Langkah berikutnya:"
echo "  1. Edit backend/.env   → isi SUPABASE_URL dan SUPABASE_KEY"
echo "  2. Edit frontend/.env.local → isi NEXT_PUBLIC_SUPABASE_URL dan KEY"
echo "  3. Jalankan database: cd database && psql \$SUPABASE_DB_URL -f migrations/001_ppdm39_schema.sql"
echo "  4. Backend:  cd backend && uvicorn app.main:app --reload"
echo "  5. Frontend: cd frontend && npm run dev"
echo ""
