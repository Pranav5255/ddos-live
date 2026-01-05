const abuseIPDB = require('./abuseipdb');

async function testAbuseIPDB() {
  console.log('Testing AbuseIPDB API...\n');

  // Test with known malicious IPs
  const testIPs = [
    '118.25.6.39',      // Known malicious
    '8.8.8.8',          // Google DNS (clean)
    '1.1.1.1'           // Cloudflare DNS (clean)
  ];

  for (const ip of testIPs) {
    console.log(`\nChecking IP: ${ip}`);
    const result = await abuseIPDB.checkIP(ip);
    console.log(JSON.stringify(result, null, 2));
  }

  console.log(`\nRemaining API calls: ${abuseIPDB.getRemainingCalls()}`);
}

testAbuseIPDB();
