import type Database from 'better-sqlite3';
import type { Language, MediaKind, Song, SongWithDetails } from '../karaoke/types';
import { closeDb, getDb } from './db';

type SongRow = Omit<Song, 'composers' | 'artists'> & { composers: string; artists: string };

function toSong(row: SongRow): Song {
  return {
    ...row,
    mediaKind: row.mediaKind as MediaKind,
    meaning: row.meaning,
    composers: JSON.parse(row.composers) as string[],
    artists: JSON.parse(row.artists) as string[]
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

export function listSongs(
  filter: { query?: string; language?: Language; artist?: string } = {}
): Song[] {
  return withDb((db) => {
    const conditions: string[] = [];
    const parameters: Record<string, string> = {};
    if (filter.query?.trim()) {
      conditions.push('LOWER(title) LIKE LOWER(@query)');
      parameters.query = `%${filter.query.trim()}%`;
    }
    if (filter.language) {
      conditions.push(
        'EXISTS (SELECT 1 FROM lyrics filter_lyrics WHERE filter_lyrics.songId = songs.id AND filter_lyrics.language = @language)'
      );
      parameters.language = filter.language;
    }
    if (filter.artist?.trim()) {
      conditions.push(
        "EXISTS (SELECT 1 FROM json_each(songs.artists) WHERE json_each.type = 'text' AND json_each.value = @artist)"
      );
      parameters.artist = filter.artist.trim();
    }
    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const rows = db
      .prepare(`SELECT * FROM songs ${where} ORDER BY createdAt DESC, id DESC`)
      .all(parameters) as SongRow[];
    return rows.map(toSong);
  });
}

export function getSong(id: number): Song | undefined {
  return withDb((db) => {
    const row = db.prepare('SELECT * FROM songs WHERE id = ?').get(id) as SongRow | undefined;
    return row ? toSong(row) : undefined;
  });
}

export function getSongWithDetails(id: number): SongWithDetails | undefined {
  return withDb((db) => {
    const row = db.prepare('SELECT * FROM songs WHERE id = ?').get(id) as SongRow | undefined;
    if (!row) return undefined;
    const song = toSong(row);
    const lyrics = db
      .prepare('SELECT * FROM lyrics WHERE songId = ? ORDER BY isPrimary DESC, id ASC')
      .all(id) as Array<{
      id: number;
      songId: number;
      language: Language;
      isPrimary: number;
      text: string;
      createdAt: string;
      updatedAt: string;
    }>;
    const lyricIds = lyrics.map((lyric) => lyric.id);
    const timings = lyricIds.length
      ? (db
          .prepare(
            `SELECT * FROM timings WHERE lyricId IN (${lyricIds.map(() => '?').join(', ')}) ORDER BY lineIndex`
          )
          .all(...lyricIds) as SongWithDetails['timings'])
      : [];
    return {
      ...song,
      lyrics: lyrics.map((lyric) => ({ ...lyric, isPrimary: lyric.isPrimary === 1 })),
      timings
    };
  });
}

export function createSong(data: Omit<Song, 'id' | 'createdAt' | 'updatedAt'>): Song {
  return withDb((db) => {
    const now = new Date().toISOString();
    const result = db
      .prepare(
        `INSERT INTO songs
          (title, filePath, mediaKind, durationMs, meaning, composers, artists, createdAt, updatedAt)
         VALUES (@title, @filePath, @mediaKind, @durationMs, @meaning, @composers, @artists, @createdAt, @updatedAt)`
      )
      .run({
        title: data.title,
        filePath: data.filePath,
        mediaKind: data.mediaKind,
        durationMs: data.durationMs,
        meaning: data.meaning,
        composers: JSON.stringify(data.composers),
        artists: JSON.stringify(data.artists),
        createdAt: now,
        updatedAt: now
      });
    return { ...data, id: Number(result.lastInsertRowid), createdAt: now, updatedAt: now };
  });
}

export function updateSong(
  id: number,
  data: Partial<Omit<Song, 'id' | 'createdAt' | 'updatedAt'>>
): Song | undefined {
  return withDb((db) => {
    const current = db.prepare('SELECT * FROM songs WHERE id = ?').get(id) as SongRow | undefined;
    if (!current) return undefined;
    const next = toSong(current);
    const values = { ...next, ...data, updatedAt: new Date().toISOString() };
    db.prepare(
      `UPDATE songs SET title = ?, filePath = ?, mediaKind = ?, durationMs = ?, meaning = ?,
       composers = ?, artists = ?, updatedAt = ? WHERE id = ?`
    ).run(
      values.title,
      values.filePath,
      values.mediaKind,
      values.durationMs,
      values.meaning,
      JSON.stringify(values.composers),
      JSON.stringify(values.artists),
      values.updatedAt,
      id
    );
    return values;
  });
}

export function deleteSong(id: number): void {
  withDb((db) => {
    db.prepare('DELETE FROM songs WHERE id = ?').run(id);
  });
}
