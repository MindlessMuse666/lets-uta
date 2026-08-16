import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import type Database from 'better-sqlite3';

type Migration = {
  version: number;
  fileName: string;
  sql: string;
};

function getMigrationsDirectory(): string {
  return path.resolve(process.cwd(), 'migrations');
}

function readMigrations(): Migration[] {
  return readdirSync(getMigrationsDirectory())
    .filter((fileName) => /^\d+_[a-z0-9_-]+\.sql$/.test(fileName))
    .map((fileName) => ({
      version: Number(fileName.slice(0, fileName.indexOf('_'))),
      fileName,
      sql: readFileSync(path.join(getMigrationsDirectory(), fileName), 'utf8')
    }))
    .sort((left, right) => left.version - right.version);
}

export function applyMigrations(db: Database.Database): void {
  db.exec(
    'CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, appliedAt TEXT NOT NULL)'
  );
  const migrations = readMigrations();
  const applied = new Set(
    db.prepare('SELECT version FROM schema_migrations ORDER BY version').all() as Array<{
      version: number;
    }>
  );

  for (const migration of migrations) {
    if ([...applied].some((entry) => entry.version === migration.version)) {
      continue;
    }

    const applyMigration = db.transaction(() => {
      db.exec(migration.sql);
      db.prepare('INSERT INTO schema_migrations (version, appliedAt) VALUES (?, ?)').run(
        migration.version,
        new Date().toISOString()
      );
    });

    applyMigration();
  }
}
