import type Database from 'better-sqlite3';
import { splitText } from '../karaoke/lines';
import type { Language, Lyric, SecondaryLanguage } from '../karaoke/types';
import { closeDb, getDb } from './db';

type LyricRow = Omit<Lyric, 'isPrimary'> & { isPrimary: number };

function toLyric(row: LyricRow): Lyric {
  return { ...row, language: row.language as Language, isPrimary: row.isPrimary === 1 };
}

function normalizeText(text: string): string {
  return text.replace(/\r\n?/g, '\n');
}

function insertLyricRow(
  db: Database.Database,
  data: Omit<Lyric, 'id' | 'createdAt' | 'updatedAt'>,
  now: string
): Lyric {
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
    return insertLyricRow(db, data, now);
  });
}

export function addTranslation(
  songId: number,
  input: { language: SecondaryLanguage; text: string }
): Lyric {
  return withDb((db) => {
    const add = db.transaction(() => {
      const song = db.prepare('SELECT id FROM songs WHERE id = ?').get(songId) as
        { id: number } | undefined;
      if (!song) throw new Error('Song not found');

      const primary = db
        .prepare('SELECT id, text FROM lyrics WHERE songId = ? AND isPrimary = 1')
        .get(songId) as { id: number; text: string } | undefined;
      if (!primary) throw new Error('Primary lyric not found');

      const existingSecondary = db
        .prepare('SELECT id FROM lyrics WHERE songId = ? AND isPrimary = 0')
        .get(songId) as { id: number } | undefined;
      if (existingSecondary) throw new Error('Перевод уже добавлен');

      if (splitText(primary.text).length !== splitText(input.text).length) {
        throw new Error('Количество строк перевода должно совпадать с японским текстом');
      }

      return insertLyricRow(
        db,
        { songId, language: input.language, isPrimary: false, text: input.text },
        new Date().toISOString()
      );
    });
    return add();
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
