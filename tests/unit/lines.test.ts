import { describe, expect, it } from 'vitest';
import { getActiveLineIndex, splitText } from '../../src/lib/karaoke/lines';
import type { Timing } from '../../src/lib/karaoke/types';

const timings: Timing[] = [
  {
    id: 1,
    lyricId: 1,
    lineIndex: 0,
    startTime: 1000,
    endTime: 2000,
    source: 'import',
    updatedAt: ''
  },
  {
    id: 2,
    lyricId: 1,
    lineIndex: 2,
    startTime: 3000,
    endTime: 4000,
    source: 'import',
    updatedAt: ''
  }
];

describe('karaoke lines', () => {
  it('normalizes line endings and preserves internal blank lines', () => {
    expect(splitText('\r\nПервая\r\n\r\nВторая\n')).toEqual(['Первая', '', 'Вторая']);
  });

  it('returns the discrete active line and no line in timing gaps', () => {
    expect(getActiveLineIndex(timings, 999)).toBe(-1);
    expect(getActiveLineIndex(timings, 1000)).toBe(0);
    expect(getActiveLineIndex(timings, 2000)).toBe(-1);
    expect(getActiveLineIndex(timings, 3500)).toBe(2);
  });

  it('does not activate a line for an invalid current time', () => {
    expect(getActiveLineIndex(timings, Number.NaN)).toBe(-1);
  });
});
