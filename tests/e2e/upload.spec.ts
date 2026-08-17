import { expect, test } from '@playwright/test';

test('upload page exposes required media and lyric fields', async ({ page }) => {
  await page.goto('/upload');

  await expect(page.getByRole('heading', { name: 'Добавить песню' })).toBeVisible();
  await expect(page.getByLabel('Название')).toBeVisible();
  await expect(page.getByLabel('Основной текст')).toBeVisible();
  await expect(page.getByLabel('Файл')).toBeVisible();
});
