import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { closeDb, getDb } from '../../src/lib/server/db';
import { createLyric } from '../../src/lib/server/lyrics';
import { createSong } from '../../src/lib/server/songs';
import { createSyncJob, getSyncJob, requestSyncCancellation } from '../../src/lib/server/sync-jobs';
import { runSyncJob } from '../../src/lib/server/sync-worker';

let dataRoot: string;

beforeEach(() => {
  dataRoot = mkdtempSync(path.join(os.tmpdir(), 'lets-uta-sync-'));
  process.env.KARAOKE_DATA_DIR = dataRoot;
});

afterEach(() => {
  delete process.env.KARAOKE_DATA_DIR;
  rmSync(dataRoot, { recursive: true, force: true });
});

function createFixture(text = '一行目\n\n二行目'): { songId: number; lyricId: number } {
  const song = createSong({
    title: 'Sync fixture',
    filePath: 'media/sync.mp3',
    mediaKind: 'audio',
    durationMs: 3000,
    meaning: null,
    composers: [],
    artists: []
  });
  const lyric = createLyric({ songId: song.id, language: 'ja', isPrimary: true, text });
  mkdirSync(path.join(dataRoot, 'media'), { recursive: true });
  writeFileSync(path.join(dataRoot, 'media/sync.mp3'), 'fixture');
  return { songId: song.id, lyricId: lyric.id };
}

describe('sync jobs', () => {
  it('starts queued, replaces timings atomically and is idempotent', async () => {
    const fixture = createFixture();
    const first = createSyncJob(fixture.songId);
    expect(first.status).toBe('queued');

    await runSyncJob(first.id, {
      decodeAudio: async () => new Float32Array(16_000 * 3)
    });
    expect(getSyncJob(fixture.songId, first.id)).toMatchObject({
      status: 'succeeded',
      progress: 100,
      processedLines: 2
    });

    const db = getDb();
    expect(db.prepare('SELECT COUNT(*) AS count FROM timings').get()).toEqual({ count: 2 });
    closeDb(db);

    const second = createSyncJob(fixture.songId);
    await runSyncJob(second.id, {
      decodeAudio: async () => new Float32Array(16_000 * 3)
    });
    expect(getSyncJob(fixture.songId, second.id)?.status).toBe('succeeded');
    const secondDb = getDb();
    expect(secondDb.prepare('SELECT COUNT(*) AS count FROM timings').get()).toEqual({ count: 2 });
    closeDb(secondDb);
  });

  it('preserves old timings after incomplete alignment', async () => {
    const fixture = createFixture('一行目\nВторая строка');
    const db = getDb();
    db.prepare(
      `INSERT INTO timings (lyricId, lineIndex, startTime, endTime, source, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(fixture.lyricId, 0, 10, 100, 'manual', new Date().toISOString());
    closeDb(db);

    const job = createSyncJob(fixture.songId);
    await runSyncJob(job.id, {
      decodeAudio: async () => new Float32Array(16_000),
      align: async () => [{ text: 'one', start: 0, end: 1000 }]
    });

    expect(getSyncJob(fixture.songId, job.id)).toMatchObject({
      status: 'failed',
      message: 'Синхронизация не выполнена. Старые тайминги сохранены.'
    });
    const resultDb = getDb();
    expect(resultDb.prepare('SELECT lineIndex, source FROM timings').all()).toEqual([
      { lineIndex: 0, source: 'manual' }
    ]);
    closeDb(resultDb);
  });

  it('cancels before the atomic timing replacement', async () => {
    const fixture = createFixture();
    const job = createSyncJob(fixture.songId);
    expect(requestSyncCancellation(fixture.songId, job.id)?.cancelRequested).toBe(true);

    await runSyncJob(job.id, {
      decodeAudio: async () => new Float32Array(16_000 * 3)
    });

    expect(getSyncJob(fixture.songId, job.id)).toMatchObject({
      status: 'cancelled',
      message: 'Синхронизация отменена.'
    });
    const db = getDb();
    expect(db.prepare('SELECT COUNT(*) AS count FROM timings').get()).toEqual({ count: 0 });
    closeDb(db);
  });

  it('rejects a second active job and reports missing primary lyric', () => {
    const fixture = createFixture();
    const first = createSyncJob(fixture.songId);
    expect(() => createSyncJob(fixture.songId)).toThrow('Another sync job is active');
    expect(first.status).toBe('queued');

    const song = createSong({
      title: 'No primary',
      filePath: 'media/no-primary.mp3',
      mediaKind: 'audio',
      durationMs: 1000,
      meaning: null,
      composers: [],
      artists: []
    });
    expect(() => createSyncJob(song.id)).toThrow('Primary lyric not found');
  });
});
