-- Catalog listing card size: auto (content) vs custom (fixed width + height)
SET @db := DATABASE();

SET @exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'catalog_page_settings' AND COLUMN_NAME = 'card_size_mode'
);
SET @sql := IF(
  @exists = 0,
  'ALTER TABLE catalog_page_settings ADD COLUMN card_size_mode VARCHAR(16) NOT NULL DEFAULT ''auto'' AFTER card_media_inset',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'catalog_page_settings' AND COLUMN_NAME = 'card_fixed_height_px'
);
SET @sql := IF(
  @exists = 0,
  'ALTER TABLE catalog_page_settings ADD COLUMN card_fixed_height_px SMALLINT UNSIGNED NOT NULL DEFAULT 420 AFTER card_size_mode',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'catalog_page_settings' AND COLUMN_NAME = 'card_fixed_width_px'
);
SET @sql := IF(
  @exists = 0,
  'ALTER TABLE catalog_page_settings ADD COLUMN card_fixed_width_px SMALLINT UNSIGNED NOT NULL DEFAULT 320 AFTER card_fixed_height_px',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'catalog_page_settings' AND COLUMN_NAME = 'listing_align'
);
SET @sql := IF(
  @exists = 0,
  'ALTER TABLE catalog_page_settings ADD COLUMN listing_align VARCHAR(16) NOT NULL DEFAULT ''left'' AFTER card_fixed_width_px',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

UPDATE catalog_page_settings;
