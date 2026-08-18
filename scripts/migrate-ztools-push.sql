-- ZTools mobile push notification tokens
USE zigmatech;

CREATE TABLE IF NOT EXISTS ztools_push_tokens (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  expo_push_token VARCHAR(255) NOT NULL,
  platform VARCHAR(20) NOT NULL DEFAULT 'android',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_ztools_push_token (expo_push_token),
  KEY idx_ztools_push_user (user_id),
  CONSTRAINT fk_ztools_push_user FOREIGN KEY (user_id) REFERENCES ztools_users(id) ON DELETE CASCADE
) ENGINE=InnoDB;
