import { mkdirSync } from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { applyMigrations } from './migrations';

function getDefaultDatabasePath(): string {
  const dataRoot = process.env.KARAOKE_DATA_DIR ?? path.resolve(process.cwd(), 'data');
  mkdirSync(dataRoot, { recursive: true });
  return path.join(dataRoot, 'karaoke.db');
}

export function getDb(databasePath?: string): Database.Database {
  const db = new Database(databasePath ?? getDefaultDatabasePath());
  try {
    db.pragma('foreign_keys = ON');
    db.pragma('journal_mode = WAL');
    db.pragma('busy_timeout = 5000');
    applyMigrations(db);
  } catch (error) {
    db.close();
    throw error;
  }
  return db;
}

export function closeDb(database?: Database.Database): void {
  if (database?.open) {
    database.close();
  }
}
