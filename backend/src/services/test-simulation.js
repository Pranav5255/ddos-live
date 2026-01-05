const attackSimulator = require('./attackSimulator');
const dataProcessor = require('./dataProcessor');

async function testSimulation() {
  console.log('🎮 Testing Attack Simulation with Full Pipeline\n');
  console.log('='.repeat(80));

  // Generate initial batch
  console.log('\n📡 Generating 3 simulated attacks...\n');
  const attacks = attackSimulator.generateBatch(3);

  for (const attack of attacks) {
    console.log(`\n🚨 NEW ATTACK DETECTED:`);
    console.log(`   Source IP: ${attack.sourceIP}`);
    console.log(`   Type: ${attack.attackType}`);
    console.log(`   Target: ${attack.targetRegion}`);
    console.log(`   Rate: ${attack.requestsPerSecond.toLocaleString()} req/s`);

    // Process through ML pipeline
    const enriched = await dataProcessor.enrichIP(attack.sourceIP);

    console.log(`\n   📍 Location: ${enriched.location.city}, ${enriched.location.country}`);
    console.log(`   🎯 DDoS Confidence: ${enriched.ddosConfidence}% [${enriched.threatLevel}]`);
    console.log(`   🔍 Abuse Score: ${enriched.abuse.confidenceScore}%`);
    
    console.log('\n' + '-'.repeat(80));
    
    // Delay between processing
    await sleep(1000);
  }

  console.log('\n\n✅ Simulation test complete!');
  console.log(dataProcessor.getStats());
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

testSimulation();
