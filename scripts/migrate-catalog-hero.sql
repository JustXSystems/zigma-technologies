-- Upgrade existing DBs: catalog hero settings
USE zigmatech;

-- MySQL versions here may not support "ADD COLUMN IF NOT EXISTS", so we
-- conditionally apply schema changes using information_schema + prepared SQL.

SET @db = DATABASE();

SET @hero_enabled_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'catalog_page_settings' AND COLUMN_NAME = 'hero_enabled'
);
SET @sql := IF(@hero_enabled_exists = 0,
  'ALTER TABLE catalog_page_settings ADD COLUMN hero_enabled TINYINT(1) NOT NULL DEFAULT 1 AFTER modal_fields_json',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @hero_autoplay_ms_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'catalog_page_settings' AND COLUMN_NAME = 'hero_autoplay_ms'
);
SET @sql := IF(@hero_autoplay_ms_exists = 0,
  'ALTER TABLE catalog_page_settings ADD COLUMN hero_autoplay_ms INT UNSIGNED NOT NULL DEFAULT 6000 AFTER hero_enabled',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @hero_item_ids_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'catalog_page_settings' AND COLUMN_NAME = 'hero_item_ids_json'
);
SET @sql := IF(@hero_item_ids_exists = 0,
  'ALTER TABLE catalog_page_settings ADD COLUMN hero_item_ids_json JSON NULL AFTER hero_autoplay_ms',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @hero_eyebrow_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'catalog_page_settings' AND COLUMN_NAME = 'hero_eyebrow'
);
SET @sql := IF(@hero_eyebrow_exists = 0,
  'ALTER TABLE catalog_page_settings ADD COLUMN hero_eyebrow VARCHAR(160) NULL AFTER hero_item_ids_json',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @hero_title_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'catalog_page_settings' AND COLUMN_NAME = 'hero_title'
);
SET @sql := IF(@hero_title_exists = 0,
  'ALTER TABLE catalog_page_settings ADD COLUMN hero_title VARCHAR(255) NULL AFTER hero_eyebrow',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @hero_lead_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'catalog_page_settings' AND COLUMN_NAME = 'hero_lead'
);
SET @sql := IF(@hero_lead_exists = 0,
  'ALTER TABLE catalog_page_settings ADD COLUMN hero_lead TEXT NULL AFTER hero_title',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE catalog_page_settings
SET
  hero_enabled = 1,
  hero_autoplay_ms = 6000,
  hero_eyebrow = CASE item_type
    WHEN 'project' THEN 'Selected Projects'
    WHEN 'product' THEN 'Product Spotlight'
    ELSE 'Service Spotlight'
  END,
  hero_title = CASE item_type
    WHEN 'project' THEN 'Projects engineered for performance and long-term reliability.'
    WHEN 'product' THEN 'Configured power and automation products for critical infrastructure.'
    ELSE 'End-to-end services for uptime, efficiency, and expansion.'
  END,
  hero_lead = CASE item_type
    WHEN 'project' THEN 'Browse selected delivery highlights, then dive into the full portfolio below.'
    WHEN 'product' THEN 'Highlight priority products in the hero while keeping the rest of the catalog fully searchable.'
    ELSE 'Feature selected service capabilities in a rotating hero to guide visitors before they browse.'
  END
WHERE hero_title IS NULL;
