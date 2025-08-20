import { test, expect } from '@playwright/test';

test.describe('Page Settings', () => {
  test('Chargement de la page settings et interaction avec les contrôles', async ({ page }) => {
    await page.goto('/settings');

    // Vérifier le titre de la page
    await expect(page.getByRole('heading', { name: /Settings/i })).toBeVisible();

    // Vérifier la présence des boutons Save Changes et Discard (si modifié)
    await expect(page.getByRole('button', { name: /Save Changes/i })).toBeVisible();

    // Vérifier la présence des sélecteurs Theme et Language
    await expect(page.getByLabel(/Theme/i)).toBeVisible();
    await expect(page.getByLabel(/Language/i)).toBeVisible();

    // Interaction : changer le thème
    await page.selectOption('select', 'dark');
    await expect(page.locator('select')).toHaveValue('dark');

    // Interaction : changer la langue
    await page.selectOption('select', 'fr');
    await expect(page.locator('select')).toHaveValue('fr');

    // Interaction : cocher/décocher une option (ex: Enable automatic refresh)
    const autoRefreshCheckbox = page.locator('input[type="checkbox"][checked]');
    if (await autoRefreshCheckbox.count() > 0) {
      await autoRefreshCheckbox.first().uncheck();
      await expect(autoRefreshCheckbox.first()).not.toBeChecked();
    }
  });

  test('Sauvegarde et annulation des modifications', async ({ page }) => {
    await page.goto('/settings');

    // Changer le thème et la langue
    await page.selectOption('select', 'light');
    await page.selectOption('select', 'en');

    // Cliquer sur Save Changes
    await page.getByRole('button', { name: /Save Changes/i }).click();

    // Vérifier que les changements sont persistés (rechargement)
    await page.reload();
    await expect(page.locator('select')).toHaveValue('light');
    await expect(page.getByLabel(/Language/i)).toHaveValue('en');

    // Modifier à nouveau mais annuler (Discard)
    await page.selectOption('select', 'dark');
    await page.getByRole('button', { name: /Discard/i }).click();

    // Vérifier que les changements ne sont pas appliqués
    await expect(page.locator('select')).toHaveValue('light');
  });
});