import "dotenv/config";
import http from 'http';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { WebSocketServer } = require('ws');
import type { WebSocket as WS } from 'ws';

import app from './app.js';
import prisma from './config/prisma.js';

const PORT = process.env.PORT || 5000;

// 1. Create HTTP Server
const server = http.createServer(app);

// 2. Create WebSocket Server
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws: WS) => {
  console.log('📡 New WebSocket client connected');
  
  ws.on('message', (message) => {
    console.log(`📩 Message received: ${message}`);
    // Echo for now
    ws.send(JSON.stringify({ type: 'ACK', ts: Date.now() }));
  });

  ws.on('close', () => {
    console.log('📡 WebSocket client disconnected');
  });
});

async function main() {
  try {
    // Verify database connection
    await prisma.$connect();
    console.log('✅ Connected to Database via Prisma');

    // Start Server
    server.listen(Number(PORT), '0.0.0.0', () => {
      console.log(`🚀 Server is running on http://0.0.0.0:${PORT}`);
      console.log(`📡 WebSocket: ws://0.0.0.0:${PORT}/ws`);
      console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (err) {
    console.error('❌ Database connection error:', err);
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

// Graceful shutdown
const gracefulShutdown = async () => {
  await prisma.$disconnect();
  console.log('📡 Database disconnected');
  process.exit(0);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Handle unhandled promise rejections
process.on('unhandledRejection', (err: Error) => {
  console.error(`Error: ${err.message}`);
  // Close server & exit process
  process.exit(1);
});
