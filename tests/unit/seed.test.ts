import { readFileSync } from 'node:fs';
import path from 'node:path';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { parseSongsDataset } from '../../scripts/seed-lib';

describe('seed dataset parser', () => {
  it('parses the deterministic dataset', () => {
    const raw = readFileSync(
      path.resolve(process.cwd(), 'scripts/data/songs_dataset.json'),
      'utf8'
    );
    const songs = parseSongsDataset(raw);

    expect(songs).toHaveLength(3);
    expect(songs[0].lyrics.find((lyric) => lyric.isPrimary)?.language).toBe('ja');
  });

  it('rejects malformed dataset input', () => {
    expect(() => parseSongsDataset('{"title":"broken"}')).toThrow('Dataset root must be an array');
    expect(() => parseSongsDataset('[{"title":"broken"}]')).toThrow(
      'Dataset song has invalid fields'
    );
    expect(() => parseSongsDataset('not-json')).toThrow('Dataset is not valid JSON');
  });

  it('rejects timings outside the documented integer millisecond ranges', () => {
    const raw = readFileSync(
      path.resolve(process.cwd(), 'scripts/data/songs_dataset.json'),
      'utf8'
    );
    const dataset = JSON.parse(raw) as Array<Record<string, unknown>>;
    const firstSong = dataset[0] as { lyrics: Array<{ timings: Array<Record<string, unknown>> }> };
    firstSong.lyrics[0].timings[0].endTime = firstSong.lyrics[0].timings[0].startTime;

    expect(() => parseSongsDataset(JSON.stringify(dataset))).toThrow(
      'Dataset timing has invalid fields'
    );
  });

  it('rejects every JSON scalar as a dataset root', () => {
    fc.assert(
      fc.property(fc.oneof(fc.integer(), fc.boolean(), fc.string(), fc.constant(null)), (value) => {
        expect(() => parseSongsDataset(JSON.stringify(value))).toThrow(
          'Dataset root must be an array'
        );
      })
    );
  });
});
