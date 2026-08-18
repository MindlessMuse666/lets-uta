import { randomUUID } from 'node:crypto';
import { copyFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import { createLyric } from '../../src/lib/server/lyrics';
import { createSong } from '../../src/lib/server/songs';

const e2eDataRoot = path.resolve(process.cwd(), '.e2e-data-run');
const fixtureMediaPath =
  'media/fixtures/MASA-WORKS-DESIGN/MASA WORKS DESIGN ft.LosstimeLife-ドンドルマ.mp3';

test('starts alignment and polls the visible job progress', async ({ page }) => {
  const sourcePath = path.resolve(process.cwd(), fixtureMediaPath);
  const id = randomUUID();
  const relativePath = `media/e2e/${id}.mp3`;
  const targetPath = path.join(e2eDataRoot, relativePath);
  mkdirSync(path.dirname(targetPath), { recursive: true });
  copyFileSync(sourcePath, targetPath);

  process.env.KARAOKE_DATA_DIR = e2eDataRoot;
  const song = createSong({
    title: `E2E sync ${id}`,
    filePath: relativePath,
    mediaKind: 'audio',
    durationMs: 202060,
    meaning: null,
    composers: ['E2E'],
    artists: ['初音ミク']
  });
  createLyric({
    songId: song.id,
    language: 'ja',
    isPrimary: true,
    text: '一行目\n二行目'
  });

  await page.goto(`/songs/${song.id}`);
  const mediaResponse = await page.request.get(`/songs/${song.id}/media`);
  expect(mediaResponse.status()).toBe(200);
  await page.waitForTimeout(1000);

  const syncResponse = page.waitForResponse(`**/songs/${song.id}/sync`);
  await page.getByRole('button', { name: 'Синхронизировать' }).click();
  const response = await syncResponse;
  expect(response.status()).toBe(202);
  await expect(page.getByText('Готово')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
});
