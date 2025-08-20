'use client';

/**
 * Context de connexion pour gérer l'état global de connexion Proxmox
 */

import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import { 
  ConnectionState, 
  ConnectionConfig, 
  ConnectionStatus,
  ConnectionTestResult,
  validateConnectionConfig 
} from '@/lib/types';
import { ConnectionService } from '@/lib/services/connectionService';

// Actions du reducer
type ConnectionAction =
  | { type: 'SET_STATUS'; payload: ConnectionStatus }
  | { type: 'SET_CONFIG'; payload: ConnectionConfig | null }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_VALIDATING'; payload: boolean }
  | { type: 'SET_LAST_CONNECTED'; payload: Date | null }
  | { type: 'RESET_CONNECTION' }
  | { type: 'UPDATE_STATE'; payload: Partial<ConnectionState> };

// Interface du contexte
interface ConnectionContextType {
  // État
  state: ConnectionState;
  
  // Actions
  setConnectionConfig: (config: ConnectionConfig | null) => void;
  testConnection: (config?: ConnectionConfig) => Promise<ConnectionTestResult>;
  connect: (config: ConnectionConfig) => Promise<boolean>;
  disconnect: () => void;
  clearError: () => void;

  // Multi-serveur actions
  addConnection: (id: string, config: ConnectionConfig) => void;
  setActiveServer: (id: string | null) => void;
  
  // Utilitaires
  isConnected: boolean;
  isConnecting: boolean;
  hasValidConfig: boolean;
}

// État multi-serveurs
interface MultiConnectionState {
  connections: Record<string, ConnectionState>; // keyed by serverId
  activeServerId: string | null;
}

const initialState: MultiConnectionState = {
  connections: {},
  activeServerId: null,
};

// Nouveau reducer multi-serveurs
type MultiConnectionAction =
  | { type: 'ADD_CONNECTION'; payload: { id: string; config: ConnectionConfig } }
  | { type: 'REMOVE_CONNECTION'; payload: { id: string } }
  | { type: 'SET_ACTIVE_SERVER'; payload: string | null }
  | { type: 'UPDATE_CONNECTION'; payload: { id: string; updates: Partial<ConnectionState> } };

function connectionReducer(state: MultiConnectionState, action: MultiConnectionAction): MultiConnectionState {
  switch (action.type) {
    case 'ADD_CONNECTION': {
      const { id, config } = action.payload;
      return {
        ...state,
        connections: {
          ...state.connections,
          [id]: {
            status: 'disconnected',
            config,
            lastConnected: null,
            error: null,
            isValidating: false,
          },
        },
      };
    }
    case 'REMOVE_CONNECTION': {
      const { id } = action.payload;
      const newConnections = { ...state.connections };
      delete newConnections[id];
      return {
        ...state,
        connections: newConnections,
        activeServerId: state.activeServerId === id ? null : state.activeServerId,
      };
    }
    case 'SET_ACTIVE_SERVER': {
      return { ...state, activeServerId: action.payload };
    }
    case 'UPDATE_CONNECTION': {
      const { id, updates } = action.payload;
      return {
        ...state,
        connections: {
          ...state.connections,
          [id]: { ...state.connections[id], ...updates },
        },
      };
    }
    default:
      return state;
  }
}

// Création du contexte
const ConnectionContext = createContext<ConnectionContextType | undefined>(undefined);

// Clé pour le localStorage
const STORAGE_KEY = 'proxmox-connection-config';

// Provider du contexte
interface ConnectionProviderProps {
  children: React.ReactNode;
}

