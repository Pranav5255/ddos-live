'use client';

import { useEffect, useState, useCallback } from 'react';

interface Attack {
  id: string;
  source: any;
  target: any;
  threat: any;
  attackInfo: any;
  timestamp: string;
}

export function useWebSocket(url: string) {
  const [attacks, setAttacks] = useState<Attack[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [stats, setStats] = useState({
    totalAttacks: 0,
    activeConnections: 1,
  });

  useEffect(() => {
    const ws = new WebSocket(url);

    ws.onopen = () => {
      console.log('✅ WebSocket connected');
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'attack') {
          console.log('🚨 New attack received:', data);
          
          setAttacks((prev) => [...prev, data]);
          setStats((prev) => ({
            ...prev,
            totalAttacks: prev.totalAttacks + 1,
          }));
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('❌ WebSocket error:', error);
      setIsConnected(false);
    };

    ws.onclose = () => {
      console.log('🔌 WebSocket disconnected');
      setIsConnected(false);
    };

    return () => {
      ws.close();
    };
  }, [url]);

  return { attacks, isConnected, stats };
}
