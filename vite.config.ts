// Configuration Vite pour la résolution des alias TypeScript avec Vitest
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    // Exclure les tests Playwright (E2E) des tests unitaires Vitest
    exclude: [
      'tests/**/connection.e2e.spec.ts',
      'tests/**/alerts.spec.ts',
      'tests/**/metrics.spec.ts',
      'tests/**/monitoring.spec.ts',
      'tests/**/servers.spec.ts',
      'tests/**/settings.spec.ts',
      'tests/**/home.spec.ts',
      'tests/**/vms.spec.ts',
      'tests/**/global-setup.ts',
      'tests/**/global-teardown.ts',
      'tests/**/seed-data.ts',
      'tests/**/test-utils.tsx',
      'tests/**/*.e2e.spec.ts',
      'playwright-report/**',
      '**/node_modules/**'
    ],
    // Autres options Vitest ici si besoin
  },
});