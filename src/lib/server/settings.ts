import type Database from 'better-sqlite3';
import type { Theme } from '../karaoke/types';
import { closeDb, getDb } from './db';

type SettingsRow = {
  key: string;
  value: string;
};

const defaultSettings = {
  theme: 'light' as Theme,
  volume: 0.8,
  playbackStep: 5,
  autoScrollDelayMs: 3000
};

function withDb<T>(callback: (db: Database.Database) => T): T {
  const db = getDb();
  try {
    return callback(db);
  } finally {
    closeDb(db);
  }
}

function readSetting(db: Database.Database, key: keyof typeof defaultSettings): string | undefined {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as
    SettingsRow | undefined;
  return row?.value;
}

function upsertSetting(db: Database.Database, key: string, value: string): void {
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO settings (key, value, updatedAt)
     VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updatedAt = excluded.updatedAt`
  ).run(key, value, now);
}

export function getSettings(): {
  theme: Theme;
  volume: number;
  playbackStep: number;
  autoScrollDelayMs: number;
} {
  return withDb((db) => {
    const theme = readSetting(db, 'theme');
    const volume = Number(readSetting(db, 'volume'));
    const playbackStep = Number(readSetting(db, 'playbackStep'));
    const autoScrollDelayMs = Number(readSetting(db, 'autoScrollDelayMs'));
    return {
      theme: theme === 'dark' || theme === 'light' ? theme : defaultSettings.theme,
      volume:
        Number.isFinite(volume) && volume >= 0 && volume <= 1 ? volume : defaultSettings.volume,
      playbackStep:
        Number.isFinite(playbackStep) && playbackStep > 0
          ? playbackStep
          : defaultSettings.playbackStep,
      autoScrollDelayMs:
        Number.isFinite(autoScrollDelayMs) && autoScrollDelayMs > 0
          ? Math.trunc(autoScrollDelayMs)
          : defaultSettings.autoScrollDelayMs
    };
  });
}

export function updateSettings(input: {
  theme?: Theme;
  volume?: number;
  playbackStep?: number;
  autoScrollDelayMs?: number;
}): void {
  withDb((db) => {
    const updates = db.transaction(() => {
      if (input.theme) upsertSetting(db, 'theme', input.theme);
      if (typeof input.volume === 'number') upsertSetting(db, 'volume', String(input.volume));
      if (typeof input.playbackStep === 'number') {
        upsertSetting(db, 'playbackStep', String(input.playbackStep));
      }
      if (typeof input.autoScrollDelayMs === 'number') {
        upsertSetting(db, 'autoScrollDelayMs', String(input.autoScrollDelayMs));
      }
    });
    updates();
  });
}
