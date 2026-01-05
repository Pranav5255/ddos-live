class AttackSimulator {
  constructor() {
    // Real-world malicious IPs from different regions
    this.maliciousIPs = [
      '185.220.101.1',    // Tor exit node
      '45.142.212.61',    // Moldova hosting
      '91.219.236.218',   // Russia
      '103.253.145.28',   // Vietnam
      '118.25.6.39',      // China - Tencent
      '194.26.192.66',    // Netherlands
      '185.220.102.242',  // Tor network
      '176.123.9.82',     // Russia
      '139.162.122.138',  // Singapore
      '121.18.238.104',   // Korea
    ];

    this.attackTypes = [
      'HTTP Flood',
      'SYN Flood', 
      'UDP Flood',
      'DNS Amplification',
      'NTP Amplification',
      'Slowloris',
      'ICMP Flood',
      'ACK Flood'
    ];

    this.targetRegions = [
      'US-EAST',
      'US-WEST', 
      'EU-CENTRAL',
      'ASIA-PACIFIC',
      'EU-WEST'
    ];
  }

  generateAttack() {
    const sourceIP = this.getRandomIP();
    const attackType = this.attackTypes[Math.floor(Math.random() * this.attackTypes.length)];
    const targetRegion = this.targetRegions[Math.floor(Math.random() * this.targetRegions.length)];
    
    return {
      sourceIP: sourceIP,
      attackType: attackType,
      targetRegion: targetRegion,
      timestamp: new Date().toISOString(),
      requestsPerSecond: Math.floor(Math.random() * 50000) + 1000,
      packetSize: Math.floor(Math.random() * 1400) + 100
    };
  }

  getRandomIP() {
    // 70% chance of using known malicious IP, 30% random
    if (Math.random() < 0.7) {
      return this.maliciousIPs[Math.floor(Math.random() * this.maliciousIPs.length)];
    } else {
      // Generate random IP
      return `${this.randomByte()}.${this.randomByte()}.${this.randomByte()}.${this.randomByte()}`;
    }
  }

  randomByte() {
    return Math.floor(Math.random() * 256);
  }

  generateBatch(count = 5) {
    const attacks = [];
    for (let i = 0; i < count; i++) {
      attacks.push(this.generateAttack());
    }
    return attacks;
  }

  async startSimulation(callback, interval = 3000) {
    console.log(`🚀 Starting attack simulation (${interval}ms interval)...\n`);
    
    setInterval(() => {
      const attack = this.generateAttack();
      callback(attack);
    }, interval);
  }
}

module.exports = new AttackSimulator();
