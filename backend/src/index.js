require('dotenv').config();
const express = require('express');
const cors = require('cors');
const WebSocketServer = require('./websocket/server');
const reportsRouter = require('./api/reports');

const PORT = process.env.PORT || 4000;
const WS_PORT = process.env.WS_PORT || 4001;

// Create Express app for API
const app = express();

// Enable CORS for frontend
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

app.use(express.json());

// API routes - THIS IS CRITICAL
app.use('/api/reports', reportsRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({ message: 'API is working!' });
});

// Start HTTP server
app.listen(PORT, () => {
  console.log(`🚀 HTTP API Server started on http://localhost:${PORT}`);
  console.log(`   Available routes:`);
  console.log(`   - GET  /health`);
  console.log(`   - GET  /api/test`);
  console.log(`   - GET  /api/reports/stats/:timeRange`);
  console.log(`   - POST /api/reports/generate/ai-report`);
  console.log(`   - POST /api/reports/analyze-attack`);
});

// Start WebSocket server
const wsServer = new WebSocketServer(WS_PORT);
wsServer.start();

// Stats every 30 seconds
setInterval(() => {
  const stats = wsServer.getStats();
  console.log('\n📊 Server Stats:', stats);
}, 30000);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  process.exit(0);
});

console.log('\n🎯 Live DDoS Attack Map - Backend Ready!');
console.log(`   HTTP API: http://localhost:${PORT}`);
console.log(`   WebSocket: ws://localhost:${WS_PORT}`);
console.log(`   Health Check: http://localhost:${PORT}/health`);
