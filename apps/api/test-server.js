#!/usr/bin/env node
import express from 'express';
import 'dotenv/config';

const app = express();
const PORT = process.env.PORT || 8080;

// Simple health check - always succeeds
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Test endpoint
app.get('/test', (req, res) => {
  res.json({ message: 'Backend is running!', env: { NODE_ENV: process.env.NODE_ENV, PORT } });
});

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`✓ TEST SERVER running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`MongoDB URI: ${process.env.MONGODB_URI ? '✓ Set' : '✗ Not set'}`);
});

server.on('error', (err) => {
  console.error('Server error:', err);
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
