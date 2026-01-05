'use client';

import { useWebSocket } from './hooks/useWebSocket';
import Globe from './components/Globe';
import ReportPanel from './components/ReportPanel';

export default function Home() {
  const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:4001';
  const { attacks, isConnected, stats } = useWebSocket(WS_URL);

  return (
    <main className="relative min-h-screen bg-black overflow-hidden">
      {/* Globe */}
      <Globe attacks={attacks} />

      {/* HUD Overlay */}
      <div className="absolute top-0 left-0 right-0 p-6 z-10">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-bold text-white mb-2">
            Live DDoS Attack Map
          </h1>
          <div className="flex gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div
                className={`w-3 h-3 rounded-full ${
                  isConnected ? 'bg-green-500' : 'bg-red-500'
                }`}
              />
              <span className="text-gray-400">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            <span className="text-gray-400">
              Total Attacks: <span className="text-white font-bold">{stats.totalAttacks}</span>
            </span>
            <span className="text-gray-400">
              Active: <span className="text-white font-bold">{attacks.length}</span>
            </span>
          </div>
        </div>
      </div>

      <ReportPanel attacks={attacks} />

      {/* Recent Attacks List */}
      <div className="absolute bottom-0 right-0 p-6 z-10 max-w-md">
        <div className="bg-gray-900/80 backdrop-blur-sm rounded-lg p-4 max-h-96 overflow-y-auto">
          <h2 className="text-xl font-bold text-white mb-3">Recent Attacks</h2>
          {attacks.slice(-5).reverse().map((attack) => (
            <div key={attack.id} className="mb-3 pb-3 border-b border-gray-700 last:border-0">
              <div className="flex justify-between items-start mb-1">
                <span className="text-sm font-semibold text-white">
                  {attack.source.city}, {attack.source.country}
                </span>
                <span
                  className={`text-xs px-2 py-1 rounded ${
                    attack.threat.threatLevel === 'HIGH'
                      ? 'bg-red-500/20 text-red-400'
                      : attack.threat.threatLevel === 'MEDIUM'
                      ? 'bg-yellow-500/20 text-yellow-400'
                      : 'bg-green-500/20 text-green-400'
                  }`}
                >
                  {attack.threat.ddosConfidence}%
                </span>
              </div>
              <div className="text-xs text-gray-400">
                {attack.attackInfo.type} • {attack.threat.threatLevel}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
