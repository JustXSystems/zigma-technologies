-- Role-based admin screen access (run against zigmatech DB)
USE zigmatech;

CREATE TABLE IF NOT EXISTS admin_roles (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  slug VARCHAR(80) NOT NULL UNIQUE,
  description VARCHAR(255) NULL,
  screens JSON NOT NULL,
  is_system TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Add role_id to admin_users if missing (safe to re-run)
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'admin_users' AND COLUMN_NAME = 'role_id'
);
SET @sql := IF(
  @col_exists = 0,
  'ALTER TABLE admin_users ADD COLUMN role_id INT UNSIGNED NULL AFTER role',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK (ignore if already present)
SET @fk_exists := (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'admin_users' AND CONSTRAINT_NAME = 'fk_admin_users_role'
);
SET @sql := IF(
  @fk_exists = 0,
  'ALTER TABLE admin_users ADD CONSTRAINT fk_admin_users_role FOREIGN KEY (role_id) REFERENCES admin_roles(id) ON DELETE SET NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
