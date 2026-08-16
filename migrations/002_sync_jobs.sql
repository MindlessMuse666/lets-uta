CREATE TABLE IF NOT EXISTS sync_jobs (
  id TEXT PRIMARY KEY,
  songId INTEGER NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('queued', 'running', 'succeeded', 'failed', 'cancelled')),
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  processedLines INTEGER NOT NULL DEFAULT 0,
  totalLines INTEGER NOT NULL DEFAULT 0,
  message TEXT NULL,
  createdAt TEXT NOT NULL,
  startedAt TEXT NULL,
  finishedAt TEXT NULL,
  cancelRequested INTEGER NOT NULL DEFAULT 0 CHECK (cancelRequested IN (0, 1))
);
