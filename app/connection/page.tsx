'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMultiConnection, useConnectionContext } from '@/lib/contexts/ConnectionContext';
import { ConnectionConfig, ConnectionStatus } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

function ServerForm({
  initial,
  onSubmit,
  onCancel,
}: {
  initial?: Partial<ConnectionConfig>;
  onSubmit: (config: ConnectionConfig) => void;
  onCancel: () => void;
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
        />
      </div>
      <div>
        <label>Username</label>
        <input
          className="w-full border rounded px-2 py-1"
          value={username}
          onChange={e => setUsername(e.target.value)}
          required
        />
      </div>
      <div>
        <label>Token</label>
        <input
          className="w-full border rounded px-2 py-1"
          value={token}
          onChange={e => setToken(e.target.value)}
          required
        />
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={insecureTLS}
          onChange={e => setInsecureTLS(e.target.checked)}
          id="insecureTLS"
        />
        <label htmlFor="insecureTLS">Allow insecure TLS</label>
      </div>
      <div className="flex gap-2 mt-2">
        <Button type="submit">Save</Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
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

  // Redirect if connected
  React.useEffect(() => {
    if (isConnected) {
      router.push('/');
    }
  }, [isConnected, router]);

  // Add server handler
  function handleAdd(config: ConnectionConfig) {
    const id = `${config.host}:${config.port}`;
    addConnection(id, config);
    setShowAdd(false);
  }

  // Edit server handler
  function handleEdit(config: ConnectionConfig) {
    if (editId) {
      addConnection(editId, config); // Overwrite
      setEditId(null);
      setEditInitial(null);
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
    setEditId(id);
    setEditInitial(config);
  }

  // Connect/disconnect
  async function handleConnect(id: string, config: ConnectionConfig) {
    setActiveServer(id);
    await connect(config);
  }
  function handleDisconnect() {
    disconnect();
  }

  return (
    <div className="max-w-2xl mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">Proxmox Servers</h1>
      <Card className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="font-semibold">Saved Servers</span>
          <Button onClick={() => setShowAdd(true)}>Add Server</Button>
        </div>
        <ul className="divide-y">
          {Object.entries(connections).length === 0 && (
            <li className="py-4 text-gray-500 text-center">No servers saved.</li>
          )}
          {Object.entries(connections).map(([id, conn]) => {
            const isActive = id === activeServerId;
            const status = conn.status as ConnectionStatus;
            return (
              <li
                key={id}
                className={`flex flex-col md:flex-row md:items-center justify-between gap-2 py-3 px-2 rounded ${isActive ? 'bg-blue-50 border-l-4 border-blue-500' : ''}`}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${status === 'connected' ? 'bg-green-500' : status === 'connecting' ? 'bg-yellow-400 animate-pulse' : status === 'error' ? 'bg-red-500' : 'bg-gray-400'}`}></span>
                    <span className="font-mono">{conn.config?.host}:{conn.config?.port}</span>
                    {isActive && (
                      <span className="ml-2 px-2 py-0.5 text-xs bg-blue-200 text-blue-800 rounded">Active</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500">
                    User: {conn.config?.username}
                  </div>
                  {conn.error && (
                    <div className="text-xs text-red-600">Error: {conn.error}</div>
                  )}
                  {conn.lastConnected && (
                    <div className="text-xs text-gray-400">
                      Last connected: {new Date(conn.lastConnected).toLocaleString()}
                    </div>
                  )}
                </div>
                <div className="flex gap-2 flex-wrap">
                  {!isActive && (
                    <Button size="sm" onClick={() => handleSetActive(id)}>
                      Set Active
                    </Button>
                  )}
                  {isActive && status !== 'connected' && (
                    <Button
                      size="sm"
                      loading={isConnecting}
                      onClick={() => conn.config && handleConnect(id, conn.config)}
                    >
                      Connect
                    </Button>
                  )}
                  {isActive && status === 'connected' && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={handleDisconnect}
                    >
                      Disconnect
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => conn.config && startEdit(id, conn.config)}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => handleRemove(id)}
                  >
                    Remove
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      </Card>
      {/* Add Server Modal */}
      {showAdd && (
        <Card className="mb-4">
          <h2 className="font-semibold mb-2">Add New Server</h2>
          <ServerForm
            onSubmit={handleAdd}
            onCancel={() => setShowAdd(false)}
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
            }}
          />
        </Card>
      )}
    </div>
  );
}