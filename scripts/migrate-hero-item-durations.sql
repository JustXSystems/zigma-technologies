-- Per-spotlight-item hero duration overrides (item id → ms JSON map).
-- Safe to re-run: skips when column already exists.
SET @db := DATABASE();

SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'catalog_page_settings' AND COLUMN_NAME = 'hero_item_durations_json'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE catalog_page_settings ADD COLUMN hero_item_durations_json JSON NULL AFTER hero_item_ids_json',
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
