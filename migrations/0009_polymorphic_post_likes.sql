-- Upgrade the original post-only likes table to the interaction model used by the app.
-- Existing likes are retained as post likes; the target type also enables reply likes.
ALTER TABLE post_likes RENAME TO post_likes_legacy;

CREATE TABLE post_likes (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('post', 'reply')),
  target_id   TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE,
  UNIQUE(user_id, target_type, target_id)
);

INSERT OR IGNORE INTO post_likes (id, user_id, target_type, target_id, created_at)
SELECT 'legacy-' || lower(hex(randomblob(16))), user_id, 'post', post_id, created_at
FROM post_likes_legacy;

DROP TABLE post_likes_legacy;

CREATE INDEX idx_likes_target ON post_likes(target_type, target_id);
CREATE INDEX idx_likes_user ON post_likes(user_id);
CREATE INDEX idx_post_likes_user_target ON post_likes(user_id, target_type, target_id);
