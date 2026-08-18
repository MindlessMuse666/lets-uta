import { randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';
import { splitText } from '../karaoke/lines';
import type { SyncJob, SyncJobStatus } from '../karaoke/types';
import { closeDb, getDb } from './db';

type SyncJobRow = Omit<SyncJob, 'cancelRequested'> & { cancelRequested: number };

export class SyncJobError extends Error {
  constructor(
    message: string,
    public readonly kind: 'missing-song' | 'missing-primary' | 'active'
  ) {
    super(message);
  }
}

function toSyncJob(row: SyncJobRow): SyncJob {
  return {
    ...row,
    status: row.status as SyncJobStatus,
    cancelRequested: row.cancelRequested === 1
  };
}

function withDb<T>(callback: (db: Database.Database) => T): T {
  const db = getDb();
  try {
    return callback(db);
  } finally {
    closeDb(db);
  }
}

function readJob(db: Database.Database, jobId: string): SyncJob | undefined {
  const row = db.prepare('SELECT * FROM sync_jobs WHERE id = ?').get(jobId) as
    SyncJobRow | undefined;
  return row ? toSyncJob(row) : undefined;
}

export function createSyncJob(songId: number): SyncJob {
  return withDb((db) => {
    const song = db.prepare('SELECT id FROM songs WHERE id = ?').get(songId) as
      { id: number } | undefined;
    if (!song) throw new SyncJobError('Song not found', 'missing-song');
    const primary = db
      .prepare('SELECT text FROM lyrics WHERE songId = ? AND isPrimary = 1 AND language = ?')
      .get(songId, 'ja') as { text: string } | undefined;
    if (!primary) throw new SyncJobError('Primary lyric not found', 'missing-primary');

    const active = db
      .prepare(
        `SELECT * FROM sync_jobs
         WHERE status IN ('queued', 'running')
         ORDER BY createdAt DESC LIMIT 1`
      )
      .get() as SyncJobRow | undefined;
    if (active) throw new SyncJobError('Another sync job is active', 'active');

    const now = new Date().toISOString();
    const row = {
      id: randomUUID(),
      songId,
      status: 'queued' as const,
      progress: 0,
      processedLines: 0,
      totalLines: splitText(primary.text).filter((line) => line !== '').length,
      message: null,
      createdAt: now,
      startedAt: null,
      finishedAt: null,
      cancelRequested: 0
    };
    db.prepare(
      `INSERT INTO sync_jobs
        (id, songId, status, progress, processedLines, totalLines, message, createdAt, startedAt, finishedAt, cancelRequested)
       VALUES (@id, @songId, @status, @progress, @processedLines, @totalLines, @message, @createdAt, @startedAt, @finishedAt, @cancelRequested)`
    ).run(row);
    return toSyncJob(row);
  });
}

export function getSyncJob(songId: number, jobId: string): SyncJob | undefined {
  return withDb((db) => {
    const row = db
      .prepare('SELECT * FROM sync_jobs WHERE id = ? AND songId = ?')
      .get(jobId, songId) as SyncJobRow | undefined;
    return row ? toSyncJob(row) : undefined;
  });
}

export function getSyncJobById(jobId: string): SyncJob | undefined {
  return withDb((db) => readJob(db, jobId));
}

export function getLatestSyncJob(songId: number): SyncJob | undefined {
  return withDb((db) => {
    const row = db
      .prepare('SELECT * FROM sync_jobs WHERE songId = ? ORDER BY createdAt DESC LIMIT 1')
      .get(songId) as SyncJobRow | undefined;
    return row ? toSyncJob(row) : undefined;
  });
}

export function requestSyncCancellation(songId: number, jobId: string): SyncJob | undefined {
  return withDb((db) => {
    const update = db
      .prepare(
        `UPDATE sync_jobs SET cancelRequested = 1
         WHERE id = ? AND songId = ? AND status IN ('queued', 'running')`
      )
      .run(jobId, songId);
    if (update.changes === 0) return getSyncJobInDb(db, songId, jobId);
    return getSyncJobInDb(db, songId, jobId);
  });
}

function getSyncJobInDb(db: Database.Database, songId: number, jobId: string): SyncJob | undefined {
  const row = db
    .prepare('SELECT * FROM sync_jobs WHERE id = ? AND songId = ?')
    .get(jobId, songId) as SyncJobRow | undefined;
  return row ? toSyncJob(row) : undefined;
}

export function markSyncRunning(jobId: string): boolean {
  return withDb((db) => {
    const result = db
      .prepare(
        `UPDATE sync_jobs SET status = 'running', startedAt = ?, progress = 1
         WHERE id = ? AND status = 'queued' AND cancelRequested = 0`
      )
      .run(new Date().toISOString(), jobId);
    return result.changes === 1;
  });
}

export function updateSyncProgress(jobId: string, progress: number, processedLines: number): void {
  withDb((db) => {
    db.prepare(
      `UPDATE sync_jobs SET progress = ?, processedLines = ?
       WHERE id = ? AND status = 'running'`
    ).run(Math.max(0, Math.min(100, Math.trunc(progress))), Math.max(0, processedLines), jobId);
  });
}

export function finishSyncJob(
  jobId: string,
  status: Extract<SyncJobStatus, 'succeeded' | 'failed' | 'cancelled'>,
  message: string | null
): void {
  withDb((db) => {
    db.prepare(
      `UPDATE sync_jobs SET status = ?, progress = CASE WHEN ? = 'succeeded' THEN 100 ELSE progress END,
       message = ?, finishedAt = ?
       WHERE id = ? AND status IN ('queued', 'running')`
    ).run(status, status, message, new Date().toISOString(), jobId);
  });
}
