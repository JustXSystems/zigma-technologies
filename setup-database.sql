-- Zigma Technologies — database bootstrap + CMS schema
CREATE DATABASE IF NOT EXISTS zigmatech CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'zigmatech'@'localhost' IDENTIFIED BY 'devpassword';
GRANT ALL PRIVILEGES ON zigmatech.* TO 'zigmatech'@'localhost';
FLUSH PRIVILEGES;

USE zigmatech;

-- Auth
CREATE TABLE IF NOT EXISTS admin_users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(120) NOT NULL,
  role ENUM('admin','editor') NOT NULL DEFAULT 'admin',
  last_login DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- CMS pages
CREATE TABLE IF NOT EXISTS pages (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(120) NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL,
  meta_title VARCHAR(255) NULL,
  meta_description TEXT NULL,
  status ENUM('draft','published') NOT NULL DEFAULT 'draft',
  sort_order INT NOT NULL DEFAULT 0,
  enabled TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS page_sections (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  page_id INT UNSIGNED NOT NULL,
  type VARCHAR(64) NOT NULL,
  section_key VARCHAR(120) NULL,
  title VARCHAR(255) NULL,
  sort_order INT NOT NULL DEFAULT 0,
  enabled TINYINT(1) NOT NULL DEFAULT 1,
  content_json JSON NULL,
  style_json JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_page_sections_page FOREIGN KEY (page_id) REFERENCES pages(id) ON DELETE CASCADE,
  INDEX idx_page_sections_page_sort (page_id, sort_order)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS nav_items (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  location ENUM('header','footer') NOT NULL DEFAULT 'header',
  label VARCHAR(120) NOT NULL,
  href VARCHAR(255) NULL,
  parent_id INT UNSIGNED NULL,
  sort_order INT NOT NULL DEFAULT 0,
  enabled TINYINT(1) NOT NULL DEFAULT 1,
  meta_json JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_nav_location_sort (location, sort_order)
) ENGINE=InnoDB;

-- Inventory / catalog
CREATE TABLE IF NOT EXISTS catalog_categories (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  item_type ENUM('project','product','service') NOT NULL,
  name VARCHAR(120) NOT NULL,
  slug VARCHAR(120) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  enabled TINYINT(1) NOT NULL DEFAULT 1,
  UNIQUE KEY uq_cat_type_slug (item_type, slug)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS catalog_items (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  item_type ENUM('project','product','service') NOT NULL,
  slug VARCHAR(160) NOT NULL,
  title VARCHAR(255) NOT NULL,
  summary TEXT NULL,
  description MEDIUMTEXT NULL,
  category_id INT UNSIGNED NULL,
  tags_json JSON NULL,
  specs_json JSON NULL,
  price_label VARCHAR(120) NULL,
  status ENUM('draft','published') NOT NULL DEFAULT 'draft',
  featured TINYINT(1) NOT NULL DEFAULT 0,
  sort_order INT NOT NULL DEFAULT 0,
  enabled TINYINT(1) NOT NULL DEFAULT 1,
  cta_config_json JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_item_type_slug (item_type, slug),
  INDEX idx_items_type_enabled (item_type, enabled, status),
  CONSTRAINT fk_items_category FOREIGN KEY (category_id) REFERENCES catalog_categories(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS catalog_media (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  item_id INT UNSIGNED NOT NULL,
  kind ENUM('image','video','svg') NOT NULL DEFAULT 'image',
  url VARCHAR(500) NOT NULL,
  alt VARCHAR(255) NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_primary TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_media_item FOREIGN KEY (item_id) REFERENCES catalog_items(id) ON DELETE CASCADE,
  INDEX idx_media_item_sort (item_id, sort_order)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS catalog_page_settings (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  item_type ENUM('project','product','service') NOT NULL UNIQUE,
  layout ENUM('grid','list') NOT NULL DEFAULT 'grid',
  grid_columns TINYINT UNSIGNED NOT NULL DEFAULT 3,
  filters_json JSON NULL,
  search_fields_json JSON NULL,
  card_fields_json JSON NULL,
  modal_fields_json JSON NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Enquiry forms
CREATE TABLE IF NOT EXISTS form_definitions (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  form_key VARCHAR(80) NOT NULL UNIQUE,
  name VARCHAR(160) NOT NULL,
  item_type ENUM('project','product','service','general') NULL,
  enabled TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS form_fields (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  form_id INT UNSIGNED NOT NULL,
  field_name VARCHAR(80) NOT NULL,
  label VARCHAR(160) NOT NULL,
  field_type ENUM('text','email','tel','textarea','select','number','checkbox') NOT NULL DEFAULT 'text',
  required TINYINT(1) NOT NULL DEFAULT 0,
  options_json JSON NULL,
  placeholder VARCHAR(255) NULL,
  sort_order INT NOT NULL DEFAULT 0,
  enabled TINYINT(1) NOT NULL DEFAULT 1,
  validation_json JSON NULL,
  CONSTRAINT fk_fields_form FOREIGN KEY (form_id) REFERENCES form_definitions(id) ON DELETE CASCADE,
  UNIQUE KEY uq_form_field_name (form_id, field_name),
  INDEX idx_fields_form_sort (form_id, sort_order)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS enquiries (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  form_id INT UNSIGNED NULL,
  item_id INT UNSIGNED NULL,
  item_type ENUM('project','product','service','general') NULL,
  payload_json JSON NOT NULL,
  status ENUM('new','in_progress','closed') NOT NULL DEFAULT 'new',
  admin_notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_enq_form FOREIGN KEY (form_id) REFERENCES form_definitions(id) ON DELETE SET NULL,
  CONSTRAINT fk_enq_item FOREIGN KEY (item_id) REFERENCES catalog_items(id) ON DELETE SET NULL,
  INDEX idx_enq_status_created (status, created_at)
) ENGINE=InnoDB;

-- Media library + theme (Phase 3 ready)
CREATE TABLE IF NOT EXISTS media_assets (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  path VARCHAR(500) NOT NULL,
  mime VARCHAR(120) NULL,
  width INT NULL,
  height INT NULL,
  alt VARCHAR(255) NULL,
  tags_json JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS theme_settings (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  setting_key VARCHAR(80) NOT NULL UNIQUE,
  value_json JSON NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS css_overrides (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  version INT NOT NULL,
  css_text MEDIUMTEXT NOT NULL,
  status ENUM('draft','published','archived') NOT NULL DEFAULT 'draft',
  notes VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  published_at DATETIME NULL,
  INDEX idx_css_status_version (status, version)
) ENGINE=InnoDB;

-- Default page settings
INSERT INTO catalog_page_settings (item_type, layout, grid_columns, filters_json, search_fields_json, card_fields_json, modal_fields_json)
VALUES
  ('project', 'grid', 3,
   JSON_ARRAY('category','tags'),
   JSON_ARRAY('title','summary','tags'),
   JSON_ARRAY('title','summary','category','primary_image'),
   JSON_ARRAY('title','description','specs','media','enquiry')),
  ('product', 'grid', 3,
   JSON_ARRAY('category','tags'),
   JSON_ARRAY('title','summary','tags'),
   JSON_ARRAY('title','summary','price_label','primary_image'),
   JSON_ARRAY('title','description','specs','media','enquiry')),
  ('service', 'grid', 3,
   JSON_ARRAY('category','tags'),
   JSON_ARRAY('title','summary','tags'),
   JSON_ARRAY('title','summary','category','primary_image'),
   JSON_ARRAY('title','description','specs','media','enquiry'))
ON DUPLICATE KEY UPDATE layout = VALUES(layout);

-- Default enquiry form
INSERT INTO form_definitions (form_key, name, item_type, enabled)
VALUES ('enquiry_default', 'Default Enquiry Form', 'general', 1)
ON DUPLICATE KEY UPDATE name = VALUES(name);

SET @form_id = (SELECT id FROM form_definitions WHERE form_key = 'enquiry_default' LIMIT 1);

INSERT INTO form_fields (form_id, field_name, label, field_type, required, placeholder, sort_order, enabled)
SELECT @form_id, 'name', 'Full Name', 'text', 1, 'Your name', 1, 1 FROM DUAL
WHERE @form_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM form_fields WHERE form_id = @form_id AND field_name = 'name');

INSERT INTO form_fields (form_id, field_name, label, field_type, required, placeholder, sort_order, enabled)
SELECT @form_id, 'email', 'Email', 'email', 1, 'you@company.com', 2, 1 FROM DUAL
WHERE @form_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM form_fields WHERE form_id = @form_id AND field_name = 'email');

INSERT INTO form_fields (form_id, field_name, label, field_type, required, placeholder, sort_order, enabled)
SELECT @form_id, 'phone', 'Phone', 'tel', 1, '+91 ...', 3, 1 FROM DUAL
WHERE @form_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM form_fields WHERE form_id = @form_id AND field_name = 'phone');

INSERT INTO form_fields (form_id, field_name, label, field_type, required, options_json, placeholder, sort_order, enabled)
SELECT @form_id, 'subject', 'I''m Getting in Touch About', 'select', 1,
  JSON_ARRAY(
    'Solar Solution',
    'UPS Solution',
    'BESS- Battery System',
    'Site Visit Request',
    'AMC & Service Request',
    'Request a Quote',
    'EV Charging Solution',
    'Emergency Service Support',
    'General Enquiry',
    'Careers'
  ),
  'Select a topic', 4, 1 FROM DUAL
WHERE @form_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM form_fields WHERE form_id = @form_id AND field_name = 'subject');

INSERT INTO form_fields (form_id, field_name, label, field_type, required, placeholder, sort_order, enabled)
SELECT @form_id, 'company', 'Company', 'text', 0, 'Company name', 5, 1 FROM DUAL
WHERE @form_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM form_fields WHERE form_id = @form_id AND field_name = 'company');

INSERT INTO form_fields (form_id, field_name, label, field_type, required, placeholder, sort_order, enabled)
SELECT @form_id, 'message', 'Message', 'textarea', 0, 'Tell us about your requirement', 6, 1 FROM DUAL
WHERE @form_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM form_fields WHERE form_id = @form_id AND field_name = 'message');

-- Sample categories
INSERT INTO catalog_categories (item_type, name, slug, sort_order, enabled) VALUES
  ('project', 'Solar EPC', 'solar-epc', 1, 1),
  ('project', 'UPS & Battery', 'ups-battery', 2, 1),
  ('project', 'Hybrid Power', 'hybrid-power', 3, 1),
  ('product', 'UPS Systems', 'ups-systems', 1, 1),
  ('product', 'Studer Hybrid', 'studer-hybrid', 2, 1),
  ('product', 'Solar Solutions', 'solar-solutions', 3, 1),
  ('product', 'Inverters', 'inverters', 4, 1),
  ('product', 'Batteries', 'batteries', 5, 1),
  ('product', 'Stabilizers', 'stabilizers', 6, 1),
  ('product', 'BMS', 'bms', 7, 1),
  ('product', 'BESS', 'bess', 8, 1),
  ('product', 'EV Charging', 'ev-charging', 9, 1),
  ('service', 'Field Services', 'field-services', 1, 1),
  ('service', 'UPS AMC', 'ups-amc', 2, 1),
  ('service', 'UPS Repair', 'ups-repair', 3, 1),
  ('service', 'UPS Rental', 'ups-rental', 4, 1),
  ('service', 'Solar O&M', 'solar-om', 5, 1),
  ('service', 'Design & Engineering', 'engineering-design', 6, 1)
ON DUPLICATE KEY UPDATE name = VALUES(name), sort_order = VALUES(sort_order), enabled = VALUES(enabled);

-- Homepage stub for Phase 2
INSERT INTO pages (slug, title, meta_title, meta_description, status, sort_order, enabled)
VALUES ('home', 'Home', 'Zigma Technologies', 'Solar, UPS, BESS & EV Charging Infrastructure in India', 'published', 0, 1)
ON DUPLICATE KEY UPDATE title = VALUES(title);


-- Resource posts (blog/guides)

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



-- Testimonials

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

