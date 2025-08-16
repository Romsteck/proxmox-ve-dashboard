import { test, expect } from '@playwright/test';

test('homepage has expected title and content', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Proxmox/);
  await expect(page.locator('h1')).toHaveText(/Welcome/i);
});