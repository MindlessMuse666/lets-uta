import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { assertPathInsideDataRoot, resolveStoredPath } from '../../src/lib/server/paths';

const roots: string[] = [];

afterEach(() => {
  delete process.env.KARAOKE_DATA_DIR;
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe('stored path safety', () => {
  it('resolves only relative paths inside the configured data root', () => {
    const root = mkdtempSync(path.join(os.tmpdir(), 'lets-uta-paths-'));
    roots.push(root);
    process.env.KARAOKE_DATA_DIR = root;

    expect(resolveStoredPath('media/track.mp3')).toBe(path.join(root, 'media', 'track.mp3'));
    expect(() => assertPathInsideDataRoot('../outside.mp3')).toThrow();
    expect(() => assertPathInsideDataRoot(path.join(root, 'outside.mp3'))).toThrow();
    expect(() => assertPathInsideDataRoot('')).toThrow();
  });
});
