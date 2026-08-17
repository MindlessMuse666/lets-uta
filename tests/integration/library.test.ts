import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Song } from '../../src/lib/karaoke/types';
import { addTranslation, createLyric } from '../../src/lib/server/lyrics';
import { createSong, getSongWithDetails, listSongs } from '../../src/lib/server/songs';

let dataRoot: string;

beforeEach(() => {
  dataRoot = mkdtempSync(path.join(os.tmpdir(), 'lets-uta-library-'));
  process.env.KARAOKE_DATA_DIR = dataRoot;
});

afterEach(() => {
  delete process.env.KARAOKE_DATA_DIR;
  rmSync(dataRoot, { recursive: true, force: true });
});

function addSong(title: string, artist: string): Song {
  const song = createSong({
    title,
    filePath: `media/${title}.mp3`,
    mediaKind: 'audio',
    durationMs: 10_000,
    meaning: null,
    composers: [],
    artists: [artist]
  });
  createLyric({ songId: song.id, language: 'ja', isPrimary: true, text: '一行目\n二行目' });
  return song;
}

describe('song and lyric repositories', () => {
  it('stores details and intersects title, language and artist filters', () => {
    const first = addSong('Paper Satellites', '初音ミク');
    addSong('Signal', 'GUMI');
    addTranslation(first.id, { language: 'en', text: 'First line\nSecond line' });

    expect(listSongs({ query: 'paper', language: 'en', artist: '初音ミク' })).toHaveLength(1);
    expect(listSongs({ artist: 'GUMI' }).map((song) => song.title)).toEqual(['Signal']);
    expect(getSongWithDetails(first.id)?.lyrics).toHaveLength(2);
  });

  it('sorts newest songs first and rejects duplicate languages', () => {
    addSong('Older', 'A');
    const newest = addSong('Newer', 'B');
    addTranslation(newest.id, { language: 'ru', text: 'Первая\nВторая' });

    expect(listSongs().map((song) => song.id)).toEqual([newest.id, newest.id - 1]);
    expect(() => addTranslation(newest.id, { language: 'en', text: 'First\nSecond' })).toThrow(
      'Перевод уже добавлен'
    );
  });

  it('returns no details for an unknown song id', () => {
    expect(getSongWithDetails(99999)).toBeUndefined();
  });
});
