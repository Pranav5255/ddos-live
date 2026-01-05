const fs = require('fs').promises;
const path = require('path');

class Analytics {
  constructor() {
    this.attacks = [];
    this.reportDir = path.join(__dirname, '../../reports');
    this.ensureReportDirectory();
  }

  async ensureReportDirectory() {
    try {
      await fs.mkdir(this.reportDir, { recursive: true });
    } catch (error) {
      console.error('Error creating report directory:', error);
    }
  }

  recordAttack(attack) {
    this.attacks.push({
      ...attack,
      recordedAt: new Date().toISOString()
    });

    // Keep only last 1000 attacks in memory
    if (this.attacks.length > 1000) {
      this.attacks = this.attacks.slice(-1000);
    }
  }

  getStatistics(timeRange = 'all') {
    const now = new Date();
    let filteredAttacks = this.attacks;

    // Filter by time range
    if (timeRange === '1h') {
      const oneHourAgo = new Date(now - 60 * 60 * 1000);
      filteredAttacks = this.attacks.filter(a => new Date(a.timestamp) > oneHourAgo);
    } else if (timeRange === '24h') {
      const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);
      filteredAttacks = this.attacks.filter(a => new Date(a.timestamp) > oneDayAgo);
    }

    // Calculate statistics
    const totalAttacks = filteredAttacks.length;
    
    // Attacks by country
    const byCountry = {};
    filteredAttacks.forEach(attack => {
      const country = attack.source.country;
      byCountry[country] = (byCountry[country] || 0) + 1;
    });

    // Attacks by type
    const byType = {};
    filteredAttacks.forEach(attack => {
      const type = attack.attackInfo.type;
      byType[type] = (byType[type] || 0) + 1;
    });

    // Threat level distribution
    const byThreatLevel = {
      HIGH: filteredAttacks.filter(a => a.threat.threatLevel === 'HIGH').length,
      MEDIUM: filteredAttacks.filter(a => a.threat.threatLevel === 'MEDIUM').length,
      LOW: filteredAttacks.filter(a => a.threat.threatLevel === 'LOW').length,
    };

    // Top targets
    const byTarget = {};
    filteredAttacks.forEach(attack => {
      const target = attack.target.region;
      byTarget[target] = (byTarget[target] || 0) + 1;
    });

    // Average confidence score
    const avgConfidence = filteredAttacks.length > 0
      ? filteredAttacks.reduce((sum, a) => sum + a.threat.ddosConfidence, 0) / filteredAttacks.length
      : 0;

    // Total request rate
    const totalRequestRate = filteredAttacks.reduce((sum, a) => sum + a.attackInfo.requestsPerSecond, 0);

    // Top 10 malicious IPs
    const ipCounts = {};
    filteredAttacks.forEach(attack => {
      const ip = attack.source.ip;
      ipCounts[ip] = (ipCounts[ip] || 0) + 1;
    });

    const topIPs = Object.entries(ipCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([ip, count]) => ({
        ip,
        count,
        attack: filteredAttacks.find(a => a.source.ip === ip)
      }));

    return {
      summary: {
        totalAttacks,
        timeRange,
        avgConfidence: Math.round(avgConfidence),
        totalRequestRate,
        reportGeneratedAt: now.toISOString()
      },
      byCountry: Object.entries(byCountry)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([country, count]) => ({ country, count })),
      byType: Object.entries(byType)
        .sort((a, b) => b[1] - a[1])
        .map(([type, count]) => ({ type, count })),
      byThreatLevel,
      byTarget: Object.entries(byTarget)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([region, count]) => ({ region, count })),
      topIPs,
      recentAttacks: filteredAttacks.slice(-20).reverse()
    };
  }

  async generateJSONReport(timeRange = '24h') {
    const stats = this.getStatistics(timeRange);
    const filename = `ddos-report-${Date.now()}.json`;
    const filepath = path.join(this.reportDir, filename);

    await fs.writeFile(filepath, JSON.stringify(stats, null, 2));
    
    console.log(`📊 JSON Report generated: ${filename}`);
    return { filename, filepath, data: stats };
  }

  async generateCSVReport(timeRange = '24h') {
    const stats = this.getStatistics(timeRange);
    const attacks = stats.recentAttacks;

    // CSV headers
    const headers = [
      'Timestamp',
      'Source IP',
      'Source City',
      'Source Country',
      'ISP',
      'Attack Type',
      'Target Region',
      'Request Rate',
      'DDoS Confidence',
      'Abuse Score',
      'Threat Level'
    ].join(',');

    // CSV rows
    const rows = attacks.map(attack => [
      attack.timestamp,
      attack.source.ip,
      attack.source.city,
      attack.source.country,
      `"${attack.source.isp}"`,
      attack.attackInfo.type,
      attack.target.region,
      attack.attackInfo.requestsPerSecond,
      attack.threat.ddosConfidence,
      attack.threat.abuseScore,
      attack.threat.threatLevel
    ].join(','));

    const csv = [headers, ...rows].join('\n');
    
    const filename = `ddos-attacks-${Date.now()}.csv`;
    const filepath = path.join(this.reportDir, filename);

    await fs.writeFile(filepath, csv);
    
    console.log(`📊 CSV Report generated: ${filename}`);
    return { filename, filepath };
  }

  getRealtimeStats() {
    const last5Minutes = this.attacks.filter(a => {
      const attackTime = new Date(a.timestamp);
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      return attackTime > fiveMinutesAgo;
    });

    return {
      totalAttacks: this.attacks.length,
      last5MinutesAttacks: last5Minutes.length,
      attacksPerMinute: (last5Minutes.length / 5).toFixed(2),
      highThreatActive: this.attacks.filter(a => a.threat.threatLevel === 'HIGH').slice(-10).length
    };
  }
}

module.exports = new Analytics();
