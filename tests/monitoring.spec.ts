import { test, expect } from './test-utils';

test.describe('Page Monitoring', () => {
  test('should load the monitoring page and display key elements', async ({ page }) => {
    await page.goto('/monitoring');

    // Vérifier le titre de la page
    await expect(page.getByRole('heading', { name: /Advanced Monitoring/i })).toBeVisible();

    // Vérifier la présence des contrôles principaux
    await expect(page.getByLabel(/Node/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Refresh All/i })).toBeVisible();

    // Vérifier la présence des cartes statistiques
    await expect(page.getByRole('heading', { name: 'Services' }).first()).toBeVisible();
    await expect(page.getByRole('heading', { name: /Backups/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Log Entries/i })).toBeVisible();

    // Vérifier la présence des contrôles de logs
    await expect(page.getByPlaceholder('Search logs...')).toBeVisible();
    await expect(page.getByLabel(/Log Level/i)).toBeVisible();
  });

  test('should interact with node selector', async ({ page }) => {
    await page.goto('/monitoring');
    const nodeSelector = page.getByLabel(/Node/i);
    await nodeSelector.selectOption('pve-2');
    await expect(nodeSelector).toHaveValue('pve-2');
  });

  test('should interact with log search and filter', async ({ page }) => {
    await page.goto('/monitoring');
    await page.getByPlaceholder('Search logs...').fill('error');
    await expect(page.getByPlaceholder('Search logs...')).toHaveValue('error');

    // Lister tous les selects présents
    const allSelects = page.locator('select');
    const count = await allSelects.count();
    // Utiliser le dernier select pour le log level
    const logLevelSelector = allSelects.nth(count - 1);
    await logLevelSelector.waitFor({ state: 'visible' });
    await logLevelSelector.selectOption('error');
    await expect(logLevelSelector).toHaveValue('error');
  });
});