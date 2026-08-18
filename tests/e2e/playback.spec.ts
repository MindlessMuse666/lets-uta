import { randomUUID } from 'node:crypto';
import { copyFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { closeDb, getDb } from '../../src/lib/server/db';
import { createLyric } from '../../src/lib/server/lyrics';
import { createSong } from '../../src/lib/server/songs';

const e2eDataRoot = path.resolve(process.cwd(), '.e2e-data-run');
const fixtureMediaPath =
  'media/fixtures/MASA-WORKS-DESIGN/MASA WORKS DESIGN ft.LosstimeLife-ドンドルマ.mp3';

async function waitForMedia(page: Page): Promise<void> {
  await page.waitForFunction(() => {
    const media = document.querySelector('audio, video');
    return media instanceof HTMLMediaElement && media.readyState >= 1 && media.volume === 0.8;
  });
}

async function seekTo(page: Page, seconds: number): Promise<void> {
  const seek = page.locator('input[type="range"]').first();
  await seek.evaluate((input, value) => {
    const range = input as HTMLInputElement;
    range.value = String(value);
    range.dispatchEvent(new Event('input', { bubbles: true }));
  }, seconds);
}

function createSongWithoutTranslation(): number {
  process.env.KARAOKE_DATA_DIR = e2eDataRoot;
  const id = randomUUID();
  const relativePath = `media/e2e/${id}.mp3`;
  const targetPath = path.join(e2eDataRoot, relativePath);
  mkdirSync(path.dirname(targetPath), { recursive: true });
  copyFileSync(path.resolve(process.cwd(), fixtureMediaPath), targetPath);

  const song = createSong({
    title: `E2E перевод ${id}`,
    filePath: relativePath,
    mediaKind: 'audio',
    durationMs: 202060,
    meaning: null,
    composers: ['E2E'],
    artists: ['初音ミク']
  });
  const lyric = createLyric({
    songId: song.id,
    language: 'ja',
    isPrimary: true,
    text: '一行目\n二行目'
  });
  const db = getDb();
  const now = new Date().toISOString();
  try {
    db.prepare(
      `INSERT INTO timings (lyricId, lineIndex, startTime, endTime, source, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(lyric.id, 0, 1000, 9000, 'import', now);
    db.prepare(
      `INSERT INTO timings (lyricId, lineIndex, startTime, endTime, source, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(lyric.id, 1, 9000, 15000, 'import', now);
  } finally {
    closeDb(db);
  }
  return song.id;
}

test('song page renders the media player and preserves primary lyric', async ({ page }) => {
  await page.goto('/songs/1');

  await expect(page).toHaveTitle('ドンドルマ — lets-uta');
  await expect(page.locator('audio')).toHaveCount(1);
  await expect(page.getByRole('heading', { name: 'Караоке' })).toBeVisible();
  await expect(
    page.locator('.lyrics-ja').getByText('夏の不思議な市場にだけあるその氷菓')
  ).toBeVisible();
  await expect(page.locator('.lyrics-ru').getByText('Только в летнем')).toBeVisible();
  await expect(page.locator('.lyrics-local')).toHaveCount(1);
  await expect(page.locator('.line-number')).toHaveCount(47);
  await expect(page.locator('.lyrics-ru [data-line-index="0"]')).not.toContainText('ДОНДОРУМА');
});

test('seek updates the discrete active lyric line', async ({ page }) => {
  await page.goto('/songs/1');
  await waitForMedia(page);

  await seekTo(page, 5);
  await expect(page.locator('.lyrics-ja [data-line-index="0"][aria-current="true"]')).toBeVisible();
  await expect(page.locator('.lyrics-ru [data-line-index="0"][aria-current="true"]')).toBeVisible();

  await seekTo(page, 11);
  await expect(page.locator('.lyrics-ja [data-line-index="1"][aria-current="true"]')).toBeVisible();
  await expect(page.locator('.lyrics-ja [data-line-index="0"][aria-current="true"]')).toHaveCount(
    0
  );
});

test('translation column shares primary timing without replacing ja lyrics', async ({ page }) => {
  await page.goto('/songs/1');
  await waitForMedia(page);
  await seekTo(page, 5);

  await expect(page.getByText('夏の不思議な市場にだけあるその氷菓')).toBeVisible();
  await expect(
    page.locator('.lyrics-ru .lyric-line').filter({ hasText: 'Только в летнем' })
  ).toBeVisible();
  await expect(page.locator('.lyrics-ru [data-line-index="0"][aria-current="true"]')).toBeVisible();
});

test('async add translation keeps playback controls and validates line count', async ({ page }) => {
  const songId = createSongWithoutTranslation();
  await page.goto(`/songs/${songId}`);
  await waitForMedia(page);
  await seekTo(page, 5);

  await expect(page.getByRole('button', { name: 'Добавить перевод' })).toBeVisible();
  await page.getByRole('button', { name: 'Добавить перевод' }).click();
  await page.getByRole('combobox', { name: 'Язык' }).selectOption('ru');
  await page.getByLabel('Текст перевода').fill('Одна строка');
  await page.getByRole('button', { name: 'Сохранить перевод' }).click();
  await expect(
    page.getByText('Количество строк перевода должно совпадать с японским текстом')
  ).toBeVisible();

  await page.getByLabel('Текст перевода').fill('Первая строка\nВторая строка');
  await page.getByRole('button', { name: 'Сохранить перевод' }).click();
  await expect(page.locator('.lyrics-ru').getByText('Первая строка')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Вперёд на 5 секунд' })).toBeVisible();
  await expect(page.locator('.lyrics-ja [data-line-index="0"][aria-current="true"]')).toBeVisible();
  await expect(page.locator('.lyrics-ru [data-line-index="0"][aria-current="true"]')).toBeVisible();
});

test('keyboard shortcuts control seek without leaving the page', async ({ page }) => {
  await page.goto('/songs/1');
  const audio = page.locator('audio');
  await waitForMedia(page);

  await seekTo(page, 11);
  await expect(page.locator('.lyrics-ja [data-line-index="1"][aria-current="true"]')).toBeVisible();
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
