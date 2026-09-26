-- Upgrade existing DBs: per-item SEO overrides (meta title/description, share image, noindex).
-- The app also adds these on first catalog read (src/lib/schema-ensure.ts); run this when
-- the DB user lacks ALTER privilege at runtime.
-- Uses DATABASE() from the connection — do not hardcode a schema name.
-- Idempotent.

SET @db = DATABASE();

SET @exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'catalog_items' AND COLUMN_NAME = 'meta_title'
);
SET @sql := IF(@exists = 0,
  'ALTER TABLE catalog_items ADD COLUMN meta_title VARCHAR(255) NULL AFTER description',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'catalog_items' AND COLUMN_NAME = 'meta_description'
);
SET @sql := IF(@exists = 0,
  'ALTER TABLE catalog_items ADD COLUMN meta_description VARCHAR(320) NULL AFTER meta_title',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'catalog_items' AND COLUMN_NAME = 'og_image_url'
);
SET @sql := IF(@exists = 0,
  'ALTER TABLE catalog_items ADD COLUMN og_image_url VARCHAR(500) NULL AFTER meta_description',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'catalog_items' AND COLUMN_NAME = 'seo_noindex'
);
SET @sql := IF(@exists = 0,
  'ALTER TABLE catalog_items ADD COLUMN seo_noindex TINYINT(1) NOT NULL DEFAULT 0 AFTER og_image_url',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
