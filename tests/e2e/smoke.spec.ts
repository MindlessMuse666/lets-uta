import { expect, test } from '@playwright/test';

test('foundation page opens without runtime errors', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle('lets-uta — локальное караоке');
  await expect(page.getByRole('heading', { name: /Песни, которые/ })).toBeVisible();
  await expect(page.getByRole('status')).toContainText('Foundation online');
});
