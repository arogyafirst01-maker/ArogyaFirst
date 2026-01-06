#!/bin/bash

# Install pnpm globally if not present
if ! command -v pnpm &> /dev/null; then
  echo "[$(date)] Installing pnpm..."
  npm install -g pnpm@latest
fi

# Install dependencies
echo "[$(date)] Installing dependencies..."
cd /var/app/current
pnpm install --frozen-lockfile --no-verify

# Start the application
echo "[$(date)] Starting application..."
cd /var/app/current/apps/api
node app-server.js
