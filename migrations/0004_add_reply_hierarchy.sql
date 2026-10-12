-- Cloudflare D1 Migration for Reply Thread Hierarchy
ALTER TABLE post_replies ADD COLUMN parent_reply_id TEXT;
ALTER TABLE post_replies ADD COLUMN reply_to_user TEXT;
