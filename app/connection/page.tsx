"use client";
import React, { useState } from "react";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import Icon from "@/components/ui/Icon";
import { Server } from "lucide-react";
import { useRouter } from "next/navigation";
import { useConnectionContext } from "@/lib/contexts/ConnectionContext";

export default function ConnectionPage() {
  const [host, setHost] = useState("");
  const [port, setPort] = useState("8006");
  const [username, setUsername] = useState("");
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  const { connect, addConnection, setActiveServer } = useConnectionContext();

  // Génère un id unique pour la connexion (clé simple)
  const getServerId = () => `${host}:${port}:${username}`;

  const handleTestConnection = async () => {
    setError(null);
    setLoading(true);
    try {
      const id = getServerId();
      addConnection(id, {
        host,
        port: Number(port),
        username,
        token,
        insecureTLS: false,
      });
      setActiveServer(id);
      const success = await connect(id, {
        host,
        port: Number(port),
        username,
        token,
        insecureTLS: false,
      });
      if (success) {
        setError(null);
      } else {
        setError("Échec de la connexion au serveur.");
      }
    } catch (e: any) {
      setError(e?.message || "Erreur inconnue lors du test de connexion.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const id = getServerId();
      addConnection(id, {
        host,
        port: Number(port),
        username,
        token,
        insecureTLS: false,
      });
      setActiveServer(id);
      const success = await connect(id, {
        host,
        port: Number(port),
        username,
        token,
        insecureTLS: false,
      });
      if (success) {
        router.push("/"); // Redirection vers le dashboard uniquement si la connexion est validée
      } else {
        setError("Échec de la connexion au serveur.");
      }
    } catch (e: any) {
      setError(e?.message || "Erreur inconnue lors de la connexion.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
      <div className="w-full max-w-md mx-auto">
        <div className="text-center mb-8">
          <Icon icon={Server} size="xl" className="mx-auto text-blue-600" />
          <h1 className="text-4xl font-bold mt-2 text-gray-800 dark:text-gray-200">
            Proxmox VE Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Connect to your Proxmox server to get started
          </p>
        </div>
        <Card className="p-6">
          <CardHeader>
            <CardTitle>Server Connection</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label
                  htmlFor="host"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Server Address
                </label>
                <input
                  id="host"
                  className="mt-1 w-full border rounded px-3 py-2 bg-gray-50 dark:bg-gray-800"
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  placeholder="e.g., proxmox.local"
                  required
                />
              </div>
              <div>
                <label
                  htmlFor="port"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Port
                </label>
                <input
                  id="port"
                  type="number"
                  className="mt-1 w-full border rounded px-3 py-2 bg-gray-50 dark:bg-gray-800"
                  value={port}
                  onChange={(e) => setPort(e.target.value)}
                  placeholder="8006"
                  required
                />
              </div>
              <div>
                <label
                  htmlFor="username"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Username
                </label>
                <input
                  id="username"
                  className="mt-1 w-full border rounded px-3 py-2 bg-gray-50 dark:bg-gray-800"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g., root@pam"
                  required
                />
              </div>
              <div>
                <label
                  htmlFor="token"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  API Token
                </label>
                <input
                  id="token"
                  type="password"
                  className="mt-1 w-full border rounded px-3 py-2 bg-gray-50 dark:bg-gray-800"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Your API Token"
                  required
                />
              </div>
              {error && (
                <div className="text-red-600 text-sm">{error}</div>
              )}
              <div className="flex gap-2 pt-4">
                <Button
                  type="button"
                  variant="secondary"
                  className="flex-1"
                  onClick={handleTestConnection}
                  disabled={loading}
                >
                  {loading ? "Test en cours..." : "Test Connection"}
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={loading}
                >
                  {loading ? "Connexion..." : "Save"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}