-- Upgrade existing DBs: catalog Excel import / export.
--   * media_assets keeps the uploader's original file name, a content hash (duplicate detection)
--     and the file size, so spreadsheets can refer to files by the names people know.
--   * catalog_transfer_jobs records each analysed / published import and each export.
-- The app also creates these on first use (src/lib/schema-ensure.ts, src/lib/catalog-transfer.ts);
-- run this when the DB user lacks ALTER / CREATE privilege at runtime.
-- Uses DATABASE() from the connection — do not hardcode a schema name.
-- Idempotent.

SET @db = DATABASE();

SET @exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'media_assets' AND COLUMN_NAME = 'original_name'
);
SET @sql := IF(@exists = 0,
  'ALTER TABLE media_assets ADD COLUMN original_name VARCHAR(255) NULL AFTER path, ADD INDEX idx_media_original_name (original_name)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'media_assets' AND COLUMN_NAME = 'content_hash'
);
SET @sql := IF(@exists = 0,
  'ALTER TABLE media_assets ADD COLUMN content_hash CHAR(64) NULL AFTER mime, ADD INDEX idx_media_content_hash (content_hash)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'media_assets' AND COLUMN_NAME = 'size_bytes'
);
SET @sql := IF(@exists = 0,
  'ALTER TABLE media_assets ADD COLUMN size_bytes INT UNSIGNED NULL AFTER content_hash',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS catalog_transfer_jobs (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  kind VARCHAR(12) NOT NULL DEFAULT 'import',
  actor VARCHAR(255) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'analysed',
  workbook_json LONGTEXT NULL,
  options_json JSON NULL,
  summary_json JSON NULL,
  report_json LONGTEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  committed_at TIMESTAMP NULL,
  INDEX idx_catalog_transfer_created (created_at)
) ENGINE=InnoDB;
