#!/usr/bin/env node
/**
 * Minimal health check server for EB testing
 * No dependencies, pure Node.js
 */

const http = require('http');
const PORT = process.env.PORT || 8080;

const server = http.createServer((req, res) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  
  if (req.url === '/api/health' || req.url === '/' || req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      service: 'ArogyaFirst API',
      timestamp: new Date().toISOString(),
      port: PORT
    }));
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`✓ MINIMAL HTTP SERVER RUNNING ON PORT ${PORT}`);
  console.log(`✓ Health endpoint: GET /api/health`);
  console.log(`✓ Test: curl http://localhost:${PORT}/api/health`);
});

server.on('error', (err) => {
  console.error('Server error:', err);
  process.exit(1);
});
