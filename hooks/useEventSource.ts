import { useCallback, useEffect, useRef, useState } from "react";
import { RetryManager } from "@/lib/utils/error-handling";
import { TIMEOUTS, INTERVALS } from "@/lib/constants";
import { EventMessage, safeValidateEventMessage } from "@/lib/types";

export interface UseEventSourceOptions {
  retryMs?: number;
  maxRetries?: number;
  enabled?: boolean;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
  onMessage?: (message: EventMessage) => void;
}

export interface EventSourceState {
  connected: boolean;
  connecting: boolean;
  lastEvent: EventMessage | null;
  error: string | null;
  retryCount: number;
  connectionTime: number | null;
}

export function useEventSource(url: string, options: UseEventSourceOptions = {}) {
  const {
    retryMs = TIMEOUTS.SSE_RECONNECT,
    maxRetries = 5,
    enabled = true,
    onConnect,
    onDisconnect,
    onError,
    onMessage,
  } = options;

  const [state, setState] = useState<EventSourceState>({
    connected: false,
    connecting: false,
    lastEvent: null,
    error: null,
    retryCount: 0,
    connectionTime: null,
  });

  const esRef = useRef<EventSource | null>(null);
  const retryManagerRef = useRef<RetryManager | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const updateState = useCallback((updates: Partial<EventSourceState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const resetHeartbeatTimeout = useCallback(() => {
    if (heartbeatTimeoutRef.current) {
      clearTimeout(heartbeatTimeoutRef.current);
    }
    
    // Set timeout for 2x the expected heartbeat interval
    heartbeatTimeoutRef.current = setTimeout(() => {
      if (esRef.current) {
        console.warn('EventSource heartbeat timeout, reconnecting...');
        esRef.current.close();
      }
    }, INTERVALS.HEARTBEAT * 2);
  }, []);

  const handleMessage = useCallback((type: string) => (ev: MessageEvent) => {
    try {
      const data = ev.data ? JSON.parse(ev.data) : {};
      const message = { type, ...data };
      
      // Validate the message structure
      const validation = safeValidateEventMessage(message);
      if (!validation.success) {
        console.warn('Invalid event message received:', validation.error);
        return;
      }

      const validatedMessage = validation.data;
      
      updateState({
        lastEvent: validatedMessage,
        error: null
      });

      // Reset heartbeat timeout on any message
      if (validatedMessage.type === 'heartbeat') {
        resetHeartbeatTimeout();
      }

      onMessage?.(validatedMessage);
    } catch (error) {
      console.warn('Failed to parse event message:', error);
      const fallbackMessage: EventMessage = {
        type: 'error',
        message: `Failed to parse message: ${String(ev.data)}`
      };
      updateState({ lastEvent: fallbackMessage });
    }
  }, [updateState, onMessage, resetHeartbeatTimeout]);

  const connect = useCallback(async () => {
    if (!enabled || esRef.current) return;

    updateState({ connecting: true, error: null });

    try {
      const es = new EventSource(url);
      esRef.current = es;

      es.onopen = () => {
        updateState({
          connected: true,
          connecting: false,
          error: null,
          retryCount: 0,
          connectionTime: Date.now(),
        });
        
        resetHeartbeatTimeout();
        onConnect?.();
      };

      es.onerror = () => {
        const wasConnected = state.connected;
        
        updateState({
          connected: false,
          connecting: false,
          connectionTime: null,
        });

        if (heartbeatTimeoutRef.current) {
          clearTimeout(heartbeatTimeoutRef.current);
        }

        es.close();
        esRef.current = null;

        if (wasConnected) {
          onDisconnect?.();
        }

        // Schedule reconnection if enabled and under retry limit
        if (enabled && state.retryCount < maxRetries) {
          updateState({
            retryCount: state.retryCount + 1,
            error: `Connection lost, retrying... (${state.retryCount + 1}/${maxRetries})`
          });

          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, retryMs);
        } else {
          const error = new Error(
            state.retryCount >= maxRetries
              ? 'Max reconnection attempts reached'
              : 'EventSource connection failed'
          );
          updateState({ error: error.message });
          onError?.(error);
        }
      };

      // Set up event listeners
      es.addEventListener("status", handleMessage("status"));
      es.addEventListener("error", handleMessage("error"));
      es.onmessage = handleMessage("message");

    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      updateState({
        connected: false,
        connecting: false,
        error: err.message,
      });
      onError?.(err);
    }
  }, [url, enabled, state.connected, state.retryCount, maxRetries, retryMs, updateState, handleMessage, onConnect, onDisconnect, onError, resetHeartbeatTimeout]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (heartbeatTimeoutRef.current) {
      clearTimeout(heartbeatTimeoutRef.current);
      heartbeatTimeoutRef.current = null;
    }

    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }

    updateState({
      connected: false,
      connecting: false,
      connectionTime: null,
      retryCount: 0,
    });
  }, [updateState]);

  const reconnect = useCallback(() => {
    disconnect();
    updateState({ retryCount: 0 });
    connect();
  }, [disconnect, connect, updateState]);

  // Effect to handle connection lifecycle
  useEffect(() => {
    if (enabled) {
      connect();
    } else {
      disconnect();
    }

    return disconnect;
  }, [enabled, url]); // Only reconnect when URL changes or enabled state changes

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);

  return {
    ...state,
    reconnect,
    disconnect,
  };
}