import { test, expect } from '@playwright/test';

test.describe('Page Monitoring', () => {
  test('Chargement de la page monitoring et interaction avec les filtres et données', async ({ page }) => {
    await page.goto('/monitoring');

    // Vérifier le titre de la page
    await expect(page.getByRole('heading', { name: /Advanced Monitoring/i })).toBeVisible();

    // Vérifier la présence du sélecteur de node
    await expect(page.getByRole('combobox')).toBeVisible();

    // Vérifier la présence du bouton Refresh All
    await expect(page.getByRole('button', { name: /Refresh All/i })).toBeVisible();

    // Vérifier la présence des cartes statistiques
    await expect(page.getByText(/Services/i)).toBeVisible();
    await expect(page.getByText(/Backups/i)).toBeVisible();
    await expect(page.getByText(/Log Entries/i)).toBeVisible();

    // Vérifier la présence du champ de recherche dans les logs
    await expect(page.locator('input[placeholder="Search logs..."]')).toBeVisible();

    // Vérifier la présence du filtre de niveau de log
    await expect(page.getByRole('combobox')).toBeVisible();

    // Interaction : changer le node sélectionné
    await page.selectOption('select', 'pve-2');
    await expect(page.locator('select')).toHaveValue('pve-2');

    // Interaction : taper dans le champ de recherche des logs
    await page.fill('input[placeholder="Search logs..."]', 'error');
    await expect(page.locator('input[placeholder="Search logs..."]')).toHaveValue('error');
  });
});