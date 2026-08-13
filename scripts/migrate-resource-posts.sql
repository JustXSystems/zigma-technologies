-- Resources / blog posts module. Safe to re-run.

CREATE TABLE IF NOT EXISTS resource_posts (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(160) NOT NULL,
  title VARCHAR(255) NOT NULL,
  excerpt TEXT NULL,
  body_html MEDIUMTEXT NULL,
  cover_url VARCHAR(500) NULL,
  tags_json JSON NULL,
  status ENUM('draft','published') NOT NULL DEFAULT 'draft',
  meta_title VARCHAR(255) NULL,
  meta_description VARCHAR(500) NULL,
  published_at DATETIME NULL,
  enabled TINYINT(1) NOT NULL DEFAULT 1,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_resource_slug (slug),
  INDEX idx_resource_pub (status, enabled, published_at)
) ENGINE=InnoDB;
