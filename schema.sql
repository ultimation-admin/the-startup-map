-- ============================================================
-- TheStartupMap - Cloudflare D1 SQLite Schema
-- ============================================================
-- Deploy: npx wrangler d1 execute thestartupmap-db --remote --file=./schema.sql
-- Local:  npx wrangler d1 execute thestartupmap-db --local  --file=./schema.sql
-- ============================================================

PRAGMA foreign_keys = ON;

-- 1. PROFILES (synced from Clerk)
CREATE TABLE IF NOT EXISTS profiles (
  id            TEXT PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  username      TEXT UNIQUE,
  full_name     TEXT NOT NULL DEFAULT '',
  avatar_url    TEXT,
  phone_number  TEXT,
  headline      TEXT,
  bio           TEXT,
  role          TEXT NOT NULL DEFAULT 'user'
                CHECK (role IN ('user', 'moderator', 'admin')),
  website       TEXT,
  twitter_url   TEXT,
  linkedin_url  TEXT,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- 2. LISTINGS (startups, VCs, people - map pins)
CREATE TABLE IF NOT EXISTS listings (
  id            TEXT PRIMARY KEY,
  owner_id      TEXT NOT NULL,
  type          TEXT NOT NULL DEFAULT 'startup'
                CHECK (type IN ('startup', 'vc', 'person')),
  name          TEXT NOT NULL,
  slug          TEXT NOT NULL UNIQUE,
  city          TEXT NOT NULL,
  latitude      REAL NOT NULL,
  longitude     REAL NOT NULL,
  sector        TEXT NOT NULL DEFAULT 'General',
  stage         TEXT,
  description   TEXT,
  website       TEXT,
  logo_url      TEXT,
  tweet_url     TEXT,
  phone_number  TEXT,
  review_state  TEXT NOT NULL DEFAULT 'pending'
                CHECK (review_state IN ('draft', 'pending', 'verified', 'rejected')),
  view_count    INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (owner_id) REFERENCES profiles(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_listings_owner ON listings(owner_id);
CREATE INDEX IF NOT EXISTS idx_listings_slug ON listings(slug);
CREATE INDEX IF NOT EXISTS idx_listings_review ON listings(review_state, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_listings_coords ON listings(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_listings_type ON listings(type);

-- 3. COMMUNITY POSTS (24h ephemeral feed)
CREATE TABLE IF NOT EXISTS community_posts (
  id              TEXT PRIMARY KEY,
  community_id    TEXT NOT NULL,
  community_name  TEXT NOT NULL,
  user_id         TEXT NOT NULL,
  user_name       TEXT NOT NULL,
  user_avatar     TEXT,
  user_initials   TEXT NOT NULL,
  user_role       TEXT,
  content         TEXT NOT NULL,
  image_url       TEXT,
  likes_count     INTEGER NOT NULL DEFAULT 0,
  views_count     INTEGER NOT NULL DEFAULT 0,
  replies_count   INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  expires_at      TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_cposts_community ON community_posts(community_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cposts_user ON community_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_cposts_expires ON community_posts(expires_at);

-- 4. POST REPLIES
CREATE TABLE IF NOT EXISTS post_replies (
  id            TEXT PRIMARY KEY,
  post_id       TEXT NOT NULL,
  user_id       TEXT NOT NULL,
  user_name     TEXT NOT NULL,
  user_avatar   TEXT,
  user_initials TEXT NOT NULL,
  content       TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (post_id) REFERENCES community_posts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_replies_post ON post_replies(post_id, created_at ASC);

-- 5. POST LIKES (polymorphic: post or reply)
CREATE TABLE IF NOT EXISTS post_likes (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('post', 'reply')),
  target_id   TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE,
  UNIQUE(user_id, target_type, target_id)
);

CREATE INDEX IF NOT EXISTS idx_likes_target ON post_likes(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_likes_user ON post_likes(user_id);

-- 6. SPOTLIGHTS (24h story ads, 9AM cycle)
CREATE TABLE IF NOT EXISTS spotlights (
  id          TEXT PRIMARY KEY,
  listing_id  TEXT,
  user_id     TEXT NOT NULL,
  name        TEXT NOT NULL,
  tagline     TEXT NOT NULL,
  type        TEXT NOT NULL DEFAULT 'startup'
              CHECK (type IN ('startup', 'people', 'vc')),
  logo_url    TEXT,
  media_url   TEXT,
  media_type  TEXT DEFAULT 'image'
              CHECK (media_type IN ('image', 'video')),
  color       TEXT NOT NULL DEFAULT '#8B5CF6',
  initials    TEXT NOT NULL,
  city        TEXT NOT NULL,
  website_url TEXT,
  views_count INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  expires_at  TEXT NOT NULL,
  FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_spotlights_active ON spotlights(expires_at DESC);
CREATE INDEX IF NOT EXISTS idx_spotlights_user ON spotlights(user_id);

-- 7. JOB POSTINGS
CREATE TABLE IF NOT EXISTS job_postings (
  id              TEXT PRIMARY KEY,
  listing_id      TEXT NOT NULL,
  title           TEXT NOT NULL,
  location        TEXT NOT NULL,
  employment_type TEXT NOT NULL,
  application_url TEXT NOT NULL,
  is_active       INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_jobs_listing ON job_postings(listing_id, is_active);

-- 8. MODERATION LOGS (admin audit trail)
CREATE TABLE IF NOT EXISTS moderation_logs (
  id              TEXT PRIMARY KEY,
  listing_id      TEXT NOT NULL,
  moderator_id    TEXT NOT NULL,
  previous_state  TEXT,
  new_state       TEXT NOT NULL,
  reason          TEXT,
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE,
  FOREIGN KEY (moderator_id) REFERENCES profiles(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_modlogs_listing ON moderation_logs(listing_id, created_at DESC);

-- 9. COMMUNITY MEMBERSHIPS (joined communities per user)
CREATE TABLE IF NOT EXISTS community_memberships (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL,
  community_id  TEXT NOT NULL,
  joined_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE,
  UNIQUE(user_id, community_id)
);

CREATE INDEX IF NOT EXISTS idx_memberships_user ON community_memberships(user_id);
