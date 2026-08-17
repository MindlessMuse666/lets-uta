import type Database from 'better-sqlite3';
import type { Language, Lyric } from '../karaoke/types';
import { closeDb, getDb } from './db';

type LyricRow = Omit<Lyric, 'isPrimary'> & { isPrimary: number };

function toLyric(row: LyricRow): Lyric {
  return { ...row, language: row.language as Language, isPrimary: row.isPrimary === 1 };
}

function normalizeText(text: string): string {
  return text.replace(/\r\n?/g, '\n');
}

function withDb<T>(callback: (db: Database.Database) => T): T {
  const db = getDb();
  try {
    return callback(db);
  } finally {
    closeDb(db);
  }
}

export function getLyricsForSong(songId: number): Lyric[] {
  return withDb((db) => {
    const rows = db
      .prepare('SELECT * FROM lyrics WHERE songId = ? ORDER BY isPrimary DESC, id ASC')
      .all(songId) as LyricRow[];
    return rows.map(toLyric);
  });
}

export function getLyric(id: number): Lyric | undefined {
  return withDb((db) => {
    const row = db.prepare('SELECT * FROM lyrics WHERE id = ?').get(id) as LyricRow | undefined;
    return row ? toLyric(row) : undefined;
  });
}

export function createLyric(data: Omit<Lyric, 'id' | 'createdAt' | 'updatedAt'>): Lyric {
  return withDb((db) => {
    const now = new Date().toISOString();
    const result = db
      .prepare(
        `INSERT INTO lyrics (songId, language, isPrimary, text, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(data.songId, data.language, data.isPrimary ? 1 : 0, normalizeText(data.text), now, now);
    return {
      ...data,
      id: Number(result.lastInsertRowid),
      text: normalizeText(data.text),
      createdAt: now,
      updatedAt: now
    };
  });
}

export function updateLyric(
  id: number,
  data: Pick<Lyric, 'language' | 'isPrimary' | 'text'>
): Lyric | undefined {
  return withDb((db) => {
    const now = new Date().toISOString();
    const result = db
      .prepare(
        `UPDATE lyrics SET language = ?, isPrimary = ?, text = ?, updatedAt = ? WHERE id = ?`
      )
      .run(data.language, data.isPrimary ? 1 : 0, normalizeText(data.text), now, id);
    if (result.changes === 0) return undefined;
    const row = db.prepare('SELECT * FROM lyrics WHERE id = ?').get(id) as LyricRow;
    return toLyric(row);
  });
}

export function deleteLyric(id: number): void {
  withDb((db) => {
    db.prepare('DELETE FROM lyrics WHERE id = ?').run(id);
  });
}
