import { describe, expect, it } from 'vitest';
import { validateTimings } from '../../src/lib/karaoke/validate';

describe('validateTimings', () => {
  it('accepts ordered non-overlapping timings for non-empty lines', () => {
    const result = validateTimings(
      [
        { lineIndex: 0, startTime: 0, endTime: 1000 },
        { lineIndex: 1, startTime: 1000, endTime: 2500 }
      ],
      2,
      3000
    );

    expect(result.ok).toBe(true);
  });

  it('rejects duplicate, out-of-range and overlapping timings', () => {
    expect(
      validateTimings(
        [
          { lineIndex: 0, startTime: 0, endTime: 1000 },
          { lineIndex: 0, startTime: 1000, endTime: 1500 }
        ],
        2,
        3000
      ).ok
    ).toBe(false);
    expect(validateTimings([{ lineIndex: 2, startTime: 0, endTime: 1000 }], 2, 3000).ok).toBe(
      false
    );
    expect(
      validateTimings(
        [
          { lineIndex: 0, startTime: 0, endTime: 1001 },
          { lineIndex: 1, startTime: 999, endTime: 2000 }
        ],
        2,
        3000
      ).ok
    ).toBe(false);
  });
});
