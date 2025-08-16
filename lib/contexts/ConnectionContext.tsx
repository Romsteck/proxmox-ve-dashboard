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
  
  // Utilitaires
  isConnected: boolean;
  isConnecting: boolean;
  hasValidConfig: boolean;
}

// État initial
const initialState: ConnectionState = {
  status: 'disconnected',
  config: null,
  lastConnected: null,
  error: null,
  isValidating: false,
};

// Reducer pour gérer l'état de connexion
function connectionReducer(state: ConnectionState, action: ConnectionAction): ConnectionState {
  switch (action.type) {
    case 'SET_STATUS':
      return { ...state, status: action.payload };
    
    case 'SET_CONFIG':
      return { ...state, config: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    
    case 'SET_VALIDATING':
      return { ...state, isValidating: action.payload };
    
    case 'SET_LAST_CONNECTED':
      return { ...state, lastConnected: action.payload };
    
    case 'RESET_CONNECTION':
      return {
        ...initialState,
        config: state.config, // Conserver la config
      };
    
    case 'UPDATE_STATE':
      return { ...state, ...action.payload };
    
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

  // Charger la configuration depuis localStorage au démarrage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const config = JSON.parse(stored);
        try {
          const validatedConfig = validateConnectionConfig(config);
          dispatch({ type: 'SET_CONFIG', payload: validatedConfig });
        } catch (validationError) {
          console.warn('Invalid stored connection config:', validationError);
          localStorage.removeItem(STORAGE_KEY);
          dispatch({ type: 'SET_CONFIG', payload: null });
        }
      }
    } catch (error) {
      console.warn('Failed to load connection config from localStorage:', error);
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  // Sauvegarder la configuration dans localStorage
  const saveConfigToStorage = useCallback((config: ConnectionConfig | null) => {
    try {
      if (config) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (error) {
      console.warn('Failed to save connection config to localStorage:', error);
    }
  }, []);

  // Définir la configuration de connexion
  const setConnectionConfig = useCallback((config: ConnectionConfig | null) => {
    dispatch({ type: 'SET_CONFIG', payload: config });
    saveConfigToStorage(config);
    
    // Réinitialiser l'état si on supprime la config
    if (!config) {
      dispatch({ type: 'RESET_CONNECTION' });
    }
  }, [saveConfigToStorage]);

  // Tester la connexion
  const testConnection = useCallback(async (config?: ConnectionConfig): Promise<ConnectionTestResult> => {
    const configToTest = config || state.config;
    
    if (!configToTest) {
      return {
        success: false,
        error: {
          type: 'validation',
          message: 'No connection configuration provided',
          timestamp: new Date(),
        },
      };
    }

    dispatch({ type: 'SET_VALIDATING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      const result = await ConnectionService.testConnectionWithRetry(configToTest);
      
      if (!result.success && result.error) {
        dispatch({ type: 'SET_ERROR', payload: result.error.message });
      }
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error during connection test';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      
      return {
        success: false,
        error: {
          type: 'unknown',
          message: errorMessage,
          timestamp: new Date(),
        },
      };
    } finally {
      dispatch({ type: 'SET_VALIDATING', payload: false });
    }
  }, [state.config]);

  // Se connecter
  const connect = useCallback(async (config: ConnectionConfig): Promise<boolean> => {
    dispatch({ type: 'SET_STATUS', payload: 'connecting' });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      // Valider la configuration
      const validatedConfig = validateConnectionConfig(config);
      
      // Tester la connexion avant de sauvegarder
      const result = await testConnection(validatedConfig);

      if (result.success) {
        // Sauvegarder la configuration seulement si la connexion réussit
        setConnectionConfig(validatedConfig);
        dispatch({ type: 'SET_STATUS', payload: 'connected' });
        dispatch({ type: 'SET_LAST_CONNECTED', payload: new Date() });
        return true;
      } else {
        dispatch({ type: 'SET_STATUS', payload: 'error' });
        if (result.error) {
          dispatch({ type: 'SET_ERROR', payload: result.error.message });
        }
        return false;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Connection failed';
      dispatch({ type: 'SET_STATUS', payload: 'error' });
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      return false;
    }
  }, [setConnectionConfig, testConnection]);

  // Se déconnecter
  const disconnect = useCallback(() => {
    dispatch({ type: 'SET_STATUS', payload: 'disconnected' });
    dispatch({ type: 'SET_ERROR', payload: null });
  }, []);

  // Effacer l'erreur
  const clearError = useCallback(() => {
    dispatch({ type: 'SET_ERROR', payload: null });
  }, []);

  // Valeurs calculées
  const isConnected = state.status === 'connected';
  const isConnecting = state.status === 'connecting' || state.isValidating;
  const hasValidConfig = state.config !== null && ConnectionService.isConfigurationComplete(state.config);

  // Vérification périodique de la connexion (heartbeat)
  useEffect(() => {
    if (!isConnected || !state.config) {
      console.log('[ConnectionContext] Heartbeat: skipped (isConnected:', isConnected, ', config:', state.config, ')');
      return;
    }

    console.log('[ConnectionContext] Heartbeat: started (isConnected:', isConnected, ', config:', state.config, ')');
    const interval = setInterval(async () => {
      try {
        console.log('[ConnectionContext] Heartbeat: testing connection...');
        const result = await ConnectionService.testConnection(state.config!);
        if (!result.success) {
          console.log('[ConnectionContext] Heartbeat: connection lost', result.error);
          dispatch({ type: 'SET_STATUS', payload: 'error' });
          if (result.error) {
            dispatch({ type: 'SET_ERROR', payload: `Connection lost: ${result.error.message}` });
          }
        }
      } catch (err) {
        console.log('[ConnectionContext] Heartbeat: error', err);
        dispatch({ type: 'SET_STATUS', payload: 'error' });
        dispatch({ type: 'SET_ERROR', payload: 'Connection heartbeat failed' });
      }
    }, 30000); // Vérifier toutes les 30 secondes

    return () => clearInterval(interval);
  }, [isConnected, state.config]);

  const contextValue: ConnectionContextType = {
    state,
    setConnectionConfig,
    testConnection,
    connect,
    disconnect,
    clearError,
    isConnected,
    isConnecting,
    hasValidConfig,
  };

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

// Export du contexte pour les tests
export { ConnectionContext };