-- Upgrade existing DBs: catalog appearance presets + curated toggles
USE zigmatech;

SET @db = DATABASE();

SET @visual_style_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'catalog_page_settings' AND COLUMN_NAME = 'visual_style'
);
SET @sql := IF(@visual_style_exists = 0,
  "ALTER TABLE catalog_page_settings ADD COLUMN visual_style ENUM('classic','premium','glass','minimal','bold-corporate') NOT NULL DEFAULT 'premium' AFTER hero_lead",
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @hero_variant_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'catalog_page_settings' AND COLUMN_NAME = 'hero_variant'
);
SET @sql := IF(@hero_variant_exists = 0,
  "ALTER TABLE catalog_page_settings ADD COLUMN hero_variant ENUM('standard','spotlight') NOT NULL DEFAULT 'spotlight' AFTER visual_style",
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @loading_skeleton_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'catalog_page_settings' AND COLUMN_NAME = 'loading_skeleton_enabled'
);
SET @sql := IF(@loading_skeleton_exists = 0,
  'ALTER TABLE catalog_page_settings ADD COLUMN loading_skeleton_enabled TINYINT(1) NOT NULL DEFAULT 1 AFTER hero_variant',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @reveal_animation_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'catalog_page_settings' AND COLUMN_NAME = 'reveal_animation_enabled'
);
SET @sql := IF(@reveal_animation_exists = 0,
  'ALTER TABLE catalog_page_settings ADD COLUMN reveal_animation_enabled TINYINT(1) NOT NULL DEFAULT 1 AFTER loading_skeleton_enabled',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @premium_borders_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'catalog_page_settings' AND COLUMN_NAME = 'premium_borders_enabled'
);
SET @sql := IF(@premium_borders_exists = 0,
  'ALTER TABLE catalog_page_settings ADD COLUMN premium_borders_enabled TINYINT(1) NOT NULL DEFAULT 1 AFTER reveal_animation_enabled',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE catalog_page_settings
SET
  visual_style = COALESCE(NULLIF(visual_style, ''), 'premium'),
  hero_variant = COALESCE(NULLIF(hero_variant, ''), 'spotlight'),
  loading_skeleton_enabled = 1,
  reveal_animation_enabled = 1,
  premium_borders_enabled = 1;
