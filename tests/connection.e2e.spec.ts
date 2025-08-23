import { test, expect } from '@playwright/test';

test.describe('Connexion Proxmox', () => {
  test('Redirection automatique vers /connection si non connecté', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/connection$/);
    await expect(page.getByText('Connexion au serveur Proxmox')).toBeVisible();
  });

  test('Affichage de l’indicateur de connexion', async ({ page }) => {
    await page.goto('/connection');
    await expect(page.getByText(/Déconnecté|Connexion|Connecté|Erreur/)).toBeVisible();
  });

  test('Connexion avec mauvais identifiants affiche une erreur', async ({ page }) => {
    await page.goto('/connection');
    await page.fill('input[placeholder="ex: proxmox.local"]', 'fakehost');
    await page.fill('input[type="number"]', '8006');
    await page.fill('input[type="text"]', 'fakeuser');
    await page.fill('input[type="password"], input:not([type])', 'badtoken');
    await page.click('button[type="submit"]');
    await expect(page.getByText(/Erreur|échec/i)).toBeVisible();
  });

  /**
   * Ce test nécessite des identifiants valides dans les variables d’environnement :
   *   E2E_PROXMOX_HOST, E2E_PROXMOX_PORT, E2E_PROXMOX_USER, E2E_PROXMOX_TOKEN
   * Il sera ignoré si l’un des paramètres est manquant.
   */
  test('Connexion réussie redirige vers le dashboard', async ({ page }) => {
    const host = process.env.E2E_PROXMOX_HOST;
    const port = process.env.E2E_PROXMOX_PORT;
    const user = process.env.E2E_PROXMOX_USER;
    const token = process.env.E2E_PROXMOX_TOKEN;
  
    test.skip(
      !host || !port || !user || !token,
      'Variables E2E_PROXMOX_HOST, PORT, USER, TOKEN requises pour ce test.'
    );
  
    await page.goto('/connection');
    await page.fill('input[placeholder="ex: proxmox.local"]', host!);
    await page.fill('input[type="number"]', port!);
    await page.fill('input[type="text"]', user!);
    await page.fill('input[type="password"], input:not([type])', token!);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/');
    await expect(page.getByText(/Connecté/)).toBeVisible();
  });
});

