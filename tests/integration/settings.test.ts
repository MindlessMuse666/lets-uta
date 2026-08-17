import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getSettings, updateSettings } from '../../src/lib/server/settings';

let dataRoot: string;

beforeEach(() => {
  dataRoot = mkdtempSync(path.join(os.tmpdir(), 'lets-uta-settings-'));
  process.env.KARAOKE_DATA_DIR = dataRoot;
});

afterEach(() => {
  delete process.env.KARAOKE_DATA_DIR;
  rmSync(dataRoot, { recursive: true, force: true });
});

describe('settings service', () => {
  it('reads documented defaults and persists updates', () => {
    expect(getSettings()).toEqual({
      theme: 'light',
      volume: 0.8,
      playbackStep: 5,
      autoScrollDelayMs: 3000
    });

    updateSettings({ autoScrollDelayMs: 1200, volume: 0.35 });

    expect(getSettings()).toEqual({
      theme: 'light',
      volume: 0.35,
      playbackStep: 5,
      autoScrollDelayMs: 1200
    });
  });
});
