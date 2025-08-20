/**
 * Hook de connexion pour utiliser le système de gestion de connexion Proxmox
 */

import { useCallback, useEffect, useState } from 'react';
import { useConnectionContext } from '@/lib/contexts/ConnectionContext';
import { ConnectionService } from '@/lib/services/connectionService';
import { useLocalStorage } from './useLocalStorage';
import { 
  ConnectionConfig, 
  ConnectionTestResult, 
  ConnectionStatus,
  safeValidateConnectionConfig 
} from '@/lib/types';

// Interface pour les options du hook
export interface UseConnectionOptions {
  autoConnect?: boolean;
  persistConfig?: boolean;
  onConnectionChange?: (status: ConnectionStatus) => void;
  onError?: (error: string) => void;
}

// Interface pour les paramètres de connexion partiels
export interface ConnectionParams {
  host?: string;
  port?: number;
  username?: string;
  token?: string;
  insecureTLS?: boolean;
}

// Interface de retour du hook
export interface UseConnectionReturn {
  // État de connexion
  status: ConnectionStatus;
  config: ConnectionConfig | null;
  error: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  isValidating: boolean;
  lastConnected: Date | null;
  hasValidConfig: boolean;

  // Actions de connexion
  connect: (config: ConnectionConfig) => Promise<boolean>;
  disconnect: () => void;
  testConnection: (config?: ConnectionConfig) => Promise<ConnectionTestResult>;
  
  // Gestion de la configuration
  setConfig: (config: ConnectionConfig | null) => void;
  updateConfig: (params: Partial<ConnectionConfig>) => void;
  clearConfig: () => void;
  
  // Validation
  validateConfig: (config: Partial<ConnectionConfig>) => { isValid: boolean; errors: string[] };
  
  // Utilitaires
  clearError: () => void;
  retry: () => Promise<boolean>;
  getConnectionUrl: () => string | null;
}

/**
 * Hook principal pour la gestion de connexion
 */
export function useConnection(options: UseConnectionOptions = {}): UseConnectionReturn {
  const {
    autoConnect = false,
    persistConfig = true,
    onConnectionChange,
    onError,
  } = options;

  const context = useConnectionContext();
  const [retryCount, setRetryCount] = useState(0);

  // Persistance locale optionnelle (en plus du contexte)
  const [localConfig, setLocalConfig] = useLocalStorage<ConnectionConfig | null>(
    'proxmox-connection-backup',
    {
      defaultValue: null,
      validator: (value): value is ConnectionConfig | null => {
        if (value === null) return true;
        return safeValidateConnectionConfig(value).success;
      }
    }
  );

  // Notifier les changements de statut
  useEffect(() => {
    if (onConnectionChange) {
      onConnectionChange(context.state.status);
    }
  }, [context.state.status, onConnectionChange]);

  // Notifier les erreurs
  useEffect(() => {
    if (context.state.error && onError) {
      onError(context.state.error);
    }
  }, [context.state.error, onError]);

  // Auto-connexion au démarrage
  useEffect(() => {
    if (autoConnect && context.hasValidConfig && !context.isConnected && retryCount === 0) {
      context.connect(context.state.config!).catch(() => {
        // L'erreur est déjà gérée par le contexte
      });
    }
  }, [autoConnect, context.hasValidConfig, context.isConnected, context.state.config, retryCount]);

  // Fonction de connexion avec gestion d'erreur améliorée
  const connect = useCallback(async (config: ConnectionConfig): Promise<boolean> => {
    try {
      const success = await context.connect(config);
      if (success) {
        setRetryCount(0);
        if (persistConfig) {
          setLocalConfig(config);
        }
      }
      return success;
    } catch (error) {
      console.error('Connection failed:', error);
      return false;
    }
  }, [context, persistConfig, setLocalConfig]);

  // Fonction de déconnexion
  const disconnect = useCallback(() => {
    context.disconnect();
    setRetryCount(0);
  }, [context]);

  // Test de connexion
  const testConnection = useCallback(async (config?: ConnectionConfig): Promise<ConnectionTestResult> => {
    return context.testConnection(config);
  }, [context]);

  // Définir la configuration
  const setConfig = useCallback((config: ConnectionConfig | null) => {
    context.setConnectionConfig(config);
    if (persistConfig) {
      setLocalConfig(config);
    }
  }, [context, persistConfig, setLocalConfig]);

  // Mettre à jour partiellement la configuration
  const updateConfig = useCallback((params: Partial<ConnectionConfig>) => {
    const currentConfig = context.state.config;
    if (currentConfig) {
      const updatedConfig = { ...currentConfig, ...params };
      const validation = safeValidateConnectionConfig(updatedConfig);
      if (validation.success) {
        setConfig(validation.data);
      } else {
        console.warn('Invalid config update:', validation.error);
      }
    } else {
      // Créer une nouvelle configuration avec des valeurs par défaut
      const newConfig = {
        host: params.host || '',
        port: params.port || 8006,
        username: params.username || '',
        token: params.token || '',
        insecureTLS: params.insecureTLS || false,
        ...params,
      };
      
      const validation = safeValidateConnectionConfig(newConfig);
      if (validation.success) {
        setConfig(validation.data);
      } else {
        console.warn('Invalid new config:', validation.error);
      }
    }
  }, [context.state.config, setConfig]);

  // Effacer la configuration
  const clearConfig = useCallback(() => {
    setConfig(null);
    if (persistConfig) {
      setLocalConfig(null);
    }
  }, [setConfig, persistConfig, setLocalConfig]);

  // Valider la configuration
  const validateConfig = useCallback((config: Partial<ConnectionConfig>) => {
    const validation = ConnectionService.validateConnectionParams(config);
    return {
      isValid: validation.isValid,
      errors: validation.errors,
    };
  }, []);

  // Effacer l'erreur
  const clearError = useCallback(() => {
    context.clearError();
  }, [context]);

  // Retry de connexion
  const retry = useCallback(async (): Promise<boolean> => {
    if (!context.state.config) {
      return false;
    }

    setRetryCount(prev => prev + 1);
    return connect(context.state.config);
  }, [context.state.config, connect]);

  // Obtenir l'URL de connexion
  const getConnectionUrl = useCallback((): string | null => {
    if (!context.state.config) {
      return null;
    }
    return ConnectionService.buildBaseUrl(context.state.config);
  }, [context.state.config]);

  return {
    // État
    status: context.state.status,
    config: context.state.config,
    error: context.state.error,
    isConnected: context.isConnected,
    isConnecting: context.isConnecting,
    isValidating: context.state.isValidating,
    lastConnected: context.state.lastConnected,
    hasValidConfig: context.hasValidConfig,

    // Actions
    connect,
    disconnect,
    testConnection,
    setConfig,
    updateConfig,
    clearConfig,
    validateConfig,
    clearError,
    retry,
    getConnectionUrl,
  };
}

