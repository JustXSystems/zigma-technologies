-- Testimonials / reviews module. Safe to re-run.

CREATE TABLE IF NOT EXISTS site_testimonials (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  quote TEXT NOT NULL,
  author_name VARCHAR(160) NOT NULL,
  author_role VARCHAR(160) NULL,
  company VARCHAR(160) NULL,
  rating TINYINT UNSIGNED NULL,
  locale VARCHAR(8) NOT NULL DEFAULT 'en',
  status ENUM('draft','published') NOT NULL DEFAULT 'draft',
  featured TINYINT(1) NOT NULL DEFAULT 0,
  sort_order INT NOT NULL DEFAULT 0,
  enabled TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_testimonial_pub (status, enabled, featured, sort_order)
) ENGINE=InnoDB;
