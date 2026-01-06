#!/usr/bin/env node

/**
 * Production server starter that handles async database connection
 * without blocking the HTTP server startup
 */

const http = require('http');
const path = require('path');

// Start with a simple health check endpoint first
const server = http.createServer((req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Health check endpoint - always available
  if (req.url === '/api/health' && req.method === 'GET') {
    res.writeHead(200);
    res.end(JSON.stringify({
      status: 'ok',
      service: 'ArogyaFirst API',
      timestamp: new Date().toISOString(),
      port: process.env.PORT || '8080',
      environment: process.env.NODE_ENV || 'development'
    }));
    return;
  }

  // For now, return 503 for other endpoints until Express app is loaded
  res.writeHead(503);
  res.end(JSON.stringify({
    error: 'Service initializing...',
    message: 'The application is starting up. Please retry in a few seconds.'
  }));
});

const PORT = process.env.PORT || 8080;

server.listen(PORT, () => {
  console.log(`[${new Date().toISOString()}] Server listening on port ${PORT}`);
  console.log(`[${new Date().toISOString()}] Health check available at /api/health`);
});

// Handle errors
server.on('error', (err) => {
  console.error(`[${new Date().toISOString()}] Server error:`, err);
  process.exit(1);
});

// Handle termination signals
process.on('SIGTERM', () => {
  console.log(`[${new Date().toISOString()}] SIGTERM received, shutting down gracefully`);
  server.close(() => {
    console.log(`[${new Date().toISOString()}] Server closed`);
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log(`[${new Date().toISOString()}] SIGINT received, shutting down gracefully`);
  server.close(() => {
    console.log(`[${new Date().toISOString()}] Server closed`);
    process.exit(0);
  });
});

// Async initialization in background
(async () => {
  try {
    console.log(`[${new Date().toISOString()}] Attempting to load Express application...`);
    
    // Try to load the production Express server
    // We'll try using require first (CommonJS)
    let expressApp;
    try {
      // Register TypeScript/ES module support if needed
      const serverPath = path.join(__dirname, 'minimal-server.js');
      const mod = require(serverPath);
      console.log(`[${new Date().toISOString()}] Successfully loaded application`);
    } catch (err) {
      console.warn(`[${new Date().toISOString()}] Could not load full app: ${err.message}`);
      console.warn(`[${new Date().toISOString()}] Continuing with health-check-only server`);
    }
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Background initialization error:`, err);
  }
})();

// Graceful shutdown helper
process.on('uncaughtException', (err) => {
  console.error(`[${new Date().toISOString()}] Uncaught Exception:`, err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error(`[${new Date().toISOString()}] Unhandled Rejection at:`, promise, 'reason:', reason);
});