/**
 * Hook simplifié pour les composants qui ont juste besoin de l'état de connexion
 */
export function useConnectionStatus() {
  const { status, isConnected, isConnecting, error } = useConnection();
  
  return {
    status,
    isConnected,
    isConnecting,
    hasError: !!error,
    error,
  };
}

/**
 * Hook pour les formulaires de configuration de connexion
 */
export function useConnectionForm(initialConfig?: Partial<ConnectionConfig>) {
  const connection = useConnection();
  const context = useConnectionContext();
  const [formData, setFormData] = useState<Partial<ConnectionConfig>>(
    initialConfig || {
      host: '',
      port: 8006,
      username: '',
      token: '',
      insecureTLS: false,
    }
  );
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null);

  // Mettre à jour un champ du formulaire
  const updateField = useCallback((field: keyof ConnectionConfig, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setValidationErrors([]);
    setTestResult(null);
  }, []);

  // Valider le formulaire
  const validate = useCallback(() => {
    const validation = connection.validateConfig(formData);
    setValidationErrors(validation.errors);
    return validation.isValid;
  }, [formData, connection.validateConfig]);

  // Tester la configuration
  const testConfig = useCallback(async () => {
    if (!validate()) {
      return null;
    }

    setIsTesting(true);
    try {
      const result = await connection.testConnection(formData as ConnectionConfig);
      setTestResult(result);
      return result;
    } finally {
      setIsTesting(false);
    }
  }, [validate, connection.testConnection, formData]);

  // Sauvegarder la configuration
  const saveConfig = useCallback(() => {
    if (validate()) {
      const config = formData as ConnectionConfig;
      const id = ConnectionService.generateConfigKey(config);
      if (typeof context.addConnection === 'function' && typeof context.setActiveServer === 'function') {
        context.addConnection(id, config);
        context.setActiveServer(id);
      }
      connection.setConfig(config);
      return true;
    }
    return false;
  }, [validate, formData, context, connection]);

  return {
    formData,
    validationErrors,
    isTesting,
    testResult,
    updateField,
    validate,
    testConfig,
    saveConfig,
    isValid: validationErrors.length === 0 && (
      formData.host !== undefined &&
      formData.port !== undefined &&
      formData.username !== undefined &&
      formData.token !== undefined &&
      formData.insecureTLS !== undefined &&
      ConnectionService.isConfigurationComplete(formData as ConnectionConfig)
    ),
  };
}

/**
 * Hook pour surveiller la connectivité
 */
export function useConnectionMonitor(onConnectionLost?: () => void) {
  const { status, error, retry } = useConnection();
  const [connectionLostCount, setConnectionLostCount] = useState(0);

  useEffect(() => {
    if (status === 'error' && error) {
      setConnectionLostCount(prev => prev + 1);
      onConnectionLost?.();
    } else if (status === 'connected') {
      setConnectionLostCount(0);
    }
  }, [status, error, onConnectionLost]);

  return {
    connectionLostCount,
    isConnectionLost: status === 'error',
    retry,
  };
}