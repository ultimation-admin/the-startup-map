-- Cloudflare D1 Composite Index Migrations for High-Performance Queries

CREATE INDEX IF NOT EXISTS idx_listings_slug_type ON listings(slug, type);
CREATE INDEX IF NOT EXISTS idx_listings_owner ON listings(owner_id);
CREATE INDEX IF NOT EXISTS idx_listings_review_created ON listings(review_state, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_community_created ON community_posts(community_id, created_at DESC);
