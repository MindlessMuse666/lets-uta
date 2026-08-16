import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { getDb, closeDb } from '../src/lib/server/db';
import { parseSongsDataset } from './seed-lib';

async function main(): Promise<void> {
  const datasetPath = path.resolve(process.cwd(), 'scripts/data/songs_dataset.json');
  const dataset = parseSongsDataset(await readFile(datasetPath, 'utf8'));
  const db = getDb();
  const now = new Date().toISOString();

  try {
    const seed = db.transaction(() => {
      const insertSong = db.prepare(
        `INSERT OR IGNORE INTO songs
          (title, filePath, mediaKind, durationMs, meaning, composers, artists, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );
      const findSong = db.prepare('SELECT id FROM songs WHERE filePath = ?');
      const insertLyric = db.prepare(
        `INSERT OR IGNORE INTO lyrics
          (songId, language, isPrimary, text, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?)`
      );
      const findLyric = db.prepare('SELECT id FROM lyrics WHERE songId = ? AND language = ?');
      const insertTiming = db.prepare(
        `INSERT OR IGNORE INTO timings
          (lyricId, lineIndex, startTime, endTime, source, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?)`
      );

      for (const song of dataset) {
        insertSong.run(
          song.title,
          song.filePath,
          song.mediaKind,
          song.durationMs,
          song.meaning,
          JSON.stringify(song.composers),
          JSON.stringify(song.artists),
          now,
          now
        );
        const songRow = findSong.get(song.filePath) as { id: number } | undefined;
        if (!songRow) throw new Error('Seeded song could not be found after insert');

        for (const lyric of song.lyrics) {
          insertLyric.run(
            songRow.id,
            lyric.language,
            lyric.isPrimary ? 1 : 0,
            lyric.text,
            now,
            now
          );
          const lyricRow = findLyric.get(songRow.id, lyric.language) as { id: number } | undefined;
          if (!lyricRow) throw new Error('Seeded lyric could not be found after insert');
          for (const timing of lyric.timings) {
            insertTiming.run(
              lyricRow.id,
              timing.lineIndex,
              timing.startTime,
              timing.endTime,
              timing.source,
              now
            );
          }
        }
      }
    });

    seed();
    console.log(`Seed completed: ${dataset.length} songs`);
  } finally {
    closeDb(db);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
