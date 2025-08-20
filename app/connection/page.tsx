'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useMultiConnection, useConnectionContext } from '@/lib/contexts/ConnectionContext';
import { ConnectionConfig, ConnectionStatus } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

import { deleteServer, updateServer } from '@/lib/services/connectionService';
 
function ServerForm({
  initial,
  onSubmit,
  onCancel,
  isSubmitting,
  error,
  success,
}: {
  initial?: Partial<ConnectionConfig>;
  onSubmit: (config: ConnectionConfig) => Promise<void> | void;
  onCancel: () => void;
  isSubmitting?: boolean;
  error?: string | null;
  success?: boolean;
}) {
  const [host, setHost] = useState(initial?.host || '');
  const [port, setPort] = useState(initial?.port?.toString() || '8006');
  const [username, setUsername] = useState(initial?.username || '');
  const [token, setToken] = useState(initial?.token || '');
  const [insecureTLS, setInsecureTLS] = useState(initial?.insecureTLS || false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      host,
      port: Number(port),
      username,
      token,
      insecureTLS,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2 p-2">
      <div>
        <label>Host</label>
        <input
          className="w-full border rounded px-2 py-1"
          value={host}
          onChange={e => setHost(e.target.value)}
          required
          disabled={isSubmitting}
        />
      </div>
      <div>
        <label>Port</label>
        <input
          className="w-full border rounded px-2 py-1"
          type="number"
          value={port}
          onChange={e => setPort(e.target.value)}
          min={1}
          max={65535}
          required
          disabled={isSubmitting}
        />
      </div>
      <div>
        <label>Username</label>
        <input
          className="w-full border rounded px-2 py-1"
          value={username}
          onChange={e => setUsername(e.target.value)}
          required
          disabled={isSubmitting}
        />
      </div>
      <div>
        <label>Token</label>
        <input
          className="w-full border rounded px-2 py-1"
          value={token}
          onChange={e => setToken(e.target.value)}
          required
          disabled={isSubmitting}
        />
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={insecureTLS}
          onChange={e => setInsecureTLS(e.target.checked)}
          id="insecureTLS"
          disabled={isSubmitting}
        />
        <label htmlFor="insecureTLS">Allow insecure TLS</label>
      </div>
      {error && (
        <div className="text-red-600 text-sm">{error}</div>
      )}
      {success && (
        <div className="text-green-600 text-sm">Server added successfully!</div>
      )}
      <div className="flex gap-2 mt-2">
        <Button type="submit" loading={isSubmitting} disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : 'Save'}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

export default function ConnectionPage() {
  const router = useRouter();
  const {
    connections,
    activeServerId,
    addConnection,
    removeConnection,
    setActiveServer,
  } = useMultiConnection();
  const {
    state: activeConnection,
    connect,
    disconnect,
    isConnected,
    isConnecting,
  } = useConnectionContext();

  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editInitial, setEditInitial] = useState<Partial<ConnectionConfig> | null>(null);

  // Add server form feedback state
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [addSuccess, setAddSuccess] = useState(false);

  // Connexion feedback state
  const [connectError, setConnectError] = useState<string | null>(null);

  // Server list from API
  const [servers, setServers] = useState<any[]>([]);
  const [serversLoading, setServersLoading] = useState(false);
  const [serversError, setServersError] = useState<string | null>(null);
  
  // Erreur pour suppression/modification
  const [serverActionError, setServerActionError] = useState<string | null>(null);

  // Fetch servers from API
  const fetchServers = useCallback(async () => {
    setServersLoading(true);
    setServersError(null);
    try {
      const res = await fetch('/api/servers');
      if (!res.ok) throw new Error('Failed to fetch servers');
      const data = await res.json();
      const servers = Array.isArray(data) ? data : data.servers || [];
      
      console.log("[DEBUG fetchServers] Serveurs récupérés:", servers.map((s: any) => ({
        _id: s._id,
        id: s.id,
        host: s.host,
        port: s.port,
        hasValidId: s._id && /^[0-9a-fA-F]{24}$/.test(s._id),
        fallbackId: `${s.host}:${s.port}`
      })));
      
      setServers(servers);
    } catch (err: any) {
      setServersError(err.message || 'Failed to fetch servers');
    } finally {
      setServersLoading(false);
    }
  }, []);

  // Fetch on mount and after successful add
  useEffect(() => {
    fetchServers();
  }, [fetchServers]);

  useEffect(() => {
    if (addSuccess) {
      fetchServers();
    }
  }, [addSuccess, fetchServers]);

  // NOUVELLE FONCTIONNALITÉ : Synchronisation automatique périodique
  useEffect(() => {
    console.log("[DEBUG useEffect] Mise en place de la synchronisation automatique");
    
    // Synchronisation toutes les 30 secondes pour éviter les désynchronisations
    const syncInterval = setInterval(() => {
      console.log("[DEBUG syncInterval] Synchronisation automatique des serveurs");
      fetchServers();
    }, 30000); // 30 secondes

    // Synchronisation lors du focus de la fenêtre (retour sur l'onglet)
    const handleFocus = () => {
      console.log("[DEBUG handleFocus] Fenêtre refocalisée, synchronisation des serveurs");
      fetchServers();
    };
    
    window.addEventListener('focus', handleFocus);
    
    // Nettoyage
    return () => {
      clearInterval(syncInterval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [fetchServers]);

  // Redirect if connected
  useEffect(() => {
    if (isConnected) {
      router.push('/');
    }
  }, [isConnected, router]);

  // Connect automatically when activeServerId changes
  useEffect(() => {
    if (activeServerId) {
      const server = servers.find(s => (s._id || s.id) === activeServerId);
      if (server && !isConnected && !isConnecting) {
        connect(server._id || `${server.host}:${server.port}`, server);
      }
    }
  }, [activeServerId, servers, connect, isConnected, isConnecting]);

  // Add server handler (local only, but triggers refetch)
  async function handleAdd(config: ConnectionConfig) {
    setAddError(null);
    setAddSuccess(false);
    setAddLoading(true);
    try {
      // POST to /api/servers
      const res = await fetch('/api/servers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData?.error || 'Failed to add server.');
      }
      setAddSuccess(true);
      setAddLoading(false);
      setTimeout(() => {
        setShowAdd(false);
        setAddSuccess(false);
      }, 1000);
    } catch (err: any) {
      setAddError(err.message || 'Failed to add server.');
      setAddLoading(false);
    }
  }

  // Edit server handler simplifié sans validation préventive
  const [editLoading, setEditLoading] = React.useState(false);
  async function handleEdit(config: ConnectionConfig) {
    if (editId) {
      console.log("[DEBUG handleEdit] Tentative de modification avec ID:", {
        editId,
        type: typeof editId,
        length: editId.length,
        isValidObjectId: /^[0-9a-fA-F]{24}$/.test(editId),
        config: { host: config.host, port: config.port }
      });
      
      setEditLoading(true);
      setServerActionError(null);
      
      try {
        console.log("[DEBUG handleEdit] Procédure de mise à jour directe...");
        const updated = await updateServer(editId, config);
        
        // Mise à jour optimiste de l'état local
        setServers(servers =>
          servers.map(s =>
            (s._id === editId || (s._id?.toString && s._id.toString() === editId) ? { ...s, ...updated.server } : s)
          )
        );
        setEditId(null);
        setEditInitial(null);
        setServerActionError(null);
        
        // Confirmation de succès
        console.log("[DEBUG handleEdit] Modification réussie");
        
      } catch (err: any) {
        console.log("[DEBUG handleEdit] Erreur capturée:", {
          errorMessage: err.message,
          errorType: typeof err,
          errorName: err.name,
          timestamp: new Date().toISOString()
        });
        
        // Analyser le message d'erreur pour détecter les erreurs 404
        const httpStatusMatch = err.message?.match(/HTTP (\d+)/);
        const httpStatus = httpStatusMatch ? parseInt(httpStatusMatch[1]) : null;
        const isActual404 = httpStatus === 404 || err.message?.includes('Aucun serveur trouvé avec cet ID');
        
        if (isActual404) {
          console.log("[DEBUG handleEdit] Erreur 404 détectée, synchronisation de la liste...");
          // Synchroniser avec la base pour avoir l'état actuel
          await fetchServers();
          setEditId(null);
          setEditInitial(null);
          setServerActionError('Ce serveur n\'existe plus. La liste a été mise à jour.');
        } else {
          console.log("[DEBUG handleEdit] Autre type d'erreur:", err.message);
          setServerActionError(err.message || 'Erreur lors de la modification.');
        }
      } finally {
        setEditLoading(false);
      }
    }
  }

  // Remove server handler
  function handleRemove(id: string) {
    removeConnection(id);
  }

  // Set active server
  function handleSetActive(id: string) {
    setActiveServer(id);
  }

  // Start editing
  function startEdit(id: string, config: ConnectionConfig) {
    console.log("[DEBUG startEdit] ID reçu:", {
      id,
      type: typeof id,
      length: id.length,
      isValidObjectId: /^[0-9a-fA-F]{24}$/.test(id),
      config: { host: config.host, port: config.port }
    });
    setEditId(id);
    setEditInitial(config);
  }

  // Connect/disconnect
  // Fonction pour gérer la connexion à un serveur Proxmox
  // Cette fonction met à jour l'état d'erreur de connexion, définit le serveur actif,
  // puis tente d'établir la connexion via le contexte de connexion.
  // En cas d'échec, elle capture l'erreur et met à jour l'état d'erreur pour affichage.
  async function handleConnect(id: string, config: ConnectionConfig) {
    console.log("[handleConnect] DÉBUT", { id, config, activeServerId, isConnected, isConnecting, date: new Date().toISOString() });
    setConnectError(null); // Réinitialise l'erreur de connexion avant de tenter la connexion
    if (id !== activeServerId) {
      console.log("[handleConnect] setActiveServer", { id, prevActiveServerId: activeServerId });
      setActiveServer(id); // Met à jour le serveur actif seulement si différent
    }
    try {
      const result = await connect(id, config); // Tente la connexion avec la configuration fournie
      console.log("[handleConnect] Résultat connect", { result, date: new Date().toISOString() });
    } catch (error) {
      // En cas d'erreur, met à jour l'état avec le message d'erreur approprié
      console.log("[handleConnect] ERREUR", { error, date: new Date().toISOString() });
      setConnectError(error instanceof Error ? error.message : 'Connection failed');
    }
    console.log("[handleConnect] FIN", { id, config, activeServerId, isConnected, isConnecting, date: new Date().toISOString() });
  }
  function handleDisconnect() {
    disconnect();
  }

  return (
    <div className="max-w-2xl mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">Proxmox Servers</h1>
      <Card className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="font-semibold">Server List</span>
          <Button onClick={() => setShowAdd(true)}>Add Server</Button>
        </div>
        {connectError && (
          <div className="text-red-600 text-sm mb-2">{connectError}</div>
        )}
        {serverActionError && (
          <div className="text-red-600 text-sm mb-2">{serverActionError}</div>
        )}
        <ul className="divide-y">
          {serversLoading && (
            <li className="py-4 text-gray-500 text-center">Loading servers...</li>
          )}
          {serversError && (
            <li className="py-4 text-red-600 text-center">{serversError}</li>
          )}
          {!serversLoading && !serversError && servers.length === 0 && (
            <li className="py-4 text-gray-500 text-center">No servers found.</li>
          )}
          {!serversLoading && !serversError && servers.map((server: any, idx: number) => (
            <li
              key={server._id || `${server.host}:${server.port}` || idx}
              className="flex flex-col md:flex-row md:items-center justify-between gap-2 py-3 px-2 rounded"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono">{server.host}:{server.port}</span>
                </div>
                <div className="text-xs text-gray-500">
                  User: {server.username}
                </div>
                <div className="flex gap-2 mt-2">
                  {/* Bouton pour se connecter au serveur sélectionné */}
                  <Button
                    onClick={() => handleConnect(server._id || `${server.host}:${server.port}`, server)}
                    disabled={isConnecting && activeServerId === (server._id || `${server.host}:${server.port}`)}
                    loading={isConnecting && activeServerId === (server._id || `${server.host}:${server.port}`)}
                  >
                    {isConnecting && activeServerId === (server._id || `${server.host}:${server.port}`) ? 'Connexion en cours...' : 'Se connecter'}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setServerActionError(null);
                      const serverId = server._id || `${server.host}:${server.port}`;
                      console.log("[DEBUG onClick Modifier] Serveur sélectionné:", {
                        server_id: server._id,
                        server_id_type: typeof server._id,
                        fallback_id: `${server.host}:${server.port}`,
                        final_id: serverId,
                        isValidObjectId: serverId && /^[0-9a-fA-F]{24}$/.test(serverId)
                      });
                      startEdit(serverId, server);
                    }}
                  >
                    Modifier
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={async () => {
                      setServerActionError(null);
                      if (window.confirm('Supprimer ce serveur ?')) {
                        try {
                          console.log("[DEBUG handleDelete] Tentative de suppression:", {
                            serverId: server._id,
                            serverHost: server.host,
                            serverPort: server.port
                          });
                          
                          await deleteServer(server._id);
                          
                          // Mise à jour optimiste de l'état local
                          setServers(servers => servers.filter(s => s._id !== server._id));
                          console.log("[DEBUG handleDelete] Suppression réussie");
                          
                        } catch (err: any) {
                          console.log("[DEBUG handleDelete] Erreur lors de la suppression:", {
                            error: err.message,
                            serverId: server._id
                          });
                          
                          // Vérifier si c'est une erreur 404 (serveur déjà supprimé)
                          const httpStatusMatch = err.message?.match(/HTTP (\d+)/);
                          const httpStatus = httpStatusMatch ? parseInt(httpStatusMatch[1]) : null;
                          const isActual404 = httpStatus === 404 || err.message?.includes('Aucun serveur trouvé');
                          
                          if (isActual404) {
                            console.log("[DEBUG handleDelete] Serveur déjà supprimé, synchronisation de la liste...");
                            await fetchServers(); // Synchroniser la liste
                            setServerActionError('Ce serveur avait déjà été supprimé. La liste a été mise à jour.');
                          } else {
                            setServerActionError(err.message || 'Erreur lors de la suppression.');
                          }
                        }
                      }
                    }}
                  >
                    Supprimer
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </Card>
      {/* Add Server Modal */}
      {showAdd && (
        <Card className="mb-4">
          <h2 className="font-semibold mb-2">Add New Server</h2>
          <ServerForm
            onSubmit={handleAdd}
            onCancel={() => setShowAdd(false)}
            isSubmitting={addLoading}
            error={addError}
            success={addSuccess}
          />
        </Card>
      )}
      {/* Edit Server Modal */}
      {editId && editInitial && (
        <Card className="mb-4">
          <h2 className="font-semibold mb-2">Edit Server</h2>
          <ServerForm
            initial={editInitial}
            onSubmit={handleEdit}
            onCancel={() => {
              setEditId(null);
              setEditInitial(null);
              setServerActionError(null);
            }}
            isSubmitting={editLoading}
            error={serverActionError}
          />
        </Card>
      )}
    </div>
  );
}
