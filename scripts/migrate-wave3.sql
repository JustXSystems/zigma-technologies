-- Wave 3: partner portal, press, catalog availability. Safe to re-run.
USE zigmatech;

CREATE TABLE IF NOT EXISTS partner_users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(190) NOT NULL,
  name VARCHAR(160) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  company VARCHAR(190) NULL,
  enabled TINYINT(1) NOT NULL DEFAULT 1,
  last_login DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_partner_email (email)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS partner_documents (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  file_url VARCHAR(500) NOT NULL,
  doc_type VARCHAR(80) NOT NULL DEFAULT 'price_list',
  sort_order INT NOT NULL DEFAULT 0,
  enabled TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_partner_docs (enabled, sort_order)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS press_posts (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(160) NOT NULL,
  title VARCHAR(255) NOT NULL,
  excerpt TEXT NULL,
  body_html MEDIUMTEXT NULL,
  cover_url VARCHAR(500) NULL,
  source_name VARCHAR(160) NULL,
  source_url VARCHAR(500) NULL,
  published_at DATETIME NULL,
  status ENUM('draft','published') NOT NULL DEFAULT 'draft',
  enabled TINYINT(1) NOT NULL DEFAULT 1,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_press_slug (slug),
  INDEX idx_press_pub (status, enabled, published_at)
) ENGINE=InnoDB;

SET @db = DATABASE();

SET @avail_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'catalog_items' AND COLUMN_NAME = 'availability_label'
);
SET @sql := IF(@avail_exists = 0,
  'ALTER TABLE catalog_items ADD COLUMN availability_label VARCHAR(120) NULL AFTER price_label',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @lead_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'catalog_items' AND COLUMN_NAME = 'lead_time_label'
);
SET @sql := IF(@lead_exists = 0,
  'ALTER TABLE catalog_items ADD COLUMN lead_time_label VARCHAR(120) NULL AFTER availability_label',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
