import { test, expect } from '@playwright/test';

test.describe('Home', () => {
  test('homepage has expected title and content', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('main');
    await expect(page).toHaveTitle(/Proxmox/);
    await expect(page.getByRole('heading', { name: /Welcome/i, level: 1 })).toBeVisible();
  });

  test('interaction avec les liens principaux de la homepage', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('main');

    // Vérifier la présence des liens vers les sections principales
    const links = [
      { name: 'Alerts', href: '/alerts' },
      { name: 'Monitoring', href: '/monitoring' },
      { name: 'Settings', href: '/settings' },
      { name: 'Virtual Machines', href: '/vms' },
    ];

    for (const link of links) {
      const linkLocator = page.getByRole('link', { name: link.name });
      await expect(linkLocator).toBeVisible();
      await expect(linkLocator).toHaveAttribute('href', link.href);
    }
  });
});