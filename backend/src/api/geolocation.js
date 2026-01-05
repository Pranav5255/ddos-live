const axios = require('axios');
const NodeCache = require('node-cache');

// Cache geolocation lookups for 24 hours
const geoCache = new NodeCache({ stdTTL: 86400 });

class GeoLocation {
  constructor() {
    // Using ip-api.com - completely free, no key required (45 requests/minute)
    this.baseUrl = 'http://ip-api.com/json';
  }

  async getCoordinates(ip) {
    // Check cache first
    const cached = geoCache.get(ip);
    if (cached) {
      console.log(`Geo cache hit for IP: ${ip}`);
      return cached;
    }

    try {
      const response = await axios.get(`${this.baseUrl}/${ip}`, {
        params: {
          fields: 'status,message,country,countryCode,city,lat,lon,isp,org,as,query'
        }
      });

      const data = response.data;
      
      if (data.status === 'fail') {
        console.error(`Geolocation failed for ${ip}: ${data.message}`);
        return this.getDefaultLocation(ip);
      }

      const result = {
        ip: data.query,
        latitude: data.lat || 0,
        longitude: data.lon || 0,
        city: data.city || 'Unknown',
        country: data.country || 'Unknown',
        countryCode: data.countryCode || 'XX',
        isp: data.isp || 'Unknown',
        isValid: data.lat !== undefined && data.lon !== undefined
      };

      // Cache the result
      if (result.isValid) {
        geoCache.set(ip, result);
        console.log(`Geolocation for ${ip}: ${result.city}, ${result.country} (${result.latitude}, ${result.longitude})`);
      }
      
      return result;

    } catch (error) {
      console.error(`Error getting geolocation for ${ip}:`, error.message);
      return this.getDefaultLocation(ip);
    }
  }

  async getCoordinatesWithFallback(ip, countryCode = null) {
    // Try full geolocation first
    let result = await this.getCoordinates(ip);
    
    // If failed and we have country code, use country center coordinates
    if (!result.isValid && countryCode) {
      result = this.getCountryCenter(countryCode);
      result.ip = ip;
    }
    
    return result;
  }

  getCountryCenter(countryCode) {
    // Common country centers for quick fallback
    const countryCenters = {
      'US': { latitude: 37.0902, longitude: -95.7129, country: 'United States' },
      'CN': { latitude: 35.8617, longitude: 104.1954, country: 'China' },
      'RU': { latitude: 61.5240, longitude: 105.3188, country: 'Russia' },
      'IN': { latitude: 20.5937, longitude: 78.9629, country: 'India' },
      'GB': { latitude: 55.3781, longitude: -3.4360, country: 'United Kingdom' },
      'DE': { latitude: 51.1657, longitude: 10.4515, country: 'Germany' },
      'FR': { latitude: 46.2276, longitude: 2.2137, country: 'France' },
      'BR': { latitude: -14.2350, longitude: -51.9253, country: 'Brazil' },
      'JP': { latitude: 36.2048, longitude: 138.2529, country: 'Japan' },
      'KR': { latitude: 35.9078, longitude: 127.7669, country: 'South Korea' },
      'CA': { latitude: 56.1304, longitude: -106.3468, country: 'Canada' },
      'AU': { latitude: -25.2744, longitude: 133.7751, country: 'Australia' },
      'HK': { latitude: 22.3193, longitude: 114.1694, country: 'Hong Kong' },
    };

    const center = countryCenters[countryCode] || { latitude: 0, longitude: 0, country: 'Unknown' };
    
    return {
      latitude: center.latitude,
      longitude: center.longitude,
      city: 'Unknown',
      country: center.country,
      countryCode: countryCode,
      isValid: true
    };
  }

  getDefaultLocation(ip) {
    return {
      ip: ip,
      latitude: 0,
      longitude: 0,
      city: 'Unknown',
      country: 'Unknown',
      countryCode: 'XX',
      isValid: false
    };
  }

  async getBulkCoordinates(ips) {
    const results = [];
    
    for (const ip of ips) {
      const result = await this.getCoordinates(ip);
      results.push(result);
      
      // Small delay to respect rate limit (45 req/min = ~1.3 sec between requests)
      await this.sleep(1400);
    }
    
    return results;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = new GeoLocation();
