import React from "react";
import { CheckCircle, XCircle, Loader2, AlertTriangle } from "lucide-react";
import { useConnectionContext } from "@/lib/contexts/ConnectionContext";

const statusMap = {
  connected: {
    color: "text-green-600",
    icon: <CheckCircle className="w-4 h-4 mr-1" />,
    label: "Connecté"
  },
  connecting: {
    color: "text-blue-600",
    icon: <Loader2 className="w-4 h-4 mr-1 animate-spin" />,
    label: "Connexion..."
  },
  error: {
    color: "text-red-600",
    icon: <AlertTriangle className="w-4 h-4 mr-1" />,
    label: "Erreur"
  },
  disconnected: {
    color: "text-gray-500",
    icon: <XCircle className="w-4 h-4 mr-1" />,
    label: "Déconnecté"
  }
};

export default function ConnectionStatusIndicator() {
  const { isConnected, isConnecting, state } = useConnectionContext();
  let status: keyof typeof statusMap = "disconnected";
  if (isConnecting) status = "connecting";
  else if (isConnected) status = "connected";
  else if (state?.status === "error") status = "error";

  const { color, icon, label } = statusMap[status];
  return (
    <div className={`flex items-center gap-1 font-medium ${color} px-2 py-1 rounded`}
         title={state?.error || label}>
      {icon}
      <span>{label}</span>
    </div>
  );
}

