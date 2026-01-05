const abuseIPDB = require('../api/abuseipdb');
const geoLocation = require('../api/geolocation');

class DataProcessor {
  constructor() {
    this.processedCount = 0;
  }

  async enrichIP(ip) {
    console.log(`\nEnriching IP: ${ip}`);

    try {
      // Get abuse data and geolocation in parallel
      const [abuseData, geoData] = await Promise.all([
        abuseIPDB.checkIP(ip),
        geoLocation.getCoordinates(ip)
      ]);

      // If geolocation failed but we have country from abuse data, use fallback
      let finalGeoData = geoData;
      if (!geoData.isValid && abuseData.countryCode && abuseData.countryCode !== 'Unknown') {
        finalGeoData = geoLocation.getCountryCenter(abuseData.countryCode);
        finalGeoData.ip = ip;
      }

      // Calculate DDoS confidence score
      const confidenceScore = this.calculateConfidenceScore(abuseData, finalGeoData);

      const enrichedData = {
        ip: ip,
        timestamp: new Date().toISOString(),
        
        // Geolocation data
        location: {
          latitude: finalGeoData.latitude,
          longitude: finalGeoData.longitude,
          city: finalGeoData.city,
          country: finalGeoData.country,
          countryCode: finalGeoData.countryCode,
          isp: finalGeoData.isp || abuseData.isp
        },

        // Abuse data
        abuse: {
          confidenceScore: abuseData.abuseConfidenceScore,
          totalReports: abuseData.totalReports,
          lastReported: abuseData.lastReportedAt,
          usageType: abuseData.usageType
        },

        // ML-calculated DDoS confidence
        ddosConfidence: confidenceScore,
        threatLevel: this.getThreatLevel(confidenceScore),
        
        // Metadata
        isValid: finalGeoData.isValid,
        processedAt: new Date().toISOString()
      };

      this.processedCount++;
      console.log(`✅ Enriched ${ip}: DDoS Confidence ${confidenceScore}% (${enrichedData.threatLevel})`);
      
      return enrichedData;

    } catch (error) {
      console.error(`Error enriching IP ${ip}:`, error.message);
      return this.getDefaultEnrichedData(ip);
    }
  }

  calculateConfidenceScore(abuseData, geoData) {
    // Weighted scoring algorithm for DDoS confidence
    let score = 0;

    // 1. AbuseIPDB confidence (40% weight)
    score += abuseData.abuseConfidenceScore * 0.4;

    // 2. Total reports indicator (20% weight)
    const reportScore = Math.min(abuseData.totalReports * 2, 100); // Cap at 100
    score += reportScore * 0.2;

    // 3. Usage type risk (20% weight)
    const usageRisk = this.getUsageTypeRisk(abuseData.usageType);
    score += usageRisk * 0.2;

    // 4. Geographic risk factor (10% weight)
    const geoRisk = this.getGeographicRisk(geoData.countryCode);
    score += geoRisk * 0.1;

    // 5. Recent activity bonus (10% weight)
    const recencyBonus = this.getRecencyBonus(abuseData.lastReportedAt);
    score += recencyBonus * 0.1;

    // Ensure score is between 0-100
    return Math.min(Math.round(score), 100);
  }

  getUsageTypeRisk(usageType) {
    const riskMap = {
      'Data Center/Web Hosting/Transit': 70,
      'Fixed Line ISP': 30,
      'Mobile ISP': 40,
      'Content Delivery Network': 20,
      'Reserved': 10,
    };
    return riskMap[usageType] || 50; // Default medium risk
  }

  getGeographicRisk(countryCode) {
    // High-risk countries for DDoS (based on common attack sources)
    const highRisk = ['CN', 'RU', 'KP', 'IR', 'VN'];
    const mediumRisk = ['BR', 'IN', 'TR', 'ID', 'UA'];
    
    if (highRisk.includes(countryCode)) return 80;
    if (mediumRisk.includes(countryCode)) return 50;
    return 30; // Low risk
  }

  getRecencyBonus(lastReported) {
    if (!lastReported) return 0;
    
    const reportDate = new Date(lastReported);
    const now = new Date();
    const daysSince = (now - reportDate) / (1000 * 60 * 60 * 24);
    
    if (daysSince < 1) return 100;   // Last 24 hours
    if (daysSince < 7) return 70;    // Last week
    if (daysSince < 30) return 40;   // Last month
    return 10;                        // Older
  }

  getThreatLevel(score) {
    if (score >= 75) return 'HIGH';
    if (score >= 45) return 'MEDIUM';
    return 'LOW';
  }

  getDefaultEnrichedData(ip) {
    return {
      ip: ip,
      timestamp: new Date().toISOString(),
      location: {
        latitude: 0,
        longitude: 0,
        city: 'Unknown',
        country: 'Unknown',
        countryCode: 'XX',
        isp: 'Unknown'
      },
      abuse: {
        confidenceScore: 0,
        totalReports: 0,
        lastReported: null,
        usageType: null
      },
      ddosConfidence: 0,
      threatLevel: 'LOW',
      isValid: false,
      processedAt: new Date().toISOString()
    };
  }

  async processBulkIPs(ips) {
    console.log(`\n📊 Processing ${ips.length} IPs...`);
    const results = [];

    for (const ip of ips) {
      const enriched = await this.enrichIP(ip);
      results.push(enriched);
      
      // Small delay between processing
      await this.sleep(500);
    }

    console.log(`\n✅ Processed ${results.length} IPs`);
    return results;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getStats() {
    return {
      totalProcessed: this.processedCount,
      abuseIPDBRemaining: abuseIPDB.getRemainingCalls()
    };
  }
}

module.exports = new DataProcessor();
