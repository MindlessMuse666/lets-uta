import { readdir } from 'node:fs/promises';
import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { saveUploadedMedia } from '../../src/lib/server/media';

let dataRoot: string | undefined;

afterEach(() => {
  delete process.env.KARAOKE_DATA_DIR;
  if (dataRoot) rmSync(dataRoot, { recursive: true, force: true });
  dataRoot = undefined;
});

describe('media storage', () => {
  it('cleans the temporary file when FFmpeg cannot inspect media', async () => {
    dataRoot = mkdtempSync(path.join(os.tmpdir(), 'lets-uta-media-'));
    process.env.KARAOKE_DATA_DIR = dataRoot;
    const file = new File([new Uint8Array([1, 2, 3])], 'song.mp3', { type: 'audio/mpeg' });

    await expect(saveUploadedMedia(file)).rejects.toThrow();
    await expect(readdir(path.join(dataRoot, 'tmp'))).resolves.toEqual([]);
    await expect(readdir(path.join(dataRoot, 'media'))).resolves.toEqual([]);
  });
});
