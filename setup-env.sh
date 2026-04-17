#!/bin/bash
CODESPACE=${CODESPACE_NAME:-shiny-chainsaw-x5x4qv565xg63v7p7}
API_URL="https://${CODESPACE}-8000.app.github.dev"
echo "API URL: $API_URL"
ENV_FILE="/workspaces/DBEP-Next/frontend/.env.local"
grep -v "NEXT_PUBLIC_API_URL" "$ENV_FILE" > /tmp/env_tmp && mv /tmp/env_tmp "$ENV_FILE"
echo "NEXT_PUBLIC_API_URL=$API_URL" >> "$ENV_FILE"
echo "✅ Done"
cat "$ENV_FILE"
