CREATE INDEX IF NOT EXISTS idx_songs_created_at ON songs (createdAt DESC);
CREATE INDEX IF NOT EXISTS idx_lyrics_song_id ON lyrics (songId);
CREATE INDEX IF NOT EXISTS idx_timings_lyric_id ON timings (lyricId);
CREATE INDEX IF NOT EXISTS idx_sync_jobs_song_id ON sync_jobs (songId);
CREATE UNIQUE INDEX IF NOT EXISTS idx_lyrics_song_language ON lyrics (songId, language);
CREATE UNIQUE INDEX IF NOT EXISTS idx_lyrics_primary_song ON lyrics (songId) WHERE isPrimary = 1;
CREATE UNIQUE INDEX IF NOT EXISTS idx_timings_lyric_line ON timings (lyricId, lineIndex);
