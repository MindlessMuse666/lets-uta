import type Database from 'better-sqlite3';
import { splitText } from '../karaoke/lines';
import type { Timing, TimingInput, TimingSource } from '../karaoke/types';
import { validateTimings } from '../karaoke/validate';
import { closeDb, getDb } from './db';

type TimingRow = Timing;

function withDb<T>(callback: (db: Database.Database) => T): T {
  const db = getDb();
  try {
    return callback(db);
  } finally {
    closeDb(db);
  }
}

function toTiming(row: TimingRow): Timing {
  return { ...row, source: row.source as TimingSource };
}

function getTimingContext(
  db: Database.Database,
  lyricId: number
): { lineCount: number; durationMs: number; isPrimary: boolean } | undefined {
  const row = db
    .prepare(
      `SELECT lyrics.text, lyrics.isPrimary, songs.durationMs
       FROM lyrics JOIN songs ON songs.id = lyrics.songId
       WHERE lyrics.id = ?`
    )
    .get(lyricId) as { text: string; isPrimary: number; durationMs: number } | undefined;
  if (!row) return undefined;
  return {
    lineCount: splitText(row.text).length,
    durationMs: row.durationMs,
    isPrimary: row.isPrimary === 1
  };
}

export function getTimingsForLyric(lyricId: number): Timing[] {
  return withDb((db) =>
    (
      db
        .prepare('SELECT * FROM timings WHERE lyricId = ? ORDER BY lineIndex')
        .all(lyricId) as TimingRow[]
    ).map(toTiming)
  );
}

export function replaceTimings(
  lyricId: number,
  timings: TimingInput[],
  source: TimingSource
): Timing[] {
  return withDb((db) => {
    const context = getTimingContext(db, lyricId);
    if (!context || !context.isPrimary) throw new Error('Timings require the primary lyric');
    const validation = validateTimings(timings, context.lineCount, context.durationMs);
    if (!validation.ok) throw new Error(validation.errors.join('; '));

    const now = new Date().toISOString();
    const replace = db.transaction(() => {
      db.prepare('DELETE FROM timings WHERE lyricId = ?').run(lyricId);
      const insert = db.prepare(
        `INSERT INTO timings (lyricId, lineIndex, startTime, endTime, source, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?)`
      );
      for (const timing of validation.value) {
        insert.run(lyricId, timing.lineIndex, timing.startTime, timing.endTime, source, now);
      }
      return db
        .prepare('SELECT * FROM timings WHERE lyricId = ? ORDER BY lineIndex')
        .all(lyricId) as TimingRow[];
    });
    return replace().map(toTiming);
  });
}

export function updateTiming(id: number, input: TimingInput): Timing | undefined {
  return withDb((db) => {
    const current = db.prepare('SELECT * FROM timings WHERE id = ?').get(id) as
      TimingRow | undefined;
    if (!current) return undefined;
    const all = db
      .prepare('SELECT * FROM timings WHERE lyricId = ? ORDER BY lineIndex')
      .all(current.lyricId) as TimingRow[];
    const next = all.map((timing) => (timing.id === id ? input : timing));
    const context = getTimingContext(db, current.lyricId);
    if (!context) return undefined;
    const validation = validateTimings(next, context.lineCount, context.durationMs);
    if (!validation.ok) throw new Error(validation.errors.join('; '));
    const now = new Date().toISOString();
    db.prepare(
      'UPDATE timings SET lineIndex = ?, startTime = ?, endTime = ?, source = ?, updatedAt = ? WHERE id = ?'
    ).run(input.lineIndex, input.startTime, input.endTime, 'manual', now, id);
    const row = db.prepare('SELECT * FROM timings WHERE id = ?').get(id) as TimingRow;
    return toTiming(row);
  });
}

export function deleteTiming(id: number): void {
  withDb((db) => {
    db.prepare('DELETE FROM timings WHERE id = ?').run(id);
  });
}

export function deleteTimingsForLyric(lyricId: number): void {
  withDb((db) => {
    db.prepare('DELETE FROM timings WHERE lyricId = ?').run(lyricId);
  });
}
