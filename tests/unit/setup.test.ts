import { describe, expect, it } from 'vitest';
import { parseNodeMajorVersion } from '../../scripts/setup-utils';

describe('setup version parser', () => {
  it('accepts supported Node version strings', () => {
    expect(parseNodeMajorVersion('v22.22.2')).toBe(22);
    expect(parseNodeMajorVersion('24.1.0')).toBe(24);
  });

  it('rejects malformed version strings', () => {
    expect(parseNodeMajorVersion('node-22')).toBeNull();
    expect(parseNodeMajorVersion('')).toBeNull();
  });
});
