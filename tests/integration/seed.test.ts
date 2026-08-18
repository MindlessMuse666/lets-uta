import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { afterEach, describe, expect, it } from 'vitest';
import { closeDb, getDb } from '../../src/lib/server/db';

const temporaryRoots: string[] = [];

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe('dataset seed', () => {
  it('is idempotent when run more than once', () => {
    const dataRoot = mkdtempSync(path.join(os.tmpdir(), 'lets-uta-seed-'));
    temporaryRoots.push(dataRoot);
    const tsxCli = path.resolve('node_modules/tsx/dist/cli.mjs');
    const env = { ...process.env, KARAOKE_DATA_DIR: dataRoot };

    execFileSync(process.execPath, [tsxCli, 'scripts/seed.ts'], {
      cwd: process.cwd(),
      env,
      stdio: 'pipe'
    });
    execFileSync(process.execPath, [tsxCli, 'scripts/seed.ts'], {
      cwd: process.cwd(),
      env,
      stdio: 'pipe'
    });

    const db = getDb(path.join(dataRoot, 'karaoke.db'));
    expect(db.prepare('SELECT COUNT(*) AS count FROM songs').get()).toEqual({ count: 5 });
    expect(db.prepare('SELECT COUNT(*) AS count FROM lyrics').get()).toEqual({ count: 9 });
    expect(db.prepare('SELECT COUNT(*) AS count FROM timings').get()).toEqual({ count: 124 });
    closeDb(db);

    const fixtureDirectory = path.join(dataRoot, 'media/fixtures/MASA-WORKS-DESIGN');
    const seededMedia = readdirSync(fixtureDirectory);
    expect(seededMedia).toContain('MASA WORKS DESIGN ft.初音ミク - HEAVEN.mp3');
    expect(seededMedia.some((file) => file.endsWith('.mp4'))).toBe(true);
  });
});
