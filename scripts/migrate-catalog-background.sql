-- Upgrade existing DBs: per-item gallery background image for catalog popups
USE zigmatech;

SET @db = DATABASE();

SET @bg_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'catalog_items' AND COLUMN_NAME = 'background_image_url'
);
SET @sql := IF(@bg_exists = 0,
  'ALTER TABLE catalog_items ADD COLUMN background_image_url VARCHAR(500) NULL AFTER lead_time_label',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
