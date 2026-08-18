import { expect, test } from '@playwright/test';

test('brand assets are available and the logo returns to the library', async ({ page }) => {
  await page.goto('/');

  const favicon = await page.request.get('/favicon.ico');
  expect(favicon.ok()).toBe(true);
  expect((await favicon.body()).byteLength).toBeGreaterThan(0);
  await expect(page.getByRole('link', { name: 'Lets Uta — библиотека' })).toBeVisible();
  await expect(page.getByRole('img', { name: 'Lets Uta' })).toBeVisible();
  const logo = await page.request.get('/logo_lets_uta_v1.png');
  expect(logo.ok()).toBe(true);
  expect(logo.headers()['content-type']).toMatch(/image\/png/);
});
