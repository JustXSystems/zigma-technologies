-- Upgrade existing DBs: catalog case study content
USE zigmatech;

SET @db = DATABASE();

SET @case_study_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'catalog_items' AND COLUMN_NAME = 'case_study_json'
);
SET @sql := IF(@case_study_exists = 0,
  'ALTER TABLE catalog_items ADD COLUMN case_study_json JSON NULL AFTER cta_config_json',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
