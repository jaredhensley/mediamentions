import { useEffect, useRef, useCallback } from 'react';
import { VerificationStatusData } from '../api';

export interface WebSocketMessage {
  type: string;
  status?: Partial<VerificationStatusData>;
  mentionId?: number;
  verified?: number;
  reason?: string;
  title?: string;
  clientName?: string;
  mention?: Record<string, unknown>;
  phase?: string;
}

type MessageHandler = (message: WebSocketMessage) => void;

// Build WebSocket URL from current location or environment
function getWebSocketUrl(): string {
  // Use environment variable if set (for development)
  const envUrl = import.meta.env.VITE_WS_URL;
  if (envUrl) {
    return envUrl;
  }

  // In production, derive from current location
  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}`;
  }

  // Fallback for development
  return 'ws://localhost:3000';
}

const WS_URL = getWebSocketUrl();

export function useWebSocket(onMessage?: MessageHandler): void {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messageHandlerRef = useRef<MessageHandler | undefined>(onMessage);

  // Keep handler ref updated
  messageHandlerRef.current = onMessage;

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      const ws = new WebSocket(WS_URL);

      ws.onopen = () => {
        // Connected successfully
      };

      ws.onclose = () => {
        wsRef.current = null;

        // Attempt to reconnect after 3 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 3000);
      };

      ws.onerror = () => {
        // Error handled by onclose
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as WebSocketMessage;
          messageHandlerRef.current?.(message);
        } catch {
          // Silently ignore parse errors
        }
      };

      wsRef.current = ws;
    } catch {
      // Connection failed, will retry via reconnect logic
    }
  }, []);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);
}
