import { useEffect, useRef, useState, useCallback } from 'react';
import { Client, IMessage } from '@stomp/stompjs';
import { AnalysisRecord } from '../types';

interface UseWebSocketOptions {
  onAnalysisUpdate?: (update: AnalysisRecord) => void;
}

export const useWebSocket = ({ onAnalysisUpdate }: UseWebSocketOptions = {}) => {
  const [isConnected, setIsConnected] = useState(false);
  const clientRef = useRef<Client | null>(null);

  useEffect(() => {
    // Determine WebSocket URL based on current host protocol
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const brokerURL = `${protocol}//${window.location.host}/ws`;

    const client = new Client({
      brokerURL: brokerURL,
      reconnectDelay: 4000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      onConnect: () => {
        setIsConnected(true);
        // Subscribe to global analyses channel
        client.subscribe('/topic/analyses', (message: IMessage) => {
          if (message.body) {
            try {
              const data: AnalysisRecord = JSON.parse(message.body);
              if (onAnalysisUpdate) {
                onAnalysisUpdate(data);
              }
            } catch (err) {
              console.error('Error parsing STOMP message payload', err);
            }
          }
        });
      },
      onDisconnect: () => {
        setIsConnected(false);
      },
      onStompError: (frame) => {
        console.error('STOMP broker reported error: ' + frame.headers['message']);
        console.error('Additional details: ' + frame.body);
      },
      onWebSocketError: (event) => {
        console.warn('WebSocket connection error, will retry...', event);
        setIsConnected(false);
      },
    });

    client.activate();
    clientRef.current = client;

    return () => {
      if (client.active) {
        client.deactivate();
      }
    };
  }, [onAnalysisUpdate]);

  const subscribeToAnalysis = useCallback((analysisId: string, callback: (update: AnalysisRecord) => void) => {
    if (!clientRef.current || !clientRef.current.connected) {
      return () => {};
    }

    const subscription = clientRef.current.subscribe(`/topic/analyses/${analysisId}`, (message: IMessage) => {
      try {
        const data: AnalysisRecord = JSON.parse(message.body);
        callback(data);
      } catch (err) {
        console.error('Error parsing specific STOMP message payload', err);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return {
    isConnected,
    subscribeToAnalysis,
  };
};
