'use client';

import { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ReportPanelProps {
  attacks: any[];
}

export default function ReportPanel({ attacks }: ReportPanelProps) {
  const [stats, setStats] = useState<any>(null);
  const [timeRange, setTimeRange] = useState('24h');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAPIAvailable, setIsAPIAvailable] = useState(false);

  useEffect(() => {
    checkAPIHealth();
  }, []);

  useEffect(() => {
    if (isAPIAvailable) {
      fetchStats();
    }
  }, [timeRange, attacks, isAPIAvailable]);

  const checkAPIHealth = async () => {
    try {
      const response = await fetch('http://localhost:4000/health');
      if (response.ok) {
        setIsAPIAvailable(true);
        setError(null);
      }
    } catch (error) {
      setIsAPIAvailable(false);
      setError('API server not running. Start backend with: npm start');
      console.error('API Health Check Failed:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(`http://localhost:4000/api/reports/stats/${timeRange}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setStats(data);
      setError(null);
    } catch (error) {
      console.error('Error fetching stats:', error);
      setError('Failed to fetch statistics');
      // Use local stats as fallback
      generateLocalStats();
    }
  };

  const generateLocalStats = () => {
    // Fallback: generate stats from local attacks data
    const recentAttacks = attacks.slice(-50);
    
    const byCountry: { [key: string]: number } = {};
    const byType: { [key: string]: number } = {};
    const byThreat = { HIGH: 0, MEDIUM: 0, LOW: 0 };

    recentAttacks.forEach(attack => {
      byCountry[attack.source.country] = (byCountry[attack.source.country] || 0) + 1;
      byType[attack.attackInfo.type] = (byType[attack.attackInfo.type] || 0) + 1;
      byThreat[attack.threat.threatLevel as keyof typeof byThreat]++;
    });

    const localStats = {
      summary: {
        totalAttacks: recentAttacks.length,
        avgConfidence: Math.round(
          recentAttacks.reduce((sum, a) => sum + a.threat.ddosConfidence, 0) / recentAttacks.length
        ),
        totalRequestRate: recentAttacks.reduce((sum, a) => sum + a.attackInfo.requestsPerSecond, 0),
      },
      byCountry: Object.entries(byCountry)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([country, count]) => ({ country, count })),
      byType: Object.entries(byType)
        .sort((a, b) => b[1] - a[1])
        .map(([type, count]) => ({ type, count })),
      byThreatLevel: byThreat,
      recentAttacks: recentAttacks.slice(-20).reverse(),
    };

    setStats(localStats);
  };

  const generatePDFReport = () => {
    if (!stats) return;

    setIsGenerating(true);
    const doc = new jsPDF();

    // Title
    doc.setFontSize(20);
    doc.text('DDoS Attack Report', 14, 22);
    
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);
    doc.text(`Time Range: ${timeRange}`, 14, 36);

    // Summary
    doc.setFontSize(14);
    doc.text('Summary', 14, 46);
    
    autoTable(doc, {
      startY: 50,
      head: [['Metric', 'Value']],
      body: [
        ['Total Attacks', stats.summary.totalAttacks],
        ['Avg DDoS Confidence', `${stats.summary.avgConfidence}%`],
        ['Total Request Rate', `${stats.summary.totalRequestRate.toLocaleString()} req/s`],
        ['High Threats', stats.byThreatLevel.HIGH],
        ['Medium Threats', stats.byThreatLevel.MEDIUM],
        ['Low Threats', stats.byThreatLevel.LOW],
      ],
    });

    // Top Countries
    doc.addPage();
    doc.setFontSize(14);
    doc.text('Top Attack Source Countries', 14, 22);
    
    autoTable(doc, {
      startY: 28,
      head: [['Country', 'Attack Count']],
      body: stats.byCountry.map((item: any) => [item.country, item.count]),
    });

    // Attack Types
    doc.text('Attack Types Distribution', 14, (doc as any).lastAutoTable.finalY + 20);
    
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 25,
      head: [['Attack Type', 'Count']],
      body: stats.byType.map((item: any) => [item.type, item.count]),
    });

    // Recent Attacks
    doc.addPage();
    doc.text('Recent Attacks (Last 20)', 14, 22);
    
    autoTable(doc, {
      startY: 28,
      head: [['Time', 'Source', 'Type', 'Threat']],
      body: stats.recentAttacks.slice(0, 20).map((attack: any) => [
        new Date(attack.timestamp).toLocaleTimeString(),
        `${attack.source.city}, ${attack.source.country}`,
        attack.attackInfo.type,
        attack.threat.threatLevel
      ]),
      styles: { fontSize: 8 },
    });

    // Save PDF
    doc.save(`ddos-report-${Date.now()}.pdf`);
    setIsGenerating(false);
  };

  const exportCSV = () => {
    if (!stats) return;

    const headers = ['Timestamp', 'Source', 'IP', 'Type', 'Target', 'Confidence', 'Threat Level'];
    const rows = stats.recentAttacks.map((attack: any) => [
      attack.timestamp,
      `${attack.source.city}, ${attack.source.country}`,
      attack.source.ip,
      attack.attackInfo.type,
      attack.target.region,
      attack.threat.ddosConfidence,
      attack.threat.threatLevel
    ]);

    const csv = [headers.join(','), ...rows.map((r: any) => r.join(','))].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ddos-attacks-${Date.now()}.csv`;
    a.click();
  };

  const exportJSON = () => {
    if (!stats) return;

    const json = JSON.stringify(stats, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ddos-report-${Date.now()}.json`;
    a.click();
  };

  const generateAIReport = async () => {
    if (!isAPIAvailable) {
      setError('API server is not available. Cannot generate AI report.');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      console.log('🤖 Generating AI Report...');
      
      const response = await fetch('http://localhost:4000/api/reports/generate/ai-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          attacks: attacks.slice(-50), // Send last 50 attacks
          timeRange 
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      // Download as markdown file
      const reportContent = `# DDoS Attack Analysis Report
Generated: ${new Date().toLocaleString()}
Time Range: ${timeRange}
Total Attacks Analyzed: ${data.metadata.totalAttacks || attacks.length}

---

${data.report}

---

**Report Metadata:**
- High Threat Attacks: ${data.metadata.highThreatCount || 0}
- Top Countries: ${data.metadata.topCountries?.join(', ') || 'N/A'}
- Top Attack Types: ${data.metadata.topTypes?.join(', ') || 'N/A'}
- Generated At: ${data.metadata.generatedAt || new Date().toISOString()}
`;

      const blob = new Blob([reportContent], { type: 'text/markdown' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ai-ddos-report-${Date.now()}.md`;
      a.click();
      
      console.log('✅ AI Report generated successfully');
    } catch (error) {
      console.error('Failed to generate AI report:', error);
      setError('Failed to generate AI report. Please check if Gemini API key is configured.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="absolute top-32 left-6 z-20 bg-gray-900/90 backdrop-blur-sm border border-gray-700 rounded-lg p-4 w-80">
      <h3 className="text-white font-bold text-lg mb-3">📊 Analytics & Reports</h3>

      {/* API Status */}
      {error && (
        <div className="mb-3 p-2 bg-yellow-900/50 border border-yellow-600 rounded text-yellow-200 text-xs">
          ⚠️ {error}
          <button 
            onClick={checkAPIHealth}
            className="ml-2 underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Time Range Selector */}
      <div className="mb-4">
        <label className="text-gray-400 text-sm mb-2 block">Time Range:</label>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          className="w-full bg-gray-800 text-white border border-gray-600 rounded px-3 py-2 text-sm"
        >
          <option value="1h">Last Hour</option>
          <option value="24h">Last 24 Hours</option>
          <option value="all">All Time</option>
        </select>
      </div>

      {/* Quick Stats */}
      {stats && (
        <>
          <div className="grid grid-cols-2 gap-2 mb-4">
            <div className="bg-gray-800/50 p-2 rounded">
              <div className="text-gray-400 text-xs">Total Attacks</div>
              <div className="text-white font-bold text-lg">{stats.summary.totalAttacks}</div>
            </div>
            <div className="bg-gray-800/50 p-2 rounded">
              <div className="text-gray-400 text-xs">Avg Confidence</div>
              <div className="text-white font-bold text-lg">{stats.summary.avgConfidence}%</div>
            </div>
          </div>

          {/* Export Buttons */}
          <div className="space-y-2">
            <button
              onClick={generateAIReport}
              disabled={isGenerating || !isAPIAvailable}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-2 px-4 rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? '⏳ Generating AI Report...' : '🤖 Generate AI Report'}
            </button>

            <button
              onClick={generatePDFReport}
              disabled={isGenerating}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded transition disabled:opacity-50"
            >
              {isGenerating ? '⏳ Generating...' : '📄 Generate PDF Report'}
            </button>
            
            <button
              onClick={exportCSV}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded transition"
            >
              📊 Export CSV
            </button>
            
            <button
              onClick={exportJSON}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded transition"
            >
              📋 Export JSON
            </button>
          </div>

          {/* Top Countries Preview */}
          <div className="mt-4 pt-4 border-t border-gray-700">
            <div className="text-gray-400 text-xs mb-2">Top Attack Sources:</div>
            {stats.byCountry.slice(0, 3).map((item: any, idx: number) => (
              <div key={idx} className="flex justify-between text-xs mb-1">
                <span className="text-white">{item.country}</span>
                <span className="text-gray-400">{item.count}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