export function ConnectionProvider({ children }: ConnectionProviderProps) {
  const [state, dispatch] = useReducer(connectionReducer, initialState);

  // Helper pour obtenir la connexion active
  const getActiveConnection = useCallback((): ConnectionState | null => {
    if (!state.activeServerId) return null;
    return state.connections[state.activeServerId] || null;
  }, [state]);

  // Ajouter une connexion
  const addConnection = useCallback((id: string, config: ConnectionConfig) => {
    dispatch({ type: 'ADD_CONNECTION', payload: { id, config } });
  }, []);

  // Supprimer une connexion
  const removeConnection = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_CONNECTION', payload: { id } });
  }, []);

  // Définir le serveur actif
  const setActiveServer = useCallback((id: string | null) => {
    dispatch({ type: 'SET_ACTIVE_SERVER', payload: id });
  }, []);

  // Mettre à jour la configuration de la connexion active
  const setConnectionConfig = useCallback((config: ConnectionConfig | null) => {
    if (!state.activeServerId) return;
    dispatch({
      type: 'UPDATE_CONNECTION',
      payload: { id: state.activeServerId, updates: { config } },
    });
  }, [state.activeServerId]);

  // Tester la connexion de la connexion active
  const testConnection = useCallback(async (config?: ConnectionConfig): Promise<ConnectionTestResult> => {
    const active = getActiveConnection();
    const configToTest = config || active?.config;

    if (!configToTest || !state.activeServerId) {
      return {
        success: false,
        error: {
          type: 'validation',
          message: 'No active connection configuration provided',
          timestamp: new Date(),
        },
      };
    }

    dispatch({
      type: 'UPDATE_CONNECTION',
      payload: { id: state.activeServerId, updates: { isValidating: true, error: null } },
    });

    try {
      const result = await ConnectionService.testConnectionWithRetry(configToTest);

      if (!result.success && result.error) {
        dispatch({
          type: 'UPDATE_CONNECTION',
          payload: { id: state.activeServerId, updates: { error: result.error.message } },
        });
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error during connection test';
      dispatch({
        type: 'UPDATE_CONNECTION',
        payload: { id: state.activeServerId, updates: { error: errorMessage } },
      });

      return {
        success: false,
        error: {
          type: 'unknown',
          message: errorMessage,
          timestamp: new Date(),
        },
      };
    } finally {
      dispatch({
        type: 'UPDATE_CONNECTION',
        payload: { id: state.activeServerId, updates: { isValidating: false } },
      });
    }
  }, [getActiveConnection, state.activeServerId]);

  // Se connecter
  const connect = useCallback(async (config: ConnectionConfig): Promise<boolean> => {
    if (!state.activeServerId) return false;

    dispatch({
      type: 'UPDATE_CONNECTION',
      payload: { id: state.activeServerId, updates: { status: 'connecting', error: null } },
    });

    try {
      const validatedConfig = validateConnectionConfig(config);
      const result = await testConnection(validatedConfig);

      if (result.success) {
        dispatch({
          type: 'UPDATE_CONNECTION',
          payload: {
            id: state.activeServerId,
            updates: { config: validatedConfig, status: 'connected', lastConnected: new Date() },
          },
        });
        return true;
      } else {
        dispatch({
          type: 'UPDATE_CONNECTION',
          payload: {
            id: state.activeServerId,
            updates: { status: 'error', error: result.error?.message || 'Connection failed' },
          },
        });
        return false;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Connection failed';
      dispatch({
        type: 'UPDATE_CONNECTION',
        payload: { id: state.activeServerId, updates: { status: 'error', error: errorMessage } },
      });
      return false;
    }
  }, [state.activeServerId, testConnection]);

  // Se déconnecter
  const disconnect = useCallback(() => {
    if (!state.activeServerId) return;
    dispatch({
      type: 'UPDATE_CONNECTION',
      payload: { id: state.activeServerId, updates: { status: 'disconnected', error: null } },
    });
  }, [state.activeServerId]);

  // Effacer l'erreur
  const clearError = useCallback(() => {
    if (!state.activeServerId) return;
    dispatch({
      type: 'UPDATE_CONNECTION',
      payload: { id: state.activeServerId, updates: { error: null } },
    });
  }, [state.activeServerId]);

  // Valeurs calculées
  const active = getActiveConnection();
  const isConnected = active?.status === 'connected';
  const isConnecting = active?.status === 'connecting' || active?.isValidating;
  const hasValidConfig = !!active?.config && ConnectionService.isConfigurationComplete(active.config);

  // Vérification périodique de la connexion (heartbeat)
  useEffect(() => {
    if (!isConnected || !active?.config || !state.activeServerId) {
      return;
    }

    const interval = setInterval(async () => {
      try {
        const result = await ConnectionService.testConnection(active.config!);
        if (!result.success) {
          if (state.activeServerId) {
            dispatch({
              type: 'UPDATE_CONNECTION',
              payload: {
                id: state.activeServerId,
                updates: { status: 'error', error: `Connection lost: ${result.error?.message}` },
              },
            });
          }
        }
      } catch (err) {
        if (state.activeServerId) {
          dispatch({
            type: 'UPDATE_CONNECTION',
            payload: {
              id: state.activeServerId,
              updates: { status: 'error', error: 'Connection heartbeat failed' },
            },
          });
        }
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [isConnected, active?.config, state.activeServerId]);

  const contextValue = React.useMemo(() => ({
    state: getActiveConnection() || {
      status: 'disconnected',
      config: null,
      lastConnected: null,
      error: null,
      isValidating: false,
    },
    setConnectionConfig,
    testConnection,
    connect,
    disconnect,
    clearError,
    isConnected,
    isConnecting: isConnecting ?? false,
    hasValidConfig,
    addConnection,
    setActiveServer,
  }), [
    getActiveConnection,
    setConnectionConfig,
    testConnection,
    connect,
    disconnect,
    clearError,
    isConnected,
    isConnecting,
    hasValidConfig,
    addConnection,
    setActiveServer,
  ]);

  return (
    <ConnectionContext.Provider value={contextValue}>
      {children}
    </ConnectionContext.Provider>
  );
}

// Hook pour utiliser le contexte
export function useConnectionContext(): ConnectionContextType {
  const context = useContext(ConnectionContext);
  if (context === undefined) {
    throw new Error('useConnectionContext must be used within a ConnectionProvider');
  }
  return context;
}

// Hook pour gérer les connexions multiples
export function useMultiConnection() {
  const context = useContext(ConnectionContext);
  if (context === undefined) {
    throw new Error('useMultiConnection must be used within a ConnectionProvider');
  }
  
  // Accéder aux propriétés multi-serveurs du contexte
  const state = context.state as any;
  const multiState = state as MultiConnectionState;
  
  return {
    connections: multiState.connections || {},
    activeServerId: multiState.activeServerId,
    activeConnection: multiState.activeServerId ? multiState.connections[multiState.activeServerId] : null,
    addConnection: (context as any).addConnection,
    removeConnection: (context as any).removeConnection,
    setActiveServer: (context as any).setActiveServer,
  };
}

// Export du contexte pour les tests
export { ConnectionContext };