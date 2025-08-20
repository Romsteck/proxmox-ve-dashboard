import { test, expect } from '@playwright/test';

test.describe('Server Management', () => {
  const server = {
    host: 'test-server.local',
    port: '8006',
    username: 'root@pam',
    token: 'dummy-token',
  };
  const newHost = 'updated-server.local';

  test.beforeEach(async ({ page }) => {
    await page.goto('/connection');
  });

  test('should add a new server', async ({ page }) => {
    await page.getByRole('button', { name: /Add Server/i }).click();
    await page.getByLabel('Host').fill(server.host);
    await page.getByLabel('Port').fill(server.port);
    await page.getByLabel('Username').fill(server.username);
    await page.getByLabel('Token').fill(server.token);
    await page.getByRole('button', { name: /Save/i }).click();

    await expect(page.getByRole('listitem').filter({ hasText: server.host })).toBeVisible();
  });

  test('should edit an existing server', async ({ page }) => {
    // For this test to run independently, we first need to add a server.
    await page.getByRole('button', { name: /Add Server/i }).click();
    await page.getByLabel('Host').fill(server.host);
    await page.getByLabel('Port').fill(server.port);
    await page.getByLabel('Username').fill(server.username);
    await page.getByLabel('Token').fill(server.token);
    await page.getByRole('button', { name: /Save/i }).click();

    const serverEntry = page.getByRole('listitem').filter({ hasText: server.host });
    await serverEntry.getByRole('button', { name: /Edit/i }).click();

    page.on('dialog', async dialog => {
      expect(dialog.type()).toContain('prompt');
      expect(dialog.message()).toContain('Enter new host');
      await dialog.accept(newHost);
    });

    await expect(page.getByRole('listitem').filter({ hasText: newHost })).toBeVisible();
  });

  test('should delete a server', async ({ page }) => {
    // For this test to run independently, we first need to add a server.
    await page.getByRole('button', { name: /Add Server/i }).click();
    await page.getByLabel('Host').fill(server.host);
    await page.getByLabel('Port').fill(server.port);
    await page.getByLabel('Username').fill(server.username);
    await page.getByLabel('Token').fill(server.token);
    await page.getByRole('button', { name: /Save/i }).click();

    const serverEntry = page.getByRole('listitem').filter({ hasText: server.host });
    page.on('dialog', dialog => dialog.accept());
    await serverEntry.getByRole('button', { name: /Delete/i }).click();

    await expect(page.getByRole('listitem').filter({ hasText: server.host })).not.toBeVisible();
  });
});