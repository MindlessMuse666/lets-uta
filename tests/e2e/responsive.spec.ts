import { expect, test } from '@playwright/test';

test('playback page stays usable at common viewport sizes', async ({ page }) => {
  for (const width of [320, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/songs/1');

    await expect(page.locator('.player')).toBeVisible();
    await expect(page.locator('.song-content .lyric-line').first()).toBeVisible();

    const layout = await page.evaluate(() => ({
      viewportWidth: window.innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      documentClientWidth: document.documentElement.clientWidth
    }));

    expect(layout.viewportWidth).toBe(width);
    expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewportWidth);
    expect(layout.documentClientWidth).toBe(layout.viewportWidth);
  }
});

test('playback page remains available with reduced motion and dark preference', async ({
  page
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'dark' });
  await page.goto('/songs/1');

  await expect(page.locator('.player')).toBeVisible();
  await expect(page.locator('.song-content .lyric-line').first()).toBeVisible();

  await expect
    .poll(async () =>
      page.evaluate(() => ({
        reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
        darkPreference: matchMedia('(prefers-color-scheme: dark)').matches
      }))
    )
    .toEqual({ reducedMotion: true, darkPreference: true });
});
