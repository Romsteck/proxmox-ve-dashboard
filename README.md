This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## ⚠️ Limitations réseau / Backend

Pour que l’application fonctionne correctement, le backend Next.js (API `/api/proxmox/*`) doit pouvoir accéder au(x) serveur(s) Proxmox distant(s) via le réseau (IP et port configurés).  
- Si vous exécutez Next.js en local, il doit être sur le même réseau que Proxmox, et le port (par défaut 8006) doit être ouvert.
- Si le backend est déployé sur un serveur distant (Vercel, etc.), il doit également pouvoir joindre le serveur Proxmox.
- En cas d’échec de connexion (erreur 502/504), vérifiez la configuration réseau, les règles de pare-feu et l’accessibilité du port.

L’application ne peut pas contourner ces limitations réseau : le backend agit comme un proxy sécurisé pour éviter d’exposer les identifiants côté client.
## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
