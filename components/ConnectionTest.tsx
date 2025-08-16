'use client';

/**
 * Composant de test pour démontrer l'utilisation du système de connexion
 */

import React from 'react';
import { useConnection, useConnectionForm } from '@/hooks/useConnection';
import { ConnectionProvider } from '@/lib/contexts/ConnectionContext';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

// Composant de formulaire de connexion
function ConnectionForm() {
  const {
    formData,
    validationErrors,
    isTesting,
    testResult,
    updateField,
    testConfig,
    saveConfig,
    isValid,
  } = useConnectionForm();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isValid) {
      const success = saveConfig();
      if (success) {
        console.log('Configuration sauvegardée avec succès');
      }
    }
  };

  const handleTest = async () => {
    const result = await testConfig();
    console.log('Résultat du test:', result);
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Configuration de Connexion</h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            Hôte
          </label>
          <input
            type="text"
            value={formData.host || ''}
            onChange={(e) => updateField('host', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="192.168.1.100"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Port
          </label>
          <input
            type="number"
            value={formData.port || 8006}
            onChange={(e) => updateField('port', parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            min="1"
            max="65535"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Nom d&apos;utilisateur
          </label>
          <input
            type="text"
            value={formData.username || ''}
            onChange={(e) => updateField('username', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="root@pam"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Token
          </label>
          <input
            type="password"
            value={formData.token || ''}
            onChange={(e) => updateField('token', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="API Token"
          />
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="insecureTLS"
            checked={formData.insecureTLS || false}
            onChange={(e) => updateField('insecureTLS', e.target.checked)}
            className="mr-2"
          />
          <label htmlFor="insecureTLS" className="text-sm">
            Autoriser TLS non sécurisé
          </label>
        </div>

        {validationErrors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <h4 className="text-red-800 font-medium mb-2">Erreurs de validation:</h4>
            <ul className="text-red-700 text-sm space-y-1">
              {validationErrors.map((error, index) => (
                <li key={index}>• {error}</li>
              ))}
            </ul>
          </div>
        )}

        {testResult && (
          <div className={`border rounded-md p-3 ${
            testResult.success 
              ? 'bg-green-50 border-green-200' 
              : 'bg-red-50 border-red-200'
          }`}>
            <h4 className={`font-medium mb-2 ${
              testResult.success ? 'text-green-800' : 'text-red-800'
            }`}>
              {testResult.success ? 'Test réussi!' : 'Test échoué'}
            </h4>
            {testResult.success && testResult.responseTime && (
              <p className="text-green-700 text-sm">
                Temps de réponse: {testResult.responseTime}ms
              </p>
            )}
            {testResult.success && testResult.serverInfo && (
              <div className="text-green-700 text-sm mt-1">
                {testResult.serverInfo.version && (
                  <p>Version: {testResult.serverInfo.version}</p>
                )}
                {testResult.serverInfo.release && (
                  <p>Release: {testResult.serverInfo.release}</p>
                )}
              </div>
            )}
            {!testResult.success && testResult.error && (
              <p className="text-red-700 text-sm">
                {testResult.error.message}
              </p>
            )}
          </div>
        )}

        <div className="flex space-x-3">
          <Button
            type="button"
            onClick={handleTest}
            disabled={!isValid || isTesting}
            variant="secondary"
          >
            {isTesting ? 'Test en cours...' : 'Tester la connexion'}
          </Button>
          
          <Button
            type="submit"
            disabled={!isValid}
          >
            Sauvegarder
          </Button>
        </div>
      </form>
    </Card>
  );
}

// Composant d'état de connexion
function ConnectionStatus() {
  const { 
    status, 
    config, 
    error, 
    isConnected, 
    isConnecting, 
    lastConnected,
    connect,
    disconnect,
    clearError,
    getConnectionUrl 
  } = useConnection();

  const handleConnect = async () => {
    if (config) {
      const success = await connect(config);
      console.log('Connexion:', success ? 'réussie' : 'échouée');
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'connected': return 'text-green-600';
      case 'connecting': return 'text-yellow-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'connected': return 'Connecté';
      case 'connecting': return 'Connexion en cours...';
      case 'error': return 'Erreur de connexion';
      default: return 'Déconnecté';
    }
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">État de la Connexion</h3>
      
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-medium">Statut:</span>
          <span className={`font-semibold ${getStatusColor()}`}>
            {getStatusText()}
          </span>
        </div>

        {config && (
          <div className="flex items-center justify-between">
            <span className="font-medium">Serveur:</span>
            <span className="text-sm text-gray-600">
              {getConnectionUrl()}
            </span>
          </div>
        )}

        {lastConnected && (
          <div className="flex items-center justify-between">
            <span className="font-medium">Dernière connexion:</span>
            <span className="text-sm text-gray-600">
              {lastConnected.toLocaleString()}
            </span>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <div className="flex items-center justify-between">
              <span className="text-red-800 text-sm">{error}</span>
              <Button
                onClick={clearError}
                variant="secondary"
                size="sm"
              >
                Effacer
              </Button>
            </div>
          </div>
        )}

        <div className="flex space-x-3 pt-3">
          {!isConnected && config && (
            <Button
              onClick={handleConnect}
              disabled={isConnecting}
            >
              {isConnecting ? 'Connexion...' : 'Se connecter'}
            </Button>
          )}
          
          {isConnected && (
            <Button
              onClick={disconnect}
              variant="secondary"
            >
              Se déconnecter
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

// Composant principal de test
function ConnectionTestContent() {
  const { isConnected, isConnecting, hasValidConfig, status, error } = require('@/hooks/useConnection').useConnection();

  console.log('[ConnectionTest] Render - isConnected:', isConnected, 'isConnecting:', isConnecting, 'hasValidConfig:', hasValidConfig, 'status:', status, 'error:', error);

  // Si pas de config valide ou erreur, afficher uniquement le formulaire
  if (!hasValidConfig || status === 'error' || !isConnected) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Connexion Proxmox requise
        </h1>
        <div className="grid grid-cols-1 gap-6">
          <ConnectionForm />
        </div>
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3 mt-4">
            <span className="text-red-800 text-sm">{error}</span>
          </div>
        )}
      </div>
    );
  }

  // Sinon, afficher le statut de connexion
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">
        Test du Système de Connexion Proxmox
      </h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ConnectionForm />
        <ConnectionStatus />
      </div>
    </div>
  );
}

// Composant avec Provider
export function ConnectionTest() {
  return (
    <ConnectionProvider>
      <ConnectionTestContent />
    </ConnectionProvider>
  );
}

export default ConnectionTest;