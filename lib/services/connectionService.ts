/**
 * Service de connexion pour tester et valider la connectivité au serveur Proxmox
 */

import {
  ConnectionConfig,
  ConnectionTestResult,
  ConnectionError,
  validateConnectionConfig
} from '@/lib/types';

export class ConnectionService {
  private static readonly DEFAULT_TIMEOUT = 10000; // 10 secondes
  private static readonly TEST_ENDPOINT = '/api2/json/version';

  /**
   * Teste la connexion au serveur Proxmox
   */
  static async testConnection(config: ConnectionConfig): Promise<ConnectionTestResult> {
    const startTime = Date.now();
    
    try {
      // Valider la configuration
      const validatedConfig = validateConnectionConfig(config);
      
      // Construire l'URL de test
      const protocol = validatedConfig.insecureTLS ? 'http' : 'https';
      const baseUrl = `${protocol}://${validatedConfig.host}:${validatedConfig.port}`;
      const testUrl = `${baseUrl}${this.TEST_ENDPOINT}`;

      // Créer les headers d'authentification
      const headers = new Headers({
        'Content-Type': 'application/json',
        'Authorization': `PVEAPIToken=${validatedConfig.username}=${validatedConfig.token}`,
      });

      // Effectuer la requête de test
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.DEFAULT_TIMEOUT);

      try {
        const response = await fetch(testUrl, {
          method: 'GET',
          headers,
          signal: controller.signal,
          // Désactiver le cache pour s'assurer d'un test en temps réel
          cache: 'no-store',
        });

        clearTimeout(timeoutId);
        const responseTime = Date.now() - startTime;

        if (!response.ok) {
          return {
            success: false,
            responseTime,
            error: this.createConnectionError(
              response.status === 401 ? 'authentication' : 'network',
              `HTTP ${response.status}: ${response.statusText}`,
              response.status.toString()
            ),
          };
        }

        // Tenter de parser la réponse pour obtenir les informations du serveur
        let serverInfo;
        try {
          const data = await response.json();
          serverInfo = {
            version: data?.data?.version || undefined,
            release: data?.data?.release || undefined,
          };
        } catch {
          // Ignorer les erreurs de parsing, l'important est que la connexion fonctionne
        }

        return {
          success: true,
          responseTime,
          serverInfo,
        };

      } catch (fetchError) {
        clearTimeout(timeoutId);
        const responseTime = Date.now() - startTime;

        if (fetchError instanceof Error) {
          if (fetchError.name === 'AbortError') {
            return {
              success: false,
              responseTime,
              error: this.createConnectionError(
                'timeout',
                `Connection timeout after ${this.DEFAULT_TIMEOUT}ms`
              ),
            };
          }

          // Erreurs de réseau (CORS, DNS, etc.)
          return {
            success: false,
            responseTime,
            error: this.createConnectionError(
              'network',
              `Network error: ${fetchError.message}`
            ),
          };
        }

        return {
          success: false,
          responseTime,
          error: this.createConnectionError(
            'unknown',
            'Unknown connection error'
          ),
        };
      }

    } catch (validationError) {
      return {
        success: false,
        error: this.createConnectionError(
          'validation',
          validationError instanceof Error 
            ? `Configuration validation failed: ${validationError.message}`
            : 'Invalid configuration'
        ),
      };
    }
  }

  /**
   * Teste la connexion avec retry automatique
   */
  static async testConnectionWithRetry(
    config: ConnectionConfig, 
    maxRetries: number = 3,
    retryDelay: number = 1000
  ): Promise<ConnectionTestResult> {
    let lastResult: ConnectionTestResult;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      lastResult = await this.testConnection(config);

      if (lastResult.success) {
        return lastResult;
      }

      // Ne pas retry sur les erreurs d'authentification ou de validation
      if (lastResult.error?.type === 'authentication' || lastResult.error?.type === 'validation') {
        return lastResult;
      }

      // Attendre avant le prochain essai (sauf pour le dernier)
      if (attempt < maxRetries) {
        await this.delay(retryDelay * attempt); // Délai progressif
      }
    }

    return lastResult!;
  }

  /**
   * Valide les paramètres de connexion sans effectuer de requête réseau
   */
  static validateConnectionParams(config: Partial<ConnectionConfig>): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!config.host || config.host.trim() === '') {
      errors.push('Host is required');
    } else {
      // Validation basique du format d'hôte
      const hostRegex = /^[a-zA-Z0-9.-]+$/;
      if (!hostRegex.test(config.host.trim())) {
        errors.push('Invalid host format');
      }
    }

    if (!config.port || config.port < 1 || config.port > 65535) {
      errors.push('Port must be between 1 and 65535');
    }

    if (!config.username || config.username.trim() === '') {
      errors.push('Username is required');
    }

    if (!config.token || config.token.trim() === '') {
      errors.push('Token is required');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Construit une URL de base à partir de la configuration
   */
  static buildBaseUrl(config: ConnectionConfig): string {
    const protocol = config.insecureTLS ? 'http' : 'https';
    return `${protocol}://${config.host}:${config.port}`;
  }

  /**
   * Vérifie si une configuration est complète
   */
  static isConfigurationComplete(config: Partial<ConnectionConfig>): config is ConnectionConfig {
    return !!(
      config.host &&
      config.port &&
      config.username &&
      config.token &&
      typeof config.insecureTLS === 'boolean'
    );
  }

  /**
   * Crée un objet d'erreur de connexion standardisé
   */
  private static createConnectionError(
    type: ConnectionError['type'],
    message: string,
    code?: string
  ): ConnectionError {
    return {
      type,
      message,
      code,
      timestamp: new Date(),
    };
  }

  /**
   * Utilitaire pour créer un délai
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Nettoie et normalise une configuration de connexion
   */
  static sanitizeConfig(config: Partial<ConnectionConfig>): Partial<ConnectionConfig> {
    return {
      host: config.host?.trim(),
      port: config.port || 8006,
      username: config.username?.trim(),
      token: config.token?.trim(),
      insecureTLS: config.insecureTLS || false,
    };
  }

  /**
   * Génère une clé unique pour identifier une configuration
   */
  static generateConfigKey(config: ConnectionConfig): string {
    return `${config.host}:${config.port}:${config.username}`;
  }
}

// Export des fonctions utilitaires pour une utilisation directe
export const {
  testConnection,
  testConnectionWithRetry,
  validateConnectionParams,
  buildBaseUrl,
  isConfigurationComplete,
  sanitizeConfig,
  generateConfigKey,
} = ConnectionService;