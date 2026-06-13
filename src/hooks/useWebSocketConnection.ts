import { useCallback, useEffect, useRef, useState } from 'react';
import { UserResource } from '@clerk/types';
import { logger } from '@/lib/logger';

export type ConnectionState = 'connecting' | 'connected' | 'disconnected';

function useWebSocketConnection(
  user: UserResource | null | undefined,
  getToken: (options?: { skipCache?: boolean }) => Promise<string | null>,
  onMessageRef: React.MutableRefObject<(event: MessageEvent) => void>,
) {
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connectWebSocket = useCallback(async () => {
    if (!user || socketRef.current) return;

    setConnectionState('connecting');

    try {
      const token = await getToken({ skipCache: true });

      if (socketRef.current) return;

      const WS_URL = process.env.NEXT_PUBLIC_WS_URL;
      const ws = new WebSocket(`${WS_URL}?token=${token}`);
      socketRef.current = ws;

      ws.onopen = () => {
        setConnectionState('connected');
      };

      ws.onmessage = (event) => onMessageRef.current(event);

      ws.onclose = () => {
        socketRef.current = null;
        setConnectionState('disconnected');
        reconnectTimerRef.current = setTimeout(connectWebSocket, 10000);
      };

      ws.onerror = () => {
        logger.error('WebSocket error');
        setConnectionState('disconnected');
      };
    } catch (error) {
      logger.error('WebSocket connection failed:', error);
      setConnectionState('disconnected');
    }
  }, [user, getToken, onMessageRef]);

  useEffect(() => {
    connectWebSocket();
    return () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      socketRef.current?.close();
    };
  }, [connectWebSocket]);

  return { socketRef, connectionState };
}

export default useWebSocketConnection;
