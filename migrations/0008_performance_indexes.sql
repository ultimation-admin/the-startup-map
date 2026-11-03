-- Composite indexes for bounded, newest-first feed and admin queries.
CREATE INDEX IF NOT EXISTS idx_cposts_user_created_id
  ON community_posts(user_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_replies_user_created_id
  ON post_replies(user_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_profiles_created_id
  ON profiles(created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_cposts_created_id
  ON community_posts(created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_listings_created_id
  ON listings(created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_listings_review_created_id
  ON listings(review_state, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_listings_city_type_created_id
  ON listings(city, type, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_listings_sector_type_created_id
  ON listings(sector, type, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_post_reposts_user_post
  ON post_reposts(user_id, post_id);
