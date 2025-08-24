"use client";
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import Icon from "@/components/ui/Icon";
import { Server, Eye, EyeOff, ShieldOff, Circle, CircleDot, CircleOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useConnectionContext } from "@/lib/contexts/ConnectionContext";
import { Loader2 } from "lucide-react";
import { ConnectionService } from "@/lib/services/testConnectionService";
import { saveProfile } from '@/lib/persistence/authStorage';

export default function ConnectionPage() {
  const [host, setHost] = useState("");
  const [port, setPort] = useState("8006");
  const [username, setUsername] = useState("");
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showToken, setShowToken] = useState(false);
  const [insecureTLS, setInsecureTLS] = useState(false);
  const [recentServers, setRecentServers] = useState<Array<{host: string, port: string, username: string, token?: string, insecureTLS?: boolean}>>([]);
  // État pour le statut de chaque serveur : "pending" | "online" | "offline"
  const [serverStatus, setServerStatus] = useState<Record<string, "pending" | "online" | "offline">>({});

  // Charger les serveurs récents depuis le localStorage
  useEffect(() => {
    const data = localStorage.getItem("proxmox-recent-servers");
    if (data) {
      setRecentServers(JSON.parse(data));
    }
  }, []);

  // Ping chaque serveur dès que recentServers change
  useEffect(() => {
    if (recentServers.length === 0) return;
    const status: Record<string, "pending" | "online" | "offline"> = {};
    recentServers.forEach((s, i) => {
      const key = `${s.host}:${s.port}:${s.username}`;
      status[key] = "pending";
    });
    setServerStatus(status);

    recentServers.forEach(async (s) => {
      const key = `${s.host}:${s.port}:${s.username}`;
      try {
        const result = await ConnectionService.testConnection({
          host: s.host,
          port: Number(s.port),
          username: s.username,
          token: s.token || "",
          insecureTLS: !!s.insecureTLS,
        });
        setServerStatus(prev => ({
          ...prev,
          [key]: result.success ? "online" : "offline"
        }));
      } catch {
        setServerStatus(prev => ({
          ...prev,
          [key]: "offline"
        }));
      }
    });
  }, [recentServers]);

  // Sauvegarder un serveur dans le localStorage
  const saveRecentServer = (host: string, port: string, username: string, token: string, insecureTLS: boolean) => {
    const newEntry = { host, port, username, token, insecureTLS };
    let updated = [newEntry, ...recentServers.filter(s => !(s.host === host && s.port === port && s.username === username))];
    if (updated.length > 5) updated = updated.slice(0, 5);
    setRecentServers(updated);
    localStorage.setItem("proxmox-recent-servers", JSON.stringify(updated));
  };

  const router = useRouter();
  const { connect, addConnection, setActiveServer } = useConnectionContext();

  // Génère un id unique pour la connexion (clé simple)
  const getServerId = () => `${host}:${port}:${username}`;

  const handleTestConnection = async () => {
    setError(null);
    const id = getServerId();
    setServerStatus(prev => ({ ...prev, [id]: "pending" }));
    setLoading(true);
    try {
      addConnection(id, {
        host,
        port: Number(port),
        username,
        token,
        insecureTLS,
      });
      setActiveServer(id);
      const result = await ConnectionService.testConnection({
        host,
        port: Number(port),
        username,
        token,
        insecureTLS,
      });
      setServerStatus(prev => ({ ...prev, [id]: result.success ? "online" : "offline" }));
      if (result.success) {
        setError(null);
        saveRecentServer(host, port, username);
      } else {
        setError("Échec de la connexion au serveur.");
      }
    } catch (e: any) {
      setError(e?.message || "Erreur inconnue lors du test de connexion.");
      setServerStatus(prev => ({ ...prev, [id]: "offline" }));
    } finally {
      setLoading(false);
    }
  };

  // Indicatif visuel pour le test de connexion manuel
  const currentTestStatus = serverStatus[getServerId()];

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
        insecureTLS,
      });
      setActiveServer(id);
      const success = await connect(id, {
        host,
        port: Number(port),
        username,
        token,
        insecureTLS,
      });
      if (success) {
        saveRecentServer(host, port, username, token, insecureTLS);
        // Persistance du token et des infos de connexion dans le storage sécurisé
        await saveProfile({
          host,
          port: Number(port),
          username,
          token,
          insecureTLS,
        });
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
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-100 via-white to-gray-200 dark:from-gray-900 dark:via-gray-950 dark:to-gray-900 p-4">
      <div className="w-full max-w-md mx-auto">
        <div className="text-center mb-8">
          <Icon icon={Server} size="xl" className="mx-auto text-blue-600 animate-pulse drop-shadow-md" />
          <h1 className="text-4xl font-extrabold mt-2 text-gray-800 dark:text-gray-200 tracking-tight">
            Tableau de bord Proxmox VE
          </h1>
          <p className="text-base text-gray-600 dark:text-gray-400 mt-2 max-w-xs mx-auto">
            Gérez et surveillez vos serveurs Proxmox en toute simplicité. Connectez-vous pour commencer.
          </p>
        </div>
        <Card className="p-6 shadow-xl hover:shadow-2xl transition-shadow duration-300 bg-white/90 dark:bg-gray-900/90 border border-gray-200 dark:border-gray-800 rounded-2xl">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-800 dark:text-gray-100">Connexion au serveur</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit} autoComplete="off">
              <div>
                {recentServers.length > 0 && (
                  <div className="mb-2">
                    <label htmlFor="recent-server" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Serveurs récents</label>
                    <select
                      id="recent-server"
                      className="w-full border rounded px-2 py-1 bg-gray-50 dark:bg-gray-800 text-sm"
                      onChange={e => {
                        const idx = Number(e.target.value);
                        if (!isNaN(idx)) {
                          const s = recentServers[idx];
                          setHost(s.host);
                          setPort(s.port);
                          setUsername(s.username);
                          setToken(s.token || "");
                          setInsecureTLS(s.insecureTLS || false);
                        }
                      }}
                      defaultValue=""
                    >
                      <option value="" disabled>Sélectionner un serveur...</option>
                      {recentServers.map((s, i) => {
                        const key = `${s.host}:${s.port}:${s.username}`;
                        const status = serverStatus[key] || "pending";
                        let indicator = "⏳";
                        if (status === "online") indicator = "🟢";
                        else if (status === "offline") indicator = "🔴";
                        return (
                          <option key={i} value={i}>
                            {indicator} {s.host}:{s.port} — {s.username}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                )}
                {/* Légende des états */}
                {recentServers.length > 0 && (
                  <div className="flex gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400 items-center">
                    <span><span className="mr-1">🟢</span>Connecté</span>
                    <span><span className="mr-1">🔴</span>Déconnecté</span>
                    <span><span className="mr-1">⏳</span>Test en cours</span>
                  </div>
                )}
                <label
                  htmlFor="host"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Adresse du serveur
                </label>
                <input
                  id="host"
                  name="host"
                  className="mt-1 w-full border rounded px-3 py-2 bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none transition"
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  placeholder="ex : proxmox.local"
                  required
                  aria-describedby="host-help"
                  autoComplete="host"
                />
                <p id="host-help" className="text-xs text-gray-500 dark:text-gray-400 mt-1">Nom d'hôte ou IP du serveur Proxmox.</p>
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
                  name="port"
                  type="number"
                  className="mt-1 w-full border rounded px-3 py-2 bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none transition"
                  value={port}
                  onChange={(e) => setPort(e.target.value)}
                  placeholder="8006"
                  required
                  aria-describedby="port-help"
                  autoComplete="port"
                />
                <p id="port-help" className="text-xs text-gray-500 dark:text-gray-400 mt-1">Port par défaut : 8006</p>
              </div>
              <div>
                <label
                  htmlFor="username"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Nom d'utilisateur
                </label>
                <input
                  id="username"
                  name="username"
                  className="mt-1 w-full border rounded px-3 py-2 bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none transition"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="ex : root@pam"
                  required
                  aria-describedby="username-help"
                  autoComplete="username"
                />
                <p id="username-help" className="text-xs text-gray-500 dark:text-gray-400 mt-1">Format : utilisateur@realm (ex : root@pam)</p>
              </div>
              <div>
                <label
                  htmlFor="token"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Jeton API
                </label>
                <div className="relative flex items-center">
                  <input
                    id="token"
                    name="token"
                    type={showToken ? "text" : "password"}
                    className="mt-1 w-full border rounded px-3 py-2 bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none transition pr-10"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="Votre jeton API"
                    required
                    aria-describedby="token-help"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    tabIndex={0}
                    aria-label={showToken ? "Masquer le jeton" : "Afficher le jeton"}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600 focus:outline-none"
                    onClick={() => setShowToken((v) => !v)}
                  >
                    {showToken ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <p id="token-help" className="text-xs text-gray-500 dark:text-gray-400 mt-1">Générez un token dans l’interface Proxmox (Datacenter → Permissions → API Tokens).</p>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <input
                  id="insecureTLS"
                  name="insecureTLS"
                  type="checkbox"
                  checked={insecureTLS}
                  onChange={e => setInsecureTLS(e.target.checked)}
                  className="accent-blue-600 w-4 h-4 rounded border-gray-300 focus:ring-blue-500"
                />
                <label htmlFor="insecureTLS" className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-1 cursor-pointer">
                  <ShieldOff className="w-4 h-4 text-yellow-500" />
                  Autoriser TLS non sécurisé (déconseillé)
                </label>
              </div>
              {error && (
                <div aria-live="assertive" className="animate-shake bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded relative text-sm flex items-center gap-2 shadow-sm mb-2">
                  <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z" /></svg>
                  {error}
                </div>
              )}
              <div className="flex items-center gap-2 pt-4">
                <Button
                  type="button"
                  variant="secondary"
                  className="flex-1 flex items-center justify-center gap-2"
                  onClick={handleTestConnection}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin w-4 h-4" />
                      Test en cours...
                    </>
                  ) : (
                    "Tester la connexion"
                  )}
                </Button>
                <Button
                  type="submit"
                  className="flex-1 flex items-center justify-center gap-2"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin w-4 h-4" />
                      Connexion...
                    </>
                  ) : (
                    "Enregistrer"
                  )}
                </Button>
                  {/* Indicateur de statut du test de connexion */}
                  <div className="flex items-center gap-1 text-sm">
                    {currentTestStatus === "pending" && <Loader2 className="animate-spin w-4 h-4 text-gray-500" />}
                    {currentTestStatus === "online" && <CircleDot className="w-4 h-4 text-green-600" />}
                    {currentTestStatus === "offline" && <CircleOff className="w-4 h-4 text-red-600" />}
                    <span className={currentTestStatus === "online" ? "text-green-600" : currentTestStatus === "offline" ? "text-red-600" : "text-gray-600"}>
                      {currentTestStatus === "pending" ? "Test en cours" : currentTestStatus === "online" ? "Connecté" : currentTestStatus === "offline" ? "Déconnecté" : ""}
                    </span>
                  </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}