#!/bin/bash
set -e
echo "Starting ArogyaFirst API server..."
echo "Node version: $(node --version)"
echo "npm version: $(npm --version)"
echo "Current directory: $(pwd)"
echo "Files in current directory:"
ls -la | head -20

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
  echo "ERROR: node_modules directory not found!"
  ls -la
  exit 1
fi

# Check if src/server.js exists
if [ ! -f "src/server.js" ]; then
  echo "ERROR: src/server.js not found!"
  ls -la src/ || echo "src directory doesn't exist"
  exit 1
fi

echo "Starting server..."
exec node src/server.js
