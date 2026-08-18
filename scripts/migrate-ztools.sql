-- ZTools portal tables (run against zigmatech DB)
USE zigmatech;

CREATE TABLE IF NOT EXISTS ztools_tools (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(80) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL,
  description TEXT NULL,
  icon VARCHAR(40) NULL,
  route_path VARCHAR(255) NOT NULL,
  enabled TINYINT(1) NOT NULL DEFAULT 1,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS ztools_users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(120) NOT NULL,
  company VARCHAR(160) NULL,
  phone VARCHAR(40) NULL,
  status ENUM('pending_approval','approved','rejected','disabled') NOT NULL DEFAULT 'pending_approval',
  source ENUM('registration','admin') NOT NULL DEFAULT 'registration',
  requested_tool_ids JSON NULL,
  approved_tool_ids JSON NULL,
  admin_notes TEXT NULL,
  approved_by INT UNSIGNED NULL,
  approved_at DATETIME NULL,
  last_login DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;
