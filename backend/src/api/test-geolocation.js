const geoLocation = require('./geolocation');

async function testGeolocation() {
  console.log('Testing Geolocation API...\n');

  const testIPs = [
    '8.8.8.8',          // Google US
    '1.1.1.1',          // Cloudflare
    '118.25.6.39',      // China
    '13.107.21.200'     // Microsoft
  ];

  for (const ip of testIPs) {
    console.log(`\nGetting location for: ${ip}`);
    const result = await geoLocation.getCoordinates(ip);
    console.log(JSON.stringify(result, null, 2));
  }

  console.log('\n\nTesting country center fallback:');
  const fallback = geoLocation.getCountryCenter('US');
  console.log(JSON.stringify(fallback, null, 2));
}

testGeolocation();
