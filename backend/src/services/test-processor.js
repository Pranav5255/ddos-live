const dataProcessor = require('./dataProcessor');

async function testProcessor() {
  console.log('🧪 Testing Data Processor with ML Scoring...\n');

  const testIPs = [
    '118.25.6.39',      // China - should have higher score
    '8.8.8.8',          // Google - should be low
    '45.142.212.61',    // Known bad IP
    '1.1.1.1'           // Cloudflare - should be low
  ];

  const results = await dataProcessor.processBulkIPs(testIPs);

  console.log('\n\n📊 FINAL RESULTS:');
  console.log('='.repeat(80));
  
  results.forEach(result => {
    console.log(`\nIP: ${result.ip}`);
    console.log(`Location: ${result.location.city}, ${result.location.country}`);
    console.log(`Coordinates: (${result.location.latitude}, ${result.location.longitude})`);
    console.log(`Abuse Score: ${result.abuse.confidenceScore}%`);
    console.log(`DDoS Confidence: ${result.ddosConfidence}% [${result.threatLevel}]`);
    console.log(`ISP: ${result.location.isp}`);
  });

  console.log('\n\n📈 Processing Stats:');
  console.log(dataProcessor.getStats());
}

testProcessor();
