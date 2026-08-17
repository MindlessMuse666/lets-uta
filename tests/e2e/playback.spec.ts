import { expect, test } from '@playwright/test';

test('song page renders the media player and preserves primary lyric', async ({ page }) => {
  await page.goto('/songs/1');

  await expect(page).toHaveTitle('ドンドルマ — lets-uta');
  await expect(page.locator('audio')).toHaveCount(1);
  await expect(page.getByRole('heading', { name: 'Текст песни' })).toBeVisible();
  await expect(page.getByText('夏の不思議な市場にだけあるその氷菓')).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Выбрать язык' })).toBeVisible();
});

test('seek updates the discrete active lyric line', async ({ page }) => {
  await page.goto('/songs/1');
  await page.waitForFunction(() => {
    const media = document.querySelector('audio');
    return media instanceof HTMLMediaElement && media.readyState >= 1;
  });

  const seek = page.locator('input[type="range"]').first();
  await seek.fill('5');
  await expect(page.locator('[data-line-index="0"][aria-current="true"]')).toBeVisible();

  await seek.fill('11');
  await expect(page.locator('[data-line-index="1"][aria-current="true"]')).toBeVisible();
  await expect(page.locator('[data-line-index="0"][aria-current="true"]')).toHaveCount(0);
});

test('secondary lyric selection does not replace the primary lyric', async ({ page }) => {
  await page.goto('/songs/1');
  await page.getByRole('combobox', { name: 'Выбрать язык' }).selectOption({ label: 'ru' });

  await expect(page.getByText('夏の不思議な市場にだけあるその氷菓')).toBeVisible();
  await expect(
    page.locator('.secondary .lyric-line').filter({ hasText: 'ДОНДОРУМА' }).first()
  ).toBeVisible();
  await expect(page.locator('.secondary [aria-current="true"]')).toHaveCount(0);
});

test('keyboard shortcuts control seek without leaving the page', async ({ page }) => {
  await page.goto('/songs/1');
  const audio = page.locator('audio');
  await page.waitForFunction(() => {
    const media = document.querySelector('audio');
    return media instanceof HTMLMediaElement && media.readyState >= 1;
  });

  const seek = page.locator('input[type="range"]').first();
  await seek.fill('11');
  await expect(page.locator('[data-line-index="1"][aria-current="true"]')).toBeVisible();
  await page.getByRole('button', { name: 'Вперёд на 5 секунд' }).click();
  await expect(audio).toHaveJSProperty('currentTime', 16);
  await page.locator('h1').click();
  await page.keyboard.press('ArrowRight');
  await expect(audio).toHaveJSProperty('currentTime', 21);

  await page.keyboard.press('k');
  await expect(page.getByRole('button', { name: 'Пауза' })).toBeVisible();
  await page.keyboard.press(' ');
  await expect(page.getByRole('button', { name: 'Играть' })).toBeVisible();
});
