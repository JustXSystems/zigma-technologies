-- Blog design columns on resource_posts (format, per-post template, featured flag, author, key takeaways,
-- per-post display overrides).
-- The app adds these on first use (src/lib/schema-ensure.ts); run this by hand where the DB user lacks ALTER.
-- Each statement fails harmlessly with "Duplicate column" when the column already exists.

ALTER TABLE resource_posts ADD COLUMN format VARCHAR(24) NOT NULL DEFAULT '' AFTER cover_url;
ALTER TABLE resource_posts ADD COLUMN template VARCHAR(24) NOT NULL DEFAULT '' AFTER format;
ALTER TABLE resource_posts ADD COLUMN featured TINYINT(1) NOT NULL DEFAULT 0 AFTER template;
ALTER TABLE resource_posts ADD COLUMN author_name VARCHAR(120) NULL AFTER featured;
ALTER TABLE resource_posts ADD COLUMN author_role VARCHAR(160) NULL AFTER author_name;
ALTER TABLE resource_posts ADD COLUMN author_avatar_url VARCHAR(500) NULL AFTER author_role;
ALTER TABLE resource_posts ADD COLUMN key_points_json JSON NULL AFTER author_avatar_url;
ALTER TABLE resource_posts ADD COLUMN display_json JSON NULL AFTER key_points_json;
