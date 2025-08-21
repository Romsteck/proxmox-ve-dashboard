import { test, expect } from './test-utils';

test.describe('Page VMs', () => {
  test('should load the VMs page and display key elements', async ({ page }) => {
    await page.goto('/vms');

    await expect(page.getByRole('heading', { name: /Virtual Machines & Containers/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Refresh/i })).toBeVisible();
    
    await page.waitForSelector('[aria-label="Status"]');

    await expect(page.getByLabel(/Status/i)).toBeVisible();
    await expect(page.getByLabel(/Type/i)).toBeVisible();
    await expect(page.getByLabel(/Node/i)).toBeVisible();
    await expect(page.getByPlaceholder('Search VMs and containers...')).toBeVisible();
  });

  test('should filter and search VMs', async ({ page }) => {
    await page.goto('/vms');

    await page.waitForSelector('[aria-label="Status"]');

    await page.getByLabel(/Status/i).selectOption('running');
    await expect(page.getByLabel(/Status/i)).toHaveValue('running');

    await page.getByLabel(/Type/i).selectOption('qemu');
    await expect(page.getByLabel(/Type/i)).toHaveValue('qemu');

    await page.getByLabel(/Node/i).selectOption({ index: 1 });
    await expect(page.getByLabel(/Node/i)).not.toHaveValue('all');

    await page.getByPlaceholder('Search VMs and containers...').fill('test-vm');
    await expect(page.getByPlaceholder('Search VMs and containers...')).toHaveValue('test-vm');
  });

  test('should perform actions on a VM', async ({ page }) => {
    await page.goto('/vms');

    const vmEntry = page.getByRole('listitem').first();
    if (await vmEntry.isVisible()) {
      page.on('dialog', dialog => dialog.accept());

      const startButton = vmEntry.getByRole('button', { name: /Start/i });
      if (await startButton.isVisible()) {
        await startButton.click();
      }

      const stopButton = vmEntry.getByRole('button', { name: /Stop/i });
      if (await stopButton.isVisible()) {
        await stopButton.click();
      }

      const restartButton = vmEntry.getByRole('button', { name: /Restart/i });
      if (await restartButton.isVisible()) {
        await restartButton.click();
      }
    }
  });

  test('should navigate to VM details', async ({ page }) => {
    await page.goto('/vms');

    const vmEntry = page.getByRole('listitem').first();
    if (await vmEntry.isVisible()) {
      await vmEntry.click();
      await expect(page.getByRole('heading', { name: /VM Details/i })).toBeVisible();
    }
  });
});