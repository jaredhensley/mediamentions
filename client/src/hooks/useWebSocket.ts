import { useEffect, useRef, useCallback, useState } from 'react';

export interface VerificationStatusData {
  isRunning: boolean;
  phase: 'idle' | 'searching' | 'verifying' | 'complete';
  total: number;
  processed: number;
  verified: number;
  failed: number;
}

export interface MentionVerifiedData {
  mentionId: number;
  verified: number;
  reason: string;
  title: string;
  clientName: string;
}

export interface WebSocketMessage {
  type: string;
  status?: VerificationStatusData;
  mentionId?: number;
  verified?: number;
  reason?: string;
  title?: string;
  clientName?: string;
  mention?: Record<string, unknown>;
  phase?: string;
}

type MessageHandler = (message: WebSocketMessage) => void;

const WS_URL = 'ws://localhost:3000';

export function useWebSocket(onMessage?: MessageHandler) {
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
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
        console.log('[WebSocket] Connected');
        setIsConnected(true);
      };

      ws.onclose = () => {
        console.log('[WebSocket] Disconnected');
        setIsConnected(false);
        wsRef.current = null;

        // Attempt to reconnect after 3 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('[WebSocket] Attempting to reconnect...');
          connect();
        }, 3000);
      };

      ws.onerror = (error) => {
        console.error('[WebSocket] Error:', error);
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as WebSocketMessage;
          setLastMessage(message);
          messageHandlerRef.current?.(message);
        } catch (error) {
          console.error('[WebSocket] Failed to parse message:', error);
        }
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('[WebSocket] Failed to connect:', error);
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

  return {
    isConnected,
    lastMessage,
  };
}
