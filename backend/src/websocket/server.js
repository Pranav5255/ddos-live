const WebSocket = require('ws');
const attackSimulator = require('../services/attackSimulator');
const dataProcessor = require('../services/dataProcessor');
const analytics = require('../services/analytics');
const aiAnalyzer = require('../services/aiAnalyzer');

class WebSocketServer {
  constructor(port = 4001) {
    this.port = port;
    this.wss = null;
    this.clients = new Set();
    this.isSimulating = false;
    this.attackQueue = [];
  }

  start() {
    this.wss = new WebSocket.Server({ port: this.port });

    console.log(`🌐 WebSocket Server started on port ${this.port}`);

    this.wss.on('connection', (ws) => {
      this.handleConnection(ws);
    });

    this.wss.on('error', (error) => {
      console.error('❌ WebSocket Server Error:', error);
    });
  }

  handleConnection(ws) {
    console.log('✅ New client connected');
    this.clients.add(ws);

    // Send welcome message
    this.sendToClient(ws, {
      type: 'connection',
      message: 'Connected to Live DDoS Attack Map',
      timestamp: new Date().toISOString()
    });

    // Start simulation if first client
    if (this.clients.size === 1 && !this.isSimulating) {
      this.startAttackStream();
    }

    ws.on('message', (message) => {
      this.handleMessage(ws, message);
    });

    ws.on('close', () => {
      console.log('❌ Client disconnected');
      this.clients.delete(ws);

      // Stop simulation if no clients
      if (this.clients.size === 0) {
        this.stopAttackStream();
      }
    });

    ws.on('error', (error) => {
      console.error('Client error:', error);
      this.clients.delete(ws);
    });
  }

  handleMessage(ws, message) {
    try {
      const data = JSON.parse(message);
      console.log('📨 Received from client:', data);

      // Handle client commands
      if (data.command === 'start') {
        this.startAttackStream();
      } else if (data.command === 'stop') {
        this.stopAttackStream();
      }
    } catch (error) {
      console.error('Error parsing message:', error);
    }
  }

  startAttackStream() {
    if (this.isSimulating) return;

    console.log('🚀 Starting attack stream...');
    this.isSimulating = true;

    // Generate attack every 3 seconds
    this.simulationInterval = setInterval(async () => {
      await this.processAndBroadcastAttack();
    }, 3000);

    // Send initial batch immediately
    this.processAndBroadcastAttack();
  }

  stopAttackStream() {
    if (!this.isSimulating) return;

    console.log('🛑 Stopping attack stream...');
    this.isSimulating = false;

    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
    }
  }

  async processAndBroadcastAttack() {
    try {
      // Generate simulated attack
      const attack = attackSimulator.generateAttack();
      
      console.log(`\n🚨 Processing attack from ${attack.sourceIP}`);

      // Enrich with ML pipeline
      const enriched = await dataProcessor.enrichIP(attack.sourceIP);

      // Create attack event for frontend
      const attackEvent = {
        type: 'attack',
        id: `attack_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        
        source: {
          ip: enriched.ip,
          latitude: enriched.location.latitude,
          longitude: enriched.location.longitude,
          city: enriched.location.city,
          country: enriched.location.country,
          countryCode: enriched.location.countryCode,
          isp: enriched.location.isp
        },

        target: {
          region: attack.targetRegion,
          // Default target coordinates (US for demo)
          latitude: 37.0902,
          longitude: -95.7129
        },

        attackInfo: {
          type: attack.attackType,
          requestsPerSecond: attack.requestsPerSecond,
          packetSize: attack.packetSize
        },

        threat: {
          ddosConfidence: enriched.ddosConfidence,
          abuseScore: enriched.abuse.confidenceScore,
          threatLevel: enriched.threatLevel,
          totalReports: enriched.abuse.totalReports
        },

        timestamp: new Date().toISOString()
      };

      // Record attack for analytics
      analytics.recordAttack(attackEvent);

      // Broadcast to all connected clients
      this.broadcast(attackEvent);

      console.log(`✅ Broadcasted: ${enriched.location.city}, ${enriched.location.country} → ${attack.targetRegion} (${enriched.ddosConfidence}% confidence)`);

      // Generate AI analysis (async, don't wait for it)
      aiAnalyzer.analyzeAttack(attackEvent).then(analysis => {
        // Send AI analysis as a separate event
        this.broadcast({
          type: 'ai_analysis',
          attackId: attackEvent.id,
          analysis: analysis,
          timestamp: new Date().toISOString()
        });
        
        console.log(`🤖 AI Analysis completed for ${attackEvent.id}`);
      }).catch(err => {
        console.error('AI analysis error:', err);
      });

    } catch (error) {
      console.error('Error processing attack:', error);
    }
  }

  broadcast(data) {
    const message = JSON.stringify(data);
    let sent = 0;

    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
        sent++;
      }
    });

    console.log(`📡 Broadcast to ${sent} client(s)`);
  }

  sendToClient(client, data) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  }

  getStats() {
    return {
      connectedClients: this.clients.size,
      isSimulating: this.isSimulating,
      processedAttacks: dataProcessor.getStats().totalProcessed
    };
  }
}

module.exports = WebSocketServer;
