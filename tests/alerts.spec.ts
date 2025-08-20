import { test, expect } from '@playwright/test';

test.describe('Page Alerts', () => {
  test('Chargement de la page alerts et affichage des éléments clés', async ({ page }) => {
    await page.goto('/alerts');

    // Vérifier le titre de la page
    await expect(page.getByRole('heading', { name: /Alerts & Monitoring/i })).toBeVisible();

    // Vérifier la présence du bouton Refresh
    await expect(page.getByRole('button', { name: /Refresh/i })).toBeVisible();

    // Vérifier la présence du bouton Add Threshold
    await expect(page.getByRole('button', { name: /Add Threshold/i })).toBeVisible();

    // Vérifier la présence des sections Active Alerts et Alert Thresholds
    await expect(page.getByRole('heading', { name: /Active Alerts/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Alert Thresholds/i })).toBeVisible();

    // Vérifier la présence du champ de recherche
    await expect(page.getByPlaceholder('Search alerts...')).toBeVisible();

    // Vérifier la présence du filtre de sévérité
    await expect(page.getByRole('combobox')).toBeVisible();
  });

  test('Interaction avec la recherche et le filtre de sévérité', async ({ page }) => {
    await page.goto('/alerts');

    // Wait for the page to be stable
    await expect(page.getByRole('heading', { name: /Active Alerts/i })).toBeVisible();

    // Taper dans le champ de recherche
    const searchInput = page.getByPlaceholder('Search alerts...');
    await searchInput.fill('disk');
    await expect(searchInput).toHaveValue('disk');

    // Sélectionner une sévérité dans le filtre
    const severitySelect = page.getByRole('combobox');
    await severitySelect.selectOption('critical');
    await expect(severitySelect).toHaveValue('critical');

    // Vérifier que les alertes affichées correspondent au filtre
    const alerts = page.getByRole('listitem');
    await expect(alerts).not.toHaveCount(0);
    for (const alert of await alerts.all()) {
      await expect(alert).toHaveText(/disk/i);
    }
  });

  test('Ajout et suppression d\'un seuil d\'alerte', async ({ page }) => {
    await page.goto('/alerts');

    // Wait for the page to be stable
    await expect(page.getByRole('heading', { name: /Alert Thresholds/i })).toBeVisible();

    // Cliquer sur Add Threshold
    await page.getByRole('button', { name: /Add Threshold/i }).click();

    // Remplir le formulaire d'ajout de seuil
    await page.getByLabel('Name').fill('Test Threshold');
    await page.getByLabel('Metric').selectOption('cpu');
    await page.getByLabel('Severity').selectOption('warning');
    await page.getByLabel('Value').fill('80');

    // Soumettre le formulaire
    await page.getByRole('button', { name: /Save/i }).click();

    // Vérifier que le seuil ajouté apparaît dans la liste
    const newThreshold = page.getByRole('listitem').filter({ hasText: 'Test Threshold' });
    await expect(newThreshold).toBeVisible();

    // Supprimer le seuil ajouté
    page.on('dialog', dialog => dialog.accept());
    await newThreshold.getByRole('button', { name: /Delete/i }).click();

    // Vérifier que le seuil n'est plus visible
    await expect(page.getByText('Test Threshold')).not.toBeVisible();
  });
});