import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { Client } from '@stomp/stompjs';
import { AnalysisRecord } from '../types';

interface WebSocketContextType {
  isConnected: boolean;
  latestGlobalUpdate: AnalysisRecord | null;
  subscribeToAnalysis: (id: string, callback: (update: AnalysisRecord) => void) => () => void;
  subscribeToAllAnalyses: (callback: (update: AnalysisRecord) => void) => () => void;
}

const WebSocketContext = createContext<WebSocketContextType>({
  isConnected: false,
  latestGlobalUpdate: null,
  subscribeToAnalysis: () => () => {},
  subscribeToAllAnalyses: () => () => {},
});

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [latestGlobalUpdate, setLatestGlobalUpdate] = useState<AnalysisRecord | null>(null);
  const stompClientRef = useRef<Client | null>(null);
  const globalCallbacksRef = useRef<Set<(update: AnalysisRecord) => void>>(new Set());
  const singleCallbacksRef = useRef<Map<string, Set<(update: AnalysisRecord) => void>>>(new Map());

  useEffect(() => {
    // Determine ws host via browser location for Vite proxy
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const brokerURL = `${protocol}//${window.location.host}/ws`;

    const client = new Client({
      brokerURL,
      reconnectDelay: 3000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      debug: () => {},
      onConnect: () => {
        setIsConnected(true);

        // Global analyses topic subscription
        client.subscribe('/topic/analyses', (message) => {
          try {
            const data: AnalysisRecord = JSON.parse(message.body);
            setLatestGlobalUpdate(data);
            globalCallbacksRef.current.forEach((cb) => cb(data));

            // Also dispatch to single-id listeners if any
            if (data && data.id && singleCallbacksRef.current.has(data.id)) {
              singleCallbacksRef.current.get(data.id)?.forEach((cb) => cb(data));
            }
          } catch (e) {
            console.error('Failed to parse STOMP message', e);
          }
        });
      },
      onDisconnect: () => {
        setIsConnected(false);
      },
      onStompError: (frame) => {
        console.warn('STOMP broker error:', frame.headers['message']);
        setIsConnected(false);
      },
      onWebSocketClose: () => {
        setIsConnected(false);
      },
    });

    client.activate();
    stompClientRef.current = client;

    return () => {
      client.deactivate();
    };
  }, []);

  const subscribeToAllAnalyses = useCallback((callback: (update: AnalysisRecord) => void) => {
    globalCallbacksRef.current.add(callback);
    return () => {
      globalCallbacksRef.current.delete(callback);
    };
  }, []);

  const subscribeToAnalysis = useCallback((id: string, callback: (update: AnalysisRecord) => void) => {
    if (!singleCallbacksRef.current.has(id)) {
      singleCallbacksRef.current.set(id, new Set());
    }
    singleCallbacksRef.current.get(id)!.add(callback);

    // Also register specific topic on STOMP if connected
    let sub: { unsubscribe: () => void } | null = null;
    if (stompClientRef.current?.connected) {
      sub = stompClientRef.current.subscribe(`/topic/analyses/${id}`, (msg) => {
        try {
          const data: AnalysisRecord = JSON.parse(msg.body);
          callback(data);
        } catch (e) {
          console.error(e);
        }
      });
    }

    return () => {
      if (singleCallbacksRef.current.has(id)) {
        singleCallbacksRef.current.get(id)!.delete(callback);
        if (singleCallbacksRef.current.get(id)!.size === 0) {
          singleCallbacksRef.current.delete(id);
        }
      }
      if (sub) {
        sub.unsubscribe();
      }
    };
  }, []);

  return (
    <WebSocketContext.Provider
      value={{
        isConnected,
        latestGlobalUpdate,
        subscribeToAnalysis,
        subscribeToAllAnalyses,
      }}
    >
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => useContext(WebSocketContext);
