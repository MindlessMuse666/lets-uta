import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { mkdtempSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { GET } from '../../src/routes/songs/[id]/media/+server';
import { closeDb, getDb } from '../../src/lib/server/db';

let dataRoot: string | undefined;

afterEach(() => {
  delete process.env.KARAOKE_DATA_DIR;
  if (dataRoot) rmSync(dataRoot, { recursive: true, force: true });
  dataRoot = undefined;
});

function createMediaSong(): void {
  if (!dataRoot) throw new Error('Test data root is not initialized');
  process.env.KARAOKE_DATA_DIR = dataRoot;
  mkdirSync(path.join(dataRoot, 'media'), { recursive: true });
  writeFileSync(path.join(dataRoot, 'media', 'track.mp3'), Buffer.from('0123456789'));
  const db = getDb(path.join(dataRoot, 'karaoke.db'));
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO songs
      (title, filePath, mediaKind, durationMs, meaning, composers, artists, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run('Track', 'media/track.mp3', 'audio', 10000, null, '[]', '[]', now, now);
  closeDb(db);
}

function request(range?: string): Request {
  return new Request('http://localhost/songs/1/media', {
    headers: range ? { Range: range } : undefined
  });
}

function requestEvent(range?: string): Parameters<typeof GET>[0] {
  return { params: { id: '1' }, request: request(range) } as Parameters<typeof GET>[0];
}

describe('media endpoint', () => {
  it('streams the owned media and serves a partial byte range', async () => {
    dataRoot = mkdtempSync(path.join(os.tmpdir(), 'lets-uta-endpoint-'));
    createMediaSong();

    const response = await GET(requestEvent('bytes=2-5'));

    expect(response.status).toBe(206);
    expect(response.headers.get('Accept-Ranges')).toBe('bytes');
    expect(response.headers.get('Content-Range')).toBe('bytes 2-5/10');
    expect(response.headers.get('Content-Type')).toBe('audio/mpeg');
    expect(Buffer.from(await response.arrayBuffer()).toString()).toBe('2345');
  });

  it('rejects an invalid range without reading an arbitrary path', async () => {
    dataRoot = mkdtempSync(path.join(os.tmpdir(), 'lets-uta-endpoint-'));
    createMediaSong();

    const response = await GET(requestEvent('bytes=20-30'));

    expect(response.status).toBe(416);
    expect(response.headers.get('Content-Range')).toBe('bytes */10');
  });

  it('returns a not found error when the database media is missing', async () => {
    dataRoot = mkdtempSync(path.join(os.tmpdir(), 'lets-uta-endpoint-'));
    createMediaSong();
    rmSync(path.join(dataRoot, 'media', 'track.mp3'));

    await expect(GET(requestEvent())).rejects.toMatchObject({ status: 404 });
  });
});
