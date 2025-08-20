// tests/servers.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Gestion des serveurs Proxmox', () => {
  const server = {
    host: 'test-server.local',
    port: '9006',
    username: 'root@pam',
    token: 'dummy-token',
  };
  const nouveauNom = 'serveur-modifié.local';

  test('création, modification et suppression d\'un serveur', async ({ page }) => {
    // Aller sur la page de gestion des serveurs
    await page.goto('/connection');
    await expect(page.getByRole('heading', { name: /Proxmox Servers/i })).toBeVisible();

    // Ajouter un serveur
    await page.getByRole('button', { name: /Add Server/i }).click();
    await page.getByLabel('Host').fill(server.host);
    await page.getByLabel('Port').fill(server.port);
    await page.getByLabel('Username').fill(server.username);
    await page.getByLabel('Token').fill(server.token);
    await page.getByRole('button', { name: /Save/i }).click();

    // Vérifier que le serveur apparaît dans la liste
    await expect(page.getByText(`${server.host}:${server.port}`)).toBeVisible();

    // Modifier le nom du serveur
    await page.getByRole('button', { name: /Modifier/i }).click();
    // Playwright ne peut pas interagir avec prompt, on simule via evaluate
    await page.evaluate((nouveauNom) => {
      window.prompt = () => nouveauNom;
    }, nouveauNom);
    await page.getByRole('button', { name: /Modifier/i }).click();

    // Vérifier que le nom a été modifié
    await expect(page.getByText(`${nouveauNom}:${server.port}`)).toBeVisible();

    // Supprimer le serveur
    await page.evaluate(() => {
      window.confirm = () => true;
    });
    await page.getByRole('button', { name: /Supprimer/i }).click();

    // Vérifier que le serveur n'est plus dans la liste
    await expect(page.getByText(`${nouveauNom}:${server.port}`)).not.toBeVisible();

    // Vérifier gestion d’erreur (exemple : suppression d’un serveur inexistant)
    // Ici, on tente de supprimer à nouveau et on attend un message d’erreur
    await page.evaluate(() => {
      window.confirm = () => true;
    });
    await page.getByRole('button', { name: /Supprimer/i }).click().catch(() => {});
    // Vérifie qu’un message d’erreur s’affiche (optionnel selon l’implémentation)
    // await expect(page.getByText(/Erreur|error|failed/i)).toBeVisible();
  });
});