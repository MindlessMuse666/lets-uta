INSERT OR IGNORE INTO settings (key, value, updatedAt)
VALUES ('autoScrollDelayMs', '3000', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));

CREATE UNIQUE INDEX IF NOT EXISTS idx_lyrics_secondary_song ON lyrics (songId) WHERE isPrimary = 0;
