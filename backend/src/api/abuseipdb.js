const axios = require('axios');
const NodeCache = require('node-cache');
require('dotenv').config();

// Cache IP lookups for 1 hour to save API calls
const ipCache = new NodeCache({ stdTTL: 3600 });

class AbuseIPDB {
  constructor() {
    this.apiKey = process.env.ABUSEIPDB_API_KEY;
    this.baseUrl = 'https://api.abuseipdb.com/api/v2';
    this.requestCount = 0;
    this.dailyLimit = 1000; // Free tier limit
  }

  async checkIP(ip) {
    // Check cache first
    const cached = ipCache.get(ip);
    if (cached) {
      console.log(`Cache hit for IP: ${ip}`);
      return cached;
    }

    // Check rate limit
    if (this.requestCount >= this.dailyLimit) {
      console.warn('Daily API limit reached, returning default values');
      return this.getDefaultResponse(ip);
    }

    try {
      const response = await axios.get(`${this.baseUrl}/check`, {
        params: {
          ipAddress: ip,
          maxAgeInDays: 90,
          verbose: true
        },
        headers: {
          'Key': this.apiKey,
          'Accept': 'application/json'
        }
      });

      this.requestCount++;
      const data = response.data.data;
      
      const result = {
        ip: data.ipAddress,
        abuseConfidenceScore: data.abuseConfidenceScore,
        countryCode: data.countryCode,
        usageType: data.usageType,
        isp: data.isp,
        domain: data.domain,
        totalReports: data.totalReports,
        lastReportedAt: data.lastReportedAt
      };

      // Cache the result
      ipCache.set(ip, result);
      console.log(`API call for IP: ${ip} - Score: ${result.abuseConfidenceScore}`);
      
      return result;

    } catch (error) {
      console.error(`Error checking IP ${ip}:`, error.message);
      return this.getDefaultResponse(ip);
    }
  }

  async checkBulkIPs(ips) {
    // Check multiple IPs, prioritizing uncached ones
    const results = [];
    
    for (const ip of ips) {
      const result = await this.checkIP(ip);
      results.push(result);
      
      // Add small delay to avoid rate limiting
      await this.sleep(100);
    }
    
    return results;
  }

  getDefaultResponse(ip) {
    return {
      ip: ip,
      abuseConfidenceScore: 0,
      countryCode: 'Unknown',
      usageType: null,
      isp: null,
      domain: null,
      totalReports: 0,
      lastReportedAt: null
    };
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getRemainingCalls() {
    return this.dailyLimit - this.requestCount;
  }

  resetDailyCount() {
    this.requestCount = 0;
    console.log('Daily request count reset');
  }
}

module.exports = new AbuseIPDB();
