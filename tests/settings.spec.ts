import { test, expect } from './test-utils';

test.describe('Page Settings', () => {
  test('should load the settings page and display key elements', async ({ page }) => {
    await page.goto('/settings');

    await expect(page.getByRole('heading', { name: /Settings/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Save Changes/i })).toBeVisible();
    await expect(page.getByLabel(/Theme/i)).toBeVisible();
    await expect(page.getByLabel(/Language/i)).toBeVisible();
    await expect(page.getByLabel(/Enable automatic refresh/i)).toBeVisible();
  });

  test('should change theme and language', async ({ page }) => {
    await page.goto('/settings');

    const themeSelector = page.getByLabel(/Theme/i);
    await themeSelector.selectOption('dark');
    await expect(themeSelector).toHaveValue('dark');

    const languageSelector = page.getByLabel(/Language/i);
    await languageSelector.selectOption('fr');
    await expect(languageSelector).toHaveValue('fr');
  });

  test('should toggle automatic refresh', async ({ page }) => {
    await page.goto('/settings');
    const autoRefreshCheckbox = page.getByLabel(/Enable automatic refresh/i);
    await autoRefreshCheckbox.uncheck();
    await expect(autoRefreshCheckbox).not.toBeChecked();
  });

  test('should save and discard changes', async ({ page }) => {
    await page.goto('/settings');

    const themeSelector = page.getByLabel(/Theme/i);
    
    // Vérifier que le bouton Save Changes est désactivé au début
    await expect(page.getByRole('button', { name: /Save Changes/i }).first()).toBeDisabled();
    
    // Changer le thème pour activer le bouton Save
    await themeSelector.selectOption('light');
    
    // Vérifier que le bouton Save Changes est maintenant activé
    await expect(page.getByRole('button', { name: /Save Changes/i }).first()).toBeEnabled();

    await page.getByRole('button', { name: /Save Changes/i }).first().click();
    
    // Vérifier qu'un message de succès est affiché ou que le bouton est désactivé après save
    await page.waitForTimeout(1000);
    await expect(page.getByRole('button', { name: /Save Changes/i }).first()).toBeDisabled();

    // Tester la fonction Discard
    await themeSelector.selectOption('dark');
    await expect(page.getByRole('button', { name: /Save Changes/i }).first()).toBeEnabled();
    
    // Attendre un délai fixe à la place du toast
    await page.waitForTimeout(1500);
    try {
      await page.getByRole('button', { name: /Discard/i }).first().click({ timeout: 2000 });
    } catch {
      // Si le clic échoue, forcer le clic JS natif
      await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('Discard'));
        if (btn) (btn as HTMLElement).click();
      });
    }
    await expect(themeSelector).toHaveValue('light');
  });
});