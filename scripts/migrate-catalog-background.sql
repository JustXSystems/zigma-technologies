-- Upgrade existing DBs: per-item gallery background + presentation controls.
-- Uses DATABASE() from the connection — do not hardcode a schema name.
-- Idempotent.

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

SET @shade_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'catalog_items' AND COLUMN_NAME = 'background_shading_style'
);
SET @sql := IF(@shade_exists = 0,
  'ALTER TABLE catalog_items ADD COLUMN background_shading_style VARCHAR(20) NOT NULL DEFAULT ''medium'' AFTER background_image_url',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @bg_fit_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'catalog_items' AND COLUMN_NAME = 'background_fit_to_space'
);
SET @sql := IF(@bg_fit_exists = 0,
  'ALTER TABLE catalog_items ADD COLUMN background_fit_to_space TINYINT(1) NOT NULL DEFAULT 0 AFTER background_shading_style',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @bg_pct_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'catalog_items' AND COLUMN_NAME = 'background_fit_percent'
);
SET @sql := IF(@bg_pct_exists = 0,
  'ALTER TABLE catalog_items ADD COLUMN background_fit_percent TINYINT UNSIGNED NOT NULL DEFAULT 100 AFTER background_fit_to_space',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @fit_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'catalog_items' AND COLUMN_NAME = 'media_fit_to_space'
);
SET @sql := IF(@fit_exists = 0,
  'ALTER TABLE catalog_items ADD COLUMN media_fit_to_space TINYINT(1) NOT NULL DEFAULT 1 AFTER background_fit_percent',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @pct_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'catalog_items' AND COLUMN_NAME = 'media_fit_percent'
);
SET @sql := IF(@pct_exists = 0,
  'ALTER TABLE catalog_items ADD COLUMN media_fit_percent TINYINT UNSIGNED NOT NULL DEFAULT 78 AFTER media_fit_to_space',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Per attached catalog media asset: fit + shadow
SET @media_fit_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'catalog_media' AND COLUMN_NAME = 'fit_to_space'
);
SET @sql := IF(@media_fit_exists = 0,
  'ALTER TABLE catalog_media ADD COLUMN fit_to_space TINYINT(1) NOT NULL DEFAULT 1 AFTER is_primary',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @media_pct_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'catalog_media' AND COLUMN_NAME = 'fit_percent'
);
SET @sql := IF(@media_pct_exists = 0,
  'ALTER TABLE catalog_media ADD COLUMN fit_percent TINYINT UNSIGNED NOT NULL DEFAULT 78 AFTER fit_to_space',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @media_shadow_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'catalog_media' AND COLUMN_NAME = 'shadow_style'
);
SET @sql := IF(@media_shadow_exists = 0,
  'ALTER TABLE catalog_media ADD COLUMN shadow_style VARCHAR(20) NOT NULL DEFAULT ''medium'' AFTER fit_percent',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
