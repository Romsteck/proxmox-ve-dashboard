import { test, expect } from './test-utils';

test.describe('Page Connection', () => {
  test('Chargement de la page connection et interaction avec la liste des serveurs', async ({ page }) => {
    await page.goto('/connection');

    // Vérifier le titre de la page
    await expect(page.getByRole('heading', { name: /Proxmox Servers/i })).toBeVisible();

    // Vérifier la présence du bouton Add Server
    await expect(page.getByRole('button', { name: /Add Server/i })).toBeVisible();

    // Vérifier la présence de la liste des serveurs
    await expect(page.getByRole('list', { name: /servers/i })).toBeVisible();

    // Tester l'ouverture du formulaire d'ajout de serveur
    await page.getByRole('button', { name: /Add Server/i }).click();
    await expect(page.getByRole('heading', { name: /Add New Server/i })).toBeVisible();

    // Remplir le formulaire d'ajout de serveur
    await page.getByLabel('Host').fill('test-server.local');
    await page.getByLabel('Port').fill('8006');
    await page.getByLabel('Username').fill('root@pam');
    await page.getByLabel('Token').fill('dummy-token');

    // Soumettre le formulaire
    await page.getByRole('button', { name: /Save/i }).click();

    // Attendre que le formulaire se ferme (il y a un délai de 1 seconde)
    await page.waitForTimeout(2000);

    // Vérifier que le formulaire est fermé après ajout
    await expect(page.getByRole('heading', { name: /Add New Server/i })).not.toBeVisible();

    // Vérifier que le serveur ajouté apparaît dans la liste
    await expect(page.getByRole('listitem').filter({ hasText: 'test-server.local' }).first()).toBeVisible();
  });
});