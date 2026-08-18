import { describe, expect, it } from 'vitest';
import { alignLyrics, mapTokensToLines } from '../../src/lib/karaoke/synchronizer';

describe('alignment domain contract', () => {
  it('maps every non-empty line to a discrete millisecond interval', async () => {
    const tokens = await alignLyrics(new Float32Array(16_000 * 3), 16000, '一行目\n\n二行目');

    expect(tokens).toHaveLength(2);
    expect(mapTokensToLines(tokens ?? [], ['一行目', '', '二行目'])).toEqual([
      { lineIndex: 0, startTime: 0, endTime: 1500 },
      { lineIndex: 2, startTime: 1500, endTime: 3000 }
    ]);
  });

  it('keeps incomplete or malformed model output visible to the worker validator', () => {
    expect(mapTokensToLines([{ text: 'one', start: 100, end: 50 }], ['one', 'two'])).toEqual([]);
    expect(mapTokensToLines([{ text: 'one', start: 0, end: 100 }], ['one', 'two'])).toEqual([
      { lineIndex: 0, startTime: 0, endTime: 100 }
    ]);
  });
});
