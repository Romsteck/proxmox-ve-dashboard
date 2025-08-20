import React from 'react';

export const metadata = {
  title: "Connexion",
  description: "Se connecter au serveur Proxmox"
};

export const viewport = {
  width: "device-width",
  initialScale: 1
};

export default function ConnectionLayout({ children }: { children: React.ReactNode }) {
  return children;
}