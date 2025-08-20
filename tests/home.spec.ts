import { test, expect } from '@playwright/test';

test('homepage has expected title and content', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Proxmox/);
  await expect(page.locator('h1')).toHaveText(/Welcome/i);
});

test('interaction avec les liens principaux de la homepage', async ({ page }) => {
  await page.goto('/');

  // Vérifier la présence des liens vers les sections principales
  const links = [
    { name: 'Alerts', href: '/alerts' },
    { name: 'Connection', href: '/connection' },
    { name: 'Metrics', href: '/metrics' },
    { name: 'Monitoring', href: '/monitoring' },
    { name: 'Settings', href: '/settings' },
    { name: 'VMs', href: '/vms' },
  ];

  for (const link of links) {
    const linkLocator = page.getByRole('link', { name: link.name });
    await expect(linkLocator).toBeVisible();
    await expect(linkLocator).toHaveAttribute('href', link.href);
  }
});