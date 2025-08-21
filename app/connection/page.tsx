"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useConnectionContext } from "@/lib/contexts/ConnectionContext";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export default function ConnectionPage() {
  const { isConnected, isConnecting, connect, state } = useConnectionContext();
  const router = useRouter();
  const [host, setHost] = useState("");
  const [port, setPort] = useState("8006");
  const [username, setUsername] = useState("");
  const [token, setToken] = useState("");
  const [insecureTLS, setInsecureTLS] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isConnected) {
      router.replace("/");
    }
  }, [isConnected, router]);

  async function handleConnect(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    try {
      const ok = await connect(
        `${host}:${port}`,
        { host, port: Number(port), username, token, insecureTLS }
      );
      if (ok) {
        setSuccess(true);
        setTimeout(() => router.replace("/"), 500);
      } else {
        setError(state?.error || "Échec de la connexion.");
      }
    } catch (err: any) {
      setError(err?.message || "Erreur inconnue");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
      <Card className="w-full max-w-md p-8 shadow-lg">
        <h1 className="text-2xl font-bold mb-6 text-center">Connexion au serveur Proxmox</h1>
        <form onSubmit={handleConnect} className="space-y-4">
          <div>
            <label className="block mb-1 font-medium">Adresse du serveur</label>
            <input
              className="w-full border rounded px-2 py-1"
              value={host}
              onChange={e => setHost(e.target.value)}
              placeholder="ex: proxmox.local"
              required
              disabled={isConnecting}
            />
          </div>
          <div>
            <label className="block mb-1 font-medium">Port</label>
            <input
              className="w-full border rounded px-2 py-1"
              type="number"
              value={port}
              onChange={e => setPort(e.target.value)}
              min={1}
              max={65535}
              required
              disabled={isConnecting}
            />
          </div>
          <div>
            <label className="block mb-1 font-medium">Nom d'utilisateur</label>
            <input
              className="w-full border rounded px-2 py-1"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
              disabled={isConnecting}
            />
          </div>
          <div>
            <label className="block mb-1 font-medium">Token API</label>
            <input
              className="w-full border rounded px-2 py-1"
              value={token}
              onChange={e => setToken(e.target.value)}
              required
              disabled={isConnecting}
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={insecureTLS}
              onChange={e => setInsecureTLS(e.target.checked)}
              id="insecureTLS"
              disabled={isConnecting}
            />
            <label htmlFor="insecureTLS">Autoriser TLS non sécurisé</label>
          </div>
          {error && <div className="text-red-600 text-sm">{error}</div>}
          {success && <div className="text-green-600 text-sm">Connexion réussie !</div>}
          <Button type="submit" loading={isConnecting} disabled={isConnecting} className="w-full">
            {isConnecting ? "Connexion en cours..." : "Se connecter"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
