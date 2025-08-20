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
  connect: (serverId: string, config: ConnectionConfig) => Promise<boolean>;
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
  console.log("[connectionReducer] ACTION", { action, prevState: state, date: new Date().toISOString() });
  let nextState: MultiConnectionState;
  switch (action.type) {
    case 'ADD_CONNECTION': {
      const { id, config } = action.payload;
      nextState = {
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
      break;
    }
    case 'REMOVE_CONNECTION': {
      const { id } = action.payload;
      const newConnections = { ...state.connections };
      delete newConnections[id];
      nextState = {
        ...state,
        connections: newConnections,
        activeServerId: state.activeServerId === id ? null : state.activeServerId,
      };
      break;
    }
    case 'SET_ACTIVE_SERVER': {
      nextState = { ...state, activeServerId: action.payload };
      break;
    }
    case 'UPDATE_CONNECTION': {
      const { id, updates } = action.payload;
      nextState = {
        ...state,
        connections: {
          ...state.connections,
          [id]: { ...state.connections[id], ...updates },
        },
      };
      break;
    }
    default:
      nextState = state;
  }
  console.log("[connectionReducer] NEXT_STATE", { nextState, date: new Date().toISOString() });
  return nextState;
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
    console.log("[ConnectionContext.testConnection] DÉBUT", { config, configToTest, activeServerId: state.activeServerId, date: new Date().toISOString() });
  
    if (!configToTest || !state.activeServerId) {
      console.log("[ConnectionContext.testConnection] Pas de config ou d'activeServerId", { configToTest, activeServerId: state.activeServerId, date: new Date().toISOString() });
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
      console.log("[ConnectionContext.testConnection] Résultat testConnectionWithRetry", { result, date: new Date().toISOString() });
  
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
  
      console.log("[ConnectionContext.testConnection] ERREUR", { error, date: new Date().toISOString() });
  
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
      console.log("[ConnectionContext.testConnection] FIN", { activeServerId: state.activeServerId, date: new Date().toISOString() });
    }
  }, [getActiveConnection, state.activeServerId]);

  // Se connecter
  const connect = useCallback(async (serverId: string, config: ConnectionConfig): Promise<boolean> => {
    console.log("[ConnectionContext.connect] DÉBUT", { serverId, config, activeServerId: state.activeServerId, date: new Date().toISOString() });
    if (!serverId) {
      console.log("[ConnectionContext.connect] Pas de serverId, abandon", { date: new Date().toISOString() });
      return false;
    }
  
    dispatch({
      type: 'UPDATE_CONNECTION',
      payload: { id: serverId, updates: { status: 'connecting', error: null } },
    });
  
    try {
      const validatedConfig = validateConnectionConfig(config);
      console.log("[ConnectionContext.connect] Config validée", { validatedConfig, date: new Date().toISOString() });
      const result = await testConnection(validatedConfig);
      console.log("[ConnectionContext.connect] Résultat testConnection", { result, date: new Date().toISOString() });
  
      if (result.success) {
        dispatch({
          type: 'UPDATE_CONNECTION',
          payload: {
            id: serverId,
            updates: { config: validatedConfig, status: 'connected', lastConnected: new Date() },
          },
        });
        console.log("[ConnectionContext.connect] CONNECTÉ", { serverId, date: new Date().toISOString() });
        return true;
      } else {
        dispatch({
          type: 'UPDATE_CONNECTION',
          payload: {
            id: serverId,
            updates: { status: 'error', error: result.error?.message || 'Connection failed' },
          },
        });
        console.log("[ConnectionContext.connect] ÉCHEC connexion", { error: result.error, date: new Date().toISOString() });
        return false;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Connection failed';
      dispatch({
        type: 'UPDATE_CONNECTION',
        payload: { id: serverId, updates: { status: 'error', error: errorMessage } },
      });
      console.log("[ConnectionContext.connect] ERREUR", { error, date: new Date().toISOString() });
      return false;
    }
  }, [testConnection]);

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