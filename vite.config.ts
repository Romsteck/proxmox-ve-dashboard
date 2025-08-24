// Configuration Vite pour la résolution des alias TypeScript avec Vitest
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    // Options Vitest ici si besoin (par défaut, l’alias @ sera reconnu)
  },
});