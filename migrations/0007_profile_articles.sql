CREATE TABLE IF NOT EXISTS profile_articles (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  profile_id TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  title TEXT NOT NULL,
  blocks TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (profile_id) REFERENCES listings(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_profile_articles_profile
  ON profile_articles(profile_id, updated_at DESC);
