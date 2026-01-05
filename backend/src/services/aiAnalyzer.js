const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

class AIAnalyzer {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.-flash' });
    this.analysisCache = new Map();
  }

  async analyzeAttack(attackData) {
    try {
      // Create cache key
      const cacheKey = `${attackData.source.ip}_${attackData.attackInfo.type}`;
      
      // Check cache
      if (this.analysisCache.has(cacheKey)) {
        console.log('🔄 Using cached AI analysis');
        return this.analysisCache.get(cacheKey);
      }

      console.log('🤖 Generating AI analysis for attack...');

      const prompt = this.buildAttackAnalysisPrompt(attackData);
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const analysis = response.text();

      // Parse the structured analysis
      const structuredAnalysis = this.parseAnalysis(analysis);

      // Cache the result (expire after 1 hour)
      this.analysisCache.set(cacheKey, structuredAnalysis);
      setTimeout(() => this.analysisCache.delete(cacheKey), 3600000);

      return structuredAnalysis;

    } catch (error) {
      console.error('Error in AI analysis:', error);
      return this.getDefaultAnalysis(attackData);
    }
  }

  buildAttackAnalysisPrompt(attackData) {
    return `You are a cybersecurity expert analyzing a DDoS attack. Provide a detailed analysis in the following structured format:

ATTACK DETAILS:
- Source: ${attackData.source.city}, ${attackData.source.country} (${attackData.source.ip})
- ISP: ${attackData.source.isp}
- Attack Type: ${attackData.attackInfo.type}
- Target Region: ${attackData.target.region}
- Request Rate: ${attackData.attackInfo.requestsPerSecond.toLocaleString()} req/s
- DDoS Confidence: ${attackData.threat.ddosConfidence}%
- Abuse Score: ${attackData.threat.abuseScore}%
- Threat Level: ${attackData.threat.threatLevel}
- Total Reports: ${attackData.threat.totalReports}
- Timestamp: ${attackData.timestamp}

Provide analysis in EXACTLY this format (use markdown headers):

## Attack Summary
[2-3 sentence overview of the attack]

## Likely Motivation
[Explain why this attack might be happening - consider geopolitical factors, common attack patterns from this region, ISP type, etc.]

## Attack Vector Analysis
[Detailed explanation of the ${attackData.attackInfo.type} attack method and how it works]

## Geographic Context
[Analysis of why attacks from ${attackData.source.country} are significant, common attack sources from this region, infrastructure considerations]

## Threat Assessment
[Based on the ${attackData.threat.threatLevel} threat level and ${attackData.threat.ddosConfidence}% confidence, assess immediate risks]

## Recommended Mitigation
[Specific steps to mitigate this type of attack]

## Risk Indicators
[List 3-5 key risk factors observed in this attack]

Keep each section concise and technical. Focus on actionable intelligence.`;
  }

  parseAnalysis(rawAnalysis) {
    // Parse the markdown-formatted response into structured data
    const sections = {
      summary: '',
      motivation: '',
      vector: '',
      geographic: '',
      assessment: '',
      mitigation: '',
      riskIndicators: []
    };

    try {
      const lines = rawAnalysis.split('\n');
      let currentSection = '';

      for (const line of lines) {
        if (line.startsWith('## Attack Summary')) {
          currentSection = 'summary';
        } else if (line.startsWith('## Likely Motivation')) {
          currentSection = 'motivation';
        } else if (line.startsWith('## Attack Vector Analysis')) {
          currentSection = 'vector';
        } else if (line.startsWith('## Geographic Context')) {
          currentSection = 'geographic';
        } else if (line.startsWith('## Threat Assessment')) {
          currentSection = 'assessment';
        } else if (line.startsWith('## Recommended Mitigation')) {
          currentSection = 'mitigation';
        } else if (line.startsWith('## Risk Indicators')) {
          currentSection = 'indicators';
        } else if (line.trim() && !line.startsWith('##')) {
          if (currentSection === 'indicators') {
            if (line.trim().startsWith('-') || line.trim().startsWith('*')) {
              sections.riskIndicators.push(line.trim().substring(1).trim());
            }
          } else if (currentSection) {
            sections[currentSection] += line + ' ';
          }
        }
      }

      // Clean up sections
      Object.keys(sections).forEach(key => {
        if (typeof sections[key] === 'string') {
          sections[key] = sections[key].trim();
        }
      });

      sections.fullAnalysis = rawAnalysis;

      return sections;

    } catch (error) {
      console.error('Error parsing AI analysis:', error);
      return {
        summary: rawAnalysis.substring(0, 200) + '...',
        fullAnalysis: rawAnalysis,
        motivation: '',
        vector: '',
        geographic: '',
        assessment: '',
        mitigation: '',
        riskIndicators: []
      };
    }
  }

  async generateFullReport(attacks, timeRange = '24h') {
    try {
      console.log('🤖 Generating comprehensive AI report...');

      // Analyze attack patterns
      const countries = {};
      const attackTypes = {};
      let totalRequestRate = 0;
      let highThreatCount = 0;

      attacks.forEach(attack => {
        countries[attack.source.country] = (countries[attack.source.country] || 0) + 1;
        attackTypes[attack.attackInfo.type] = (attackTypes[attack.attackInfo.type] || 0) + 1;
        totalRequestRate += attack.attackInfo.requestsPerSecond;
        if (attack.threat.threatLevel === 'HIGH') highThreatCount++;
      });

      const topCountries = Object.entries(countries)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([country, count]) => `${country} (${count} attacks)`);

      const topTypes = Object.entries(attackTypes)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([type, count]) => `${type} (${count} attacks)`);

      const prompt = `You are a senior cybersecurity analyst preparing an executive report on DDoS attacks.

TIME PERIOD: ${timeRange}
TOTAL ATTACKS: ${attacks.length}
HIGH THREAT ATTACKS: ${highThreatCount}
TOTAL REQUEST RATE: ${totalRequestRate.toLocaleString()} req/s

TOP SOURCE COUNTRIES:
${topCountries.join('\n')}

TOP ATTACK TYPES:
${topTypes.join('\n')}

Generate a comprehensive executive report with these sections:

## Executive Summary
[High-level overview for executives - 3-4 sentences]

## Attack Landscape
[Overall threat environment analysis]

## Geographic Trends
[Analysis of attack sources and patterns]

## Attack Methodology
[Common attack vectors observed]

## Business Impact
[Potential impact on operations and services]

## Strategic Recommendations
[5 key recommendations for leadership]

## Threat Forecast
[Predicted trends and emerging threats]

Keep it professional, concise, and actionable. Use business-friendly language while maintaining technical accuracy.`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      
      return {
        report: response.text(),
        metadata: {
          totalAttacks: attacks.length,
          highThreatCount,
          topCountries: topCountries.slice(0, 3),
          topTypes: topTypes.slice(0, 3),
          generatedAt: new Date().toISOString()
        }
      };

    } catch (error) {
      console.error('Error generating full report:', error);
      return {
        report: 'Unable to generate AI report at this time.',
        metadata: {},
        error: error.message
      };
    }
  }

  getDefaultAnalysis(attackData) {
    return {
      summary: `DDoS attack detected from ${attackData.source.city}, ${attackData.source.country} targeting ${attackData.target.region}.`,
      motivation: 'Analysis unavailable - AI service not responding.',
      vector: `${attackData.attackInfo.type} attack detected.`,
      geographic: `Attack originated from ${attackData.source.country}.`,
      assessment: `Threat level: ${attackData.threat.threatLevel}`,
      mitigation: 'Enable DDoS protection and monitor traffic patterns.',
      riskIndicators: [
        'High request rate detected',
        'Known malicious IP',
        'Suspicious geographic origin'
      ],
      fullAnalysis: 'AI analysis temporarily unavailable.'
    };
  }

  clearCache() {
    this.analysisCache.clear();
    console.log('🧹 AI analysis cache cleared');
  }
}

module.exports = new AIAnalyzer();
