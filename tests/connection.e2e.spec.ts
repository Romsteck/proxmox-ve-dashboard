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

  // Pour tester une vraie connexion, il faut un serveur de test accessible
  // test('Connexion réussie redirige vers la home', async ({ page }) => {
  //   await page.goto('/connection');
  //   // Remplir avec des identifiants valides
  //   await page.fill('input[placeholder="ex: proxmox.local"]', 'vrai-host');
  //   await page.fill('input[type="number"]', '8006');
  //   await page.fill('input[type="text"]', 'vrai-user');
  //   await page.fill('input[type="password"], input:not([type])', 'vrai-token');
  //   await page.click('button[type="submit"]');
  //   await expect(page).toHaveURL('/');
  //   await expect(page.getByText(/Connecté/)).toBeVisible();
  // });
});

