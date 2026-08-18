INSERT OR IGNORE INTO settings (key, value, updatedAt)
VALUES ('autoScrollDelayMs', '3000', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));

-- Normalize databases created before the primary ja and single-secondary rules.
UPDATE lyrics
SET isPrimary = 0
WHERE isPrimary = 1 AND language <> 'ja';

UPDATE lyrics
SET isPrimary = 1
WHERE language = 'ja';

DELETE FROM lyrics
WHERE isPrimary = 0
  AND id NOT IN (
    SELECT MIN(id)
    FROM lyrics
    WHERE isPrimary = 0
    GROUP BY songId
  );

CREATE UNIQUE INDEX IF NOT EXISTS idx_lyrics_secondary_song ON lyrics (songId) WHERE isPrimary = 0;
