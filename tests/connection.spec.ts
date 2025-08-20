import { test, expect } from '@playwright/test';

test.describe('Page Connection', () => {
  test('Chargement de la page connection et interaction avec la liste des serveurs', async ({ page }) => {
    await page.goto('/connection');

    // Vérifier le titre de la page
    await expect(page.getByRole('heading', { name: /Proxmox Servers/i })).toBeVisible();

    // Vérifier la présence du bouton Add Server
    await expect(page.getByRole('button', { name: /Add Server/i })).toBeVisible();

    // Vérifier la présence de la liste des serveurs (au moins le conteneur)
    await expect(page.locator('ul')).toBeVisible();

    // Tester l'ouverture du formulaire d'ajout de serveur
    await page.getByRole('button', { name: /Add Server/i }).click();
    await expect(page.getByRole('heading', { name: /Add New Server/i })).toBeVisible();

    // Remplir le formulaire d'ajout de serveur
    await page.getByLabel('Host').fill('test-server.local');
    await page.getByLabel('Port').fill('9006');
    await page.getByLabel('Username').fill('root@pam');
    await page.getByLabel('Token').fill('dummy-token');

    // Soumettre le formulaire
    await page.getByRole('button', { name: /Save/i }).click();

    // Vérifier que le formulaire est fermé après ajout (le bouton Add Server doit être visible)
    await expect(page.getByRole('button', { name: /Add Server/i })).toBeVisible();

    // Vérifier que le serveur ajouté apparaît dans la liste
    await expect(page.getByText('test-server.local:9006')).toBeVisible();
  });
});