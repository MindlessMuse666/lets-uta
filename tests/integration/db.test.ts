import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { closeDb, getDb } from '../../src/lib/server/db';
import { applyMigrations } from '../../src/lib/server/migrations';

function tableNames(db: ReturnType<typeof getDb>): string[] {
  return (
    db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name").all() as Array<{
      name: string;
    }>
  ).map((row) => row.name);
}

describe('database foundation', () => {
  it('creates the documented tables and indexes in an isolated database', () => {
    const db = getDb(':memory:');

    expect(tableNames(db)).toEqual([
      'lyrics',
      'schema_migrations',
      'settings',
      'songs',
      'sqlite_sequence',
      'sync_jobs',
      'timings'
    ]);
    expect(
      db
        .prepare(
          "SELECT name FROM sqlite_master WHERE type = 'index' AND name LIKE 'idx_%' ORDER BY name"
        )
        .all()
    ).toHaveLength(8);
    expect(db.pragma('foreign_keys', { simple: true })).toBe(1);
    expect(db.prepare('SELECT COUNT(*) AS count FROM settings').get()).toEqual({ count: 4 });

    closeDb(db);
  });

  it('applies migrations idempotently', () => {
    const db = getDb(':memory:');
    const before = db
      .prepare('SELECT version, appliedAt FROM schema_migrations ORDER BY version')
      .all();

    applyMigrations(db);

    expect(
      db.prepare('SELECT version, appliedAt FROM schema_migrations ORDER BY version').all()
    ).toEqual(before);
    closeDb(db);
  });

  it('enforces foreign keys and cascades related records', () => {
    const db = getDb(':memory:');
    const now = new Date().toISOString();
    const song = db
      .prepare(
        `INSERT INTO songs
          (title, filePath, mediaKind, durationMs, composers, artists, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run('Test', 'media/test.mp3', 'audio', 1000, '[]', '[]', now, now);
    const lyric = db
      .prepare(
        `INSERT INTO lyrics (songId, language, isPrimary, text, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(song.lastInsertRowid, 'ja', 1, '一行目', now, now);
    db.prepare(
      `INSERT INTO timings (lyricId, lineIndex, startTime, endTime, source, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(lyric.lastInsertRowid, 0, 10, 900, 'import', now);
    db.prepare(
      `INSERT INTO sync_jobs
        (id, songId, status, createdAt)
       VALUES (?, ?, ?, ?)`
    ).run('job-1', song.lastInsertRowid, 'queued', now);

    db.prepare('DELETE FROM songs WHERE id = ?').run(song.lastInsertRowid);

    expect(db.prepare('SELECT COUNT(*) AS count FROM lyrics').get()).toEqual({ count: 0 });
    expect(db.prepare('SELECT COUNT(*) AS count FROM timings').get()).toEqual({ count: 0 });
    expect(db.prepare('SELECT COUNT(*) AS count FROM sync_jobs').get()).toEqual({ count: 0 });
    closeDb(db);
  });

  it('rejects a database that is not SQLite', () => {
    const directory = mkdtempSync(path.join(os.tmpdir(), 'lets-uta-corrupt-'));
    const databasePath = path.join(directory, 'karaoke.db');
    writeFileSync(databasePath, 'not sqlite');

    try {
      expect(() => getDb(databasePath)).toThrow();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
