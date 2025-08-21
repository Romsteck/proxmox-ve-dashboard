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
  private static readonly TEST_ENDPOINT = '/api/proxmox/version';

  static async testConnection(config: ConnectionConfig): Promise<ConnectionTestResult> {
    const startTime = Date.now();
    
    try {
      const validatedConfig = validateConnectionConfig(config);
      const protocol = 'https';
      const testUrl = `${this.TEST_ENDPOINT}?host=${encodeURIComponent(validatedConfig.host)}&port=${encodeURIComponent(String(validatedConfig.port))}&protocol=${encodeURIComponent(protocol)}&verifyTLS=${encodeURIComponent(String(!validatedConfig.insecureTLS))}`;
      const headers = new Headers({
        'Content-Type': 'application/json',
      });
      if (validatedConfig.token) {
        headers.set('Authorization', `PVEAPIToken=${validatedConfig.username}=${validatedConfig.token}`);
      }
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.DEFAULT_TIMEOUT);

      try {
        const response = await fetch(testUrl, {
          method: 'GET',
          headers,
          signal: controller.signal,
          cache: 'no-store',
        });

        clearTimeout(timeoutId);
        const responseTime = Date.now() - startTime;

        if (!response.ok) {
          let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
          if (response.status === 502 || response.status === 504) {
            errorMessage = "Impossible de joindre le serveur Proxmox distant depuis le backend. " +
              "Vérifiez la connectivité réseau, l’accessibilité du port ou le déploiement du backend sur le même réseau que Proxmox.";
          }
          return {
            success: false,
            responseTime,
            error: this.createConnectionError(
              response.status === 401 ? 'authentication' : 'network',
              errorMessage,
              response.status.toString()
            ),
          };
        }

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

      if (lastResult.error?.type === 'authentication' || lastResult.error?.type === 'validation') {
        return lastResult;
      }

      if (attempt < maxRetries) {
        await this.delay(retryDelay * attempt);
      }
    }

    return lastResult!;
  }

  static validateConnectionParams(config: Partial<ConnectionConfig>): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!config.host || config.host.trim() === '') {
      errors.push('Host is required');
    } else {
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

  static buildBaseUrl(config: ConnectionConfig): string {
    const protocol = config.insecureTLS ? 'http' : 'https';
    return `${protocol}://${config.host}:${config.port}`;
  }

  static isConfigurationComplete(config: Partial<ConnectionConfig>): config is ConnectionConfig {
    return !!(
      config.host &&
      config.port &&
      config.username &&
      config.token &&
      typeof config.insecureTLS === 'boolean'
    );
  }

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

  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  static sanitizeConfig(config: Partial<ConnectionConfig>): Partial<ConnectionConfig> {
    return {
      host: config.host?.trim(),
      port: config.port || 8006,
      username: config.username?.trim(),
      token: config.token?.trim(),
      insecureTLS: config.insecureTLS || false,
    };
  }

  static generateConfigKey(config: ConnectionConfig): string {
    return `${config.host}:${config.port}:${config.username}`;
  }
  static async deleteServer(id: string): Promise<void> {
    const response = await fetch('/api/servers', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id }),
    });
    if (!response.ok) {
      const message = await response.text();
      throw new Error(`Erreur suppression serveur (HTTP ${response.status}): ${message}`);
    }
  }

  static async updateServer(id: string, data: object): Promise<any> {
    console.log("[DEBUG updateServer] Envoi de la requête PUT:", {
      id,
      type: typeof id,
      length: id.length,
      isValidObjectId: /^[0-9a-fA-F]{24}$/.test(id),
      data,
      payload: { id, ...data },
      timestamp: new Date().toISOString()
    });
    
    try {
      const response = await fetch(`/api/servers/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      console.log("[DEBUG updateServer] Réponse reçue:", {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        timestamp: new Date().toISOString()
      });
      
      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        let errorDetails = '';
        
        try {
          const errorData = await response.json();
          errorDetails = errorData.error || errorData.message || '';
          if (errorDetails) {
            errorMessage = errorDetails;
          }
        } catch {
          try {
            errorDetails = await response.text();
            if (errorDetails) {
              errorMessage = errorDetails;
            }
          } catch {
          }
        }
        
        console.error("[DEBUG updateServer] Erreur de l'API:", {
          status: response.status,
          statusText: response.statusText,
          errorMessage,
          errorDetails,
          id,
          timestamp: new Date().toISOString()
        });
        
        if (response.status === 404) {
          throw new Error(`Erreur mise à jour serveur (HTTP ${response.status}): ${errorMessage}`);
        } else if (response.status === 400) {
          throw new Error(`Données invalides (HTTP ${response.status}): ${errorMessage}`);
        } else if (response.status >= 500) {
          throw new Error(`Erreur serveur (HTTP ${response.status}): ${errorMessage}`);
        } else {
          throw new Error(`Erreur mise à jour serveur (HTTP ${response.status}): ${errorMessage}`);
        }
      }
      
      const result = await response.json();
      console.log("[DEBUG updateServer] Mise à jour réussie:", {
        result,
        timestamp: new Date().toISOString()
      });
      
      return result;
      
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.error("[DEBUG updateServer] Erreur réseau:", error.message);
        throw new Error(`Erreur de connexion réseau: ${error.message}`);
      }
      
      throw error;
    }
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
  deleteServer,
  updateServer,
} = ConnectionService;