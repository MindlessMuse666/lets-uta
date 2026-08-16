CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  appliedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS songs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  filePath TEXT NOT NULL UNIQUE,
  mediaKind TEXT NOT NULL CHECK (mediaKind IN ('audio', 'video')),
  durationMs INTEGER NOT NULL CHECK (durationMs > 0),
  meaning TEXT NULL,
  composers TEXT NOT NULL DEFAULT '[]',
  artists TEXT NOT NULL DEFAULT '[]',
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS lyrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  songId INTEGER NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  language TEXT NOT NULL CHECK (language IN ('ru', 'ja', 'en')),
  isPrimary INTEGER NOT NULL CHECK (isPrimary IN (0, 1)),
  text TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS timings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lyricId INTEGER NOT NULL REFERENCES lyrics(id) ON DELETE CASCADE,
  lineIndex INTEGER NOT NULL CHECK (lineIndex >= 0),
  startTime INTEGER NOT NULL CHECK (startTime >= 0),
  endTime INTEGER NOT NULL CHECK (endTime > startTime),
  source TEXT NOT NULL CHECK (source IN ('auto', 'manual', 'import')),
  updatedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

INSERT OR IGNORE INTO settings (key, value, updatedAt)
VALUES ('theme', 'light', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));

INSERT OR IGNORE INTO settings (key, value, updatedAt)
VALUES ('volume', '0.8', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));

INSERT OR IGNORE INTO settings (key, value, updatedAt)
VALUES ('playbackStep', '5', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));
