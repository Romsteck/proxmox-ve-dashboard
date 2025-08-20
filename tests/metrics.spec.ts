import { test, expect } from '@playwright/test';

test.describe('Page Metrics', () => {
  test('Chargement de la page metrics et interaction avec les contrôles', async ({ page }) => {
    await page.goto('/metrics');

    // Vérifier le titre de la page
    await expect(page.getByRole('heading', { name: /Advanced Metrics/i })).toBeVisible();

    // Vérifier la présence des boutons Export CSV et Refresh
    await expect(page.getByRole('button', { name: /Export CSV/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Refresh/i })).toBeVisible();

    // Vérifier la présence des sélecteurs Time Range, Nodes et Metrics
    await expect(page.getByRole('radio', { name: /1 Hour/i })).toBeVisible();
    await expect(page.getByRole('checkbox', { name: /pve-1/i })).toBeVisible();
    await expect(page.getByRole('checkbox', { name: /CPU Usage/i })).toBeVisible();

    // Interaction : changer le Time Range
    await page.getByRole('radio', { name: /6 Hours/i }).check();
    await expect(page.getByRole('radio', { name: /6 Hours/i })).toBeChecked();

    // Interaction : cocher/décocher un node
    await page.getByRole('checkbox', { name: /pve-2/i }).check();
    await expect(page.getByRole('checkbox', { name: /pve-2/i })).toBeChecked();

    // Interaction : cocher/décocher un metric
    await page.getByRole('checkbox', { name: /Storage Usage/i }).check();
    await expect(page.getByRole('checkbox', { name: /Storage Usage/i })).toBeChecked();
  });
});