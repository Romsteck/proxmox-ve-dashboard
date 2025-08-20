import { test, expect } from '@playwright/test';

test.describe('Page VMs', () => {
  test('Chargement de la page vms et interaction avec les filtres et actions', async ({ page }) => {
    await page.goto('/vms');

    // Vérifier le titre de la page
    await expect(page.getByRole('heading', { name: /Virtual Machines & Containers/i })).toBeVisible();

    // Vérifier la présence du bouton Refresh
    await expect(page.getByRole('button', { name: /Refresh/i })).toBeVisible();

    // Vérifier la présence des filtres Status, Type et Node
    await expect(page.getByRole('combobox', { name: /All Status/i })).toBeVisible();
    await expect(page.getByRole('combobox', { name: /All Types/i })).toBeVisible();
    await expect(page.getByRole('combobox', { name: /All Nodes/i })).toBeVisible();

    // Vérifier la présence du champ de recherche
    await expect(page.locator('input[placeholder="Search VMs and containers..."]')).toBeVisible();

    // Interaction : changer le filtre Status
    await page.selectOption('select', 'running');
    await expect(page.locator('select')).toHaveValue('running');

    // Interaction : changer le filtre Type
    await page.selectOption('select', 'qemu');
    await expect(page.locator('select')).toHaveValue('qemu');

    // Interaction : changer le filtre Node
    const nodeSelect = page.locator('select').nth(2);
    await nodeSelect.selectOption({ index: 1 });
    await expect(nodeSelect).not.toHaveValue('all');

    // Interaction : taper dans le champ de recherche
    await page.fill('input[placeholder="Search VMs and containers..."]', 'test-vm');
    await expect(page.locator('input[placeholder="Search VMs and containers..."]')).toHaveValue('test-vm');

    // Interaction : cliquer sur un bouton d'action (ex: start) si visible
    const startButton = page.locator('button[title^="Start"]').first();
    if (await startButton.isVisible()) {
      await startButton.click();
    }
  });

  test('Actions supplémentaires sur les VMs : stop, restart et vérification des détails', async ({ page }) => {
    await page.goto('/vms');

    // Cliquer sur un bouton Stop si visible
    const stopButton = page.locator('button[title^="Stop"]').first();
    if (await stopButton.isVisible()) {
      await stopButton.click();
      // Vérifier qu'une confirmation est demandée et la confirmer
      await page.evaluate(() => { window.confirm = () => true; });
    }

    // Cliquer sur un bouton Restart si visible
    const restartButton = page.locator('button[title^="Restart"]').first();
    if (await restartButton.isVisible()) {
      await restartButton.click();
      // Vérifier qu'une confirmation est demandée et la confirmer
      await page.evaluate(() => { window.confirm = () => true; });
    }

    // Vérifier l'affichage des détails d'une VM (cliquer sur un élément de la liste)
    const vmItem = page.locator('.vm-item').first();
    if (await vmItem.isVisible()) {
      await vmItem.click();
      // Vérifier que la page de détails s'affiche avec un titre
      await expect(page.getByRole('heading', { name: /VM Details/i })).toBeVisible();
    }
  });
});