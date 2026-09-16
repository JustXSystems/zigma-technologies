-- Upgrade existing DBs: catalog discovery UX + standard hero panel toggle
USE zigmatech;

SET @db = DATABASE();

SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'catalog_page_settings' AND COLUMN_NAME = 'hero_standard_panel_enabled'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE catalog_page_settings ADD COLUMN hero_standard_panel_enabled TINYINT(1) NOT NULL DEFAULT 1 AFTER hero_variant',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'catalog_page_settings' AND COLUMN_NAME = 'hero_meta_enabled'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE catalog_page_settings ADD COLUMN hero_meta_enabled TINYINT(1) NOT NULL DEFAULT 1 AFTER hero_standard_panel_enabled',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'catalog_page_settings' AND COLUMN_NAME = 'hero_elements_json'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE catalog_page_settings ADD COLUMN hero_elements_json JSON NULL AFTER hero_meta_enabled',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'catalog_page_settings' AND COLUMN_NAME = 'toolbar_elements_json'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE catalog_page_settings ADD COLUMN toolbar_elements_json JSON NULL AFTER hero_elements_json',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'catalog_page_settings' AND COLUMN_NAME = 'discovery_profile_rail_enabled'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE catalog_page_settings ADD COLUMN discovery_profile_rail_enabled TINYINT(1) NOT NULL DEFAULT 1 AFTER premium_borders_enabled',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'catalog_page_settings' AND COLUMN_NAME = 'discovery_quick_find_enabled'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE catalog_page_settings ADD COLUMN discovery_quick_find_enabled TINYINT(1) NOT NULL DEFAULT 1 AFTER discovery_profile_rail_enabled',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'catalog_page_settings' AND COLUMN_NAME = 'discovery_facet_rail_enabled'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE catalog_page_settings ADD COLUMN discovery_facet_rail_enabled TINYINT(1) NOT NULL DEFAULT 1 AFTER discovery_quick_find_enabled',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'catalog_page_settings' AND COLUMN_NAME = 'discovery_grouped_results_enabled'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE catalog_page_settings ADD COLUMN discovery_grouped_results_enabled TINYINT(1) NOT NULL DEFAULT 1 AFTER discovery_facet_rail_enabled',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'catalog_page_settings' AND COLUMN_NAME = 'discovery_sticky_toolbar_enabled'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE catalog_page_settings ADD COLUMN discovery_sticky_toolbar_enabled TINYINT(1) NOT NULL DEFAULT 1 AFTER discovery_grouped_results_enabled',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'catalog_page_settings' AND COLUMN_NAME = 'discovery_group_preview_count'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE catalog_page_settings ADD COLUMN discovery_group_preview_count TINYINT UNSIGNED NOT NULL DEFAULT 4 AFTER discovery_sticky_toolbar_enabled',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'catalog_page_settings' AND COLUMN_NAME = 'card_style'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE catalog_page_settings ADD COLUMN card_style VARCHAR(20) NOT NULL DEFAULT ''marketplace'' AFTER visual_style',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'catalog_page_settings' AND COLUMN_NAME = 'card_body_bg_color'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE catalog_page_settings ADD COLUMN card_body_bg_color VARCHAR(32) NULL DEFAULT ''#ffffff'' AFTER card_style',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
