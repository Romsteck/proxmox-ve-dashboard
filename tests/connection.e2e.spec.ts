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
test('Validation du formulaire : tous les champs vides', async ({ page }) => {
    await page.goto('/connection');
    await page.fill('input[placeholder="ex: proxmox.local"]', '');
    await page.fill('input[type="number"]', '');
    await page.fill('input[type="text"]', '');
    await page.fill('input[type="password"], input:not([type])', '');
    await page.click('button[type="submit"]');
    await expect(page.getByText(/champ.*obligatoire|remplir|erreur/i)).toBeVisible({ timeout: 1000 });
  });

  test('Validation du formulaire : port non numérique', async ({ page }) => {
    await page.goto('/connection');
    await page.fill('input[placeholder="ex: proxmox.local"]', '192.168.1.52');
    await page.fill('input[type="number"]', 'abc');
    await page.fill('input[type="text"]', 'root@pam!dashboard');
    await page.fill('input[type="password"], input:not([type])', 'b3ccdaa6-9762-4b75-8d82-19e93f52e5c0');
    await page.click('button[type="submit"]');
    await expect(page.getByText(/port.*numérique|erreur/i)).toBeVisible({ timeout: 1000 });
  });

  test('Validation du formulaire : host vide', async ({ page }) => {
    await page.goto('/connection');
    await page.fill('input[placeholder="ex: proxmox.local"]', '');
    await page.fill('input[type="number"]', '8006');
    await page.fill('input[type="text"]', 'root@pam!dashboard');
    await page.fill('input[type="password"], input:not([type])', 'b3ccdaa6-9762-4b75-8d82-19e93f52e5c0');
    await page.click('button[type="submit"]');
    await expect(page.getByText(/host.*obligatoire|remplir|erreur/i)).toBeVisible({ timeout: 1000 });
  });

  test('Validation du formulaire : username vide', async ({ page }) => {
    await page.goto('/connection');
    await page.fill('input[placeholder="ex: proxmox.local"]', '192.168.1.52');
    await page.fill('input[type="number"]', '8006');
    await page.fill('input[type="text"]', '');
    await page.fill('input[type="password"], input:not([type])', 'b3ccdaa6-9762-4b75-8d82-19e93f52e5c0');
    await page.click('button[type="submit"]');
    await expect(page.getByText(/user.*obligatoire|remplir|erreur/i)).toBeVisible({ timeout: 1000 });
  });

  test('Validation du formulaire : token vide', async ({ page }) => {
    await page.goto('/connection');
    await page.fill('input[placeholder="ex: proxmox.local"]', '192.168.1.52');
    await page.fill('input[type="number"]', '8006');
    await page.fill('input[type="text"]', 'root@pam!dashboard');
    await page.fill('input[type="password"], input:not([type])', '');
    await page.click('button[type="submit"]');
    await expect(page.getByText(/token.*obligatoire|remplir|erreur/i)).toBeVisible({ timeout: 1000 });
  });
});


test('Connexion réussie avec identifiants fournis (happy path)', async ({ page }) => {
  const host = '192.168.1.52';
  const port = '8006';
  const user = 'root@pam!dashboard';
  const token = 'b3ccdaa6-9762-4b75-8d82-19e93f52e5c0';

  await page.goto('/connection');
  await page.fill('input[placeholder="ex: proxmox.local"]', host);
  await page.fill('input[type="number"]', port);
  await page.fill('input[type="text"]', user);
  await page.fill('input[type="password"], input:not([type])', token);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('/');
  await expect(page.getByText(/Connecté/)).toBeVisible();
});
/**
 * PLAN DE TESTS AVANCÉS (à implémenter selon ton retour) :
 * 
 * 1. Persistance de la connexion :
 *    - Après une connexion réussie, recharger la page et vérifier que l’utilisateur reste connecté (token/session persisté).
 *    - Fermer/réouvrir le navigateur et vérifier la persistance de la connexion.
 * 
 * 2. Résilience réseau :
 *    - Simuler une perte de connexion réseau lors de la tentative de connexion (désactiver le réseau avant le submit).
 *    - Simuler une latence réseau importante et vérifier l’affichage d’un indicateur de chargement.
 *    - Simuler une coupure réseau après connexion et vérifier le comportement de l’UI (message d’erreur, déconnexion automatique, etc.).
 * 
 * 3. Sécurité :
 *    - Vérifier que le token n’est jamais affiché en clair dans l’UI.
 *    - Vérifier qu’aucune information sensible n’est stockée en localStorage non sécurisé.
 * 
 * 4. Accessibilité :
 *    - Vérifier que tous les champs du formulaire sont accessibles au clavier et lisibles par un lecteur d’écran.
 * 
 * 5. Edge cases supplémentaires :
 *    - Connexion avec un port hors plage (ex : 0, 65536).
 *    - Connexion avec un host invalide (ex : caractères spéciaux).
 *    - Double soumission rapide du formulaire (anti double-submit).
 * 
 * Si tu veux que j’implémente un ou plusieurs de ces tests, précise lesquels !
 */