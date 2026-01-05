'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import AIReportModal from './AIReportModal';

// Dynamically import Globe to avoid SSR issues
const GlobeComponent = dynamic(() => import('react-globe.gl'), { ssr: false });

interface Attack {
  id: string;
  source: {
    ip: string;
    latitude: number;
    longitude: number;
    city: string;
    country: string;
    countryCode: string;
    isp: string;
  };
  target: {
    latitude: number;
    longitude: number;
    region: string;
  };
  threat: {
    ddosConfidence: number;
    abuseScore: number;
    threatLevel: string;
    totalReports: number;
  };
  attackInfo: {
    type: string;
    requestsPerSecond: number;
  };
  timestamp: string;
}

interface GlobeProps {
  attacks: Attack[];
}

interface TooltipData {
  attack: Attack;
  x: number;
  y: number;
}

export default function Globe({ attacks }: GlobeProps) {
  const globeRef = useRef<any>(null);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [selectedAttack, setSelectedAttack] = useState<any>(null);
  const [showAIModal, setShowAIModal] = useState(false);

  // Prepare arc data for globe
  const arcsData = attacks.slice(-20).map((attack) => ({
    startLat: attack.source.latitude,
    startLng: attack.source.longitude,
    endLat: attack.target.latitude,
    endLng: attack.target.longitude,
    color: attack.threat.threatLevel === 'HIGH' 
      ? ['#ff0000', '#ff6600'] 
      : attack.threat.threatLevel === 'MEDIUM'
      ? ['#ffff00', '#ff6600']
      : ['#00ff00', '#ff6600'],
    attack: attack,
  }));

  // Prepare points data (attack sources)
  const pointsData = attacks.slice(-20).map((attack) => ({
    lat: attack.source.latitude,
    lng: attack.source.longitude,
    size: 0.3,
    color: attack.threat.threatLevel === 'HIGH' 
      ? '#ff0000' 
      : attack.threat.threatLevel === 'MEDIUM'
      ? '#ffff00'
      : '#00ff00',
    attack: attack,
  }));

  // Auto-rotate
  useEffect(() => {
    if (globeRef.current) {
      globeRef.current.controls().autoRotate = true;
      globeRef.current.controls().autoRotateSpeed = 0.5;
      globeRef.current.pointOfView({ altitude: 2.5 });
    }
  }, []);

  const handlePointClick = useCallback(async (point: any, event: any) => {
    if (point.attack) {
      setTooltip({
        attack: point.attack,
        x: event.clientX,
        y: event.clientY,
      });
      
      setSelectedAttack(point.attack);
      
      // Fetch AI analysis
      try {
        console.log('🤖 Fetching AI analysis...');
        const response = await fetch('http://localhost:4000/api/reports/analyze-attack', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ attack: point.attack })
        });
        
        const analysis = await response.json();
        setAiAnalysis(analysis);
        setShowAIModal(true);
        setTooltip(null); // Hide tooltip when modal opens
      } catch (error) {
        console.error('Failed to get AI analysis:', error);
      }
    }
  }, []);

  const handlePointHover = useCallback((point: any, prevPoint: any) => {
    if (globeRef.current) {
      document.body.style.cursor = point ? 'pointer' : 'grab';
    }
  }, []);

  return (
    <>
      <GlobeComponent
        ref={globeRef}
        globeImageUrl="/textures/earth.jpg"
        backgroundColor="rgba(0,0,0,1)"
        
        // Arcs configuration
        arcsData={arcsData}
        arcColor="color"
        arcDashLength={0.4}
        arcDashGap={0.2}
        arcDashAnimateTime={2000}
        arcStroke={0.5}
        arcsTransitionDuration={0}
        
        // Points configuration
        pointsData={pointsData}
        pointAltitude={0.01}
        pointRadius="size"
        pointColor="color"
        pointLabel={(point: any) => ''}
        onPointClick={handlePointClick}
        onPointHover={handlePointHover}
        
        // Rings at points
        ringsData={pointsData}
        ringColor={() => (t: number) => `rgba(255, 100, 0, ${1 - t})`}
        ringMaxRadius={2}
        ringPropagationSpeed={2}
        ringRepeatPeriod={1000}
        
        // Atmosphere
        atmosphereColor="#4a90e2"
        atmosphereAltitude={0.15}
        
        // Controls
        enablePointerInteraction={true}
      />

      {/* Tooltip */}
      {tooltip && !showAIModal && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{
            left: `${tooltip.x + 15}px`,
            top: `${tooltip.y + 15}px`,
          }}
        >
          <div className="bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-lg p-4 shadow-2xl max-w-sm">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-white font-bold text-lg">
                🚨 DDoS Attack
              </h3>
              <span
                className={`text-xs px-2 py-1 rounded font-semibold ${
                  tooltip.attack.threat.threatLevel === 'HIGH'
                    ? 'bg-red-500/20 text-red-400 border border-red-500'
                    : tooltip.attack.threat.threatLevel === 'MEDIUM'
                    ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500'
                    : 'bg-green-500/20 text-green-400 border border-green-500'
                }`}
              >
                {tooltip.attack.threat.threatLevel}
              </span>
            </div>

            <div className="space-y-2 text-sm">
              <div>
                <span className="text-gray-400">Source:</span>
                <div className="text-white font-medium">
                  📍 {tooltip.attack.source.city}, {tooltip.attack.source.country}
                </div>
                <div className="text-gray-400 text-xs">
                  {tooltip.attack.source.ip}
                </div>
              </div>

              <div>
                <span className="text-gray-400">ISP:</span>
                <div className="text-white text-xs">{tooltip.attack.source.isp}</div>
              </div>

              <div className="border-t border-gray-700 pt-2">
                <span className="text-gray-400">Attack Type:</span>
                <div className="text-white font-medium">⚡ {tooltip.attack.attackInfo.type}</div>
              </div>

              <div>
                <span className="text-gray-400">Target:</span>
                <div className="text-white">🎯 {tooltip.attack.target.region}</div>
              </div>

              <div className="border-t border-gray-700 pt-2">
                <span className="text-gray-400">Request Rate:</span>
                <div className="text-red-400 font-bold">
                  {tooltip.attack.attackInfo.requestsPerSecond.toLocaleString()} req/s
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-700">
                <div>
                  <span className="text-gray-400 text-xs">DDoS Confidence</span>
                  <div className="text-white font-bold">{tooltip.attack.threat.ddosConfidence}%</div>
                </div>
                <div>
                  <span className="text-gray-400 text-xs">Abuse Score</span>
                  <div className="text-white font-bold">{tooltip.attack.threat.abuseScore}%</div>
                </div>
              </div>

              <div>
                <span className="text-gray-400 text-xs">Total Reports:</span>
                <span className="text-white text-xs ml-2">{tooltip.attack.threat.totalReports}</span>
              </div>

              <div className="text-gray-500 text-xs pt-2 border-t border-gray-700">
                {new Date(tooltip.attack.timestamp).toLocaleString()}
              </div>
              
              <div className="pt-2 text-center">
                <div className="text-blue-400 text-xs">Click for AI Analysis 🤖</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Report Modal */}
      <AIReportModal 
        isOpen={showAIModal}
        onClose={() => {
          setShowAIModal(false);
          setAiAnalysis(null);
        }}
        analysis={aiAnalysis}
        attackInfo={selectedAttack}
      />
    </>
  );
}
