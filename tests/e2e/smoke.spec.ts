import { expect, test } from '@playwright/test';

test('library page opens with an accessible empty search state', async ({ page }) => {
  await page.goto('/?query=definitely-not-a-song');

  await expect(page).toHaveTitle('Библиотека — lets-uta');
  await expect(page.getByRole('heading', { name: /Песни, которые/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Ничего не найдено' })).toBeVisible();
});

test('unknown song id returns a safe not found response', async ({ page }) => {
  const response = await page.goto('/songs/99999');

  expect(response?.status()).toBe(404);
  await expect(page.getByText('Песня не найдена')).toBeVisible();
});

test('seeded library intersects title, language and artist filters', async ({ page }) => {
  await page.goto('/?query=Paper&language=en&artist=%E5%88%9D%E9%9F%B3%E3%83%9F%E3%82%AF');

  await expect(page.getByRole('link', { name: /Paper Satellites/ })).toBeVisible();
  await expect(page.getByText('Aoi Kestrel')).toBeVisible();
  await expect(page.getByRole('link', { name: /Сигнал после дождя/ })).toHaveCount(0);
});
