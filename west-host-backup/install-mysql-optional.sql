-- Optional MySQL schema for future structured backups.
-- The current PHP API uses JSON files by default and does not require this.

CREATE TABLE IF NOT EXISTS yicalc_backups (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  device_id VARCHAR(64) NOT NULL DEFAULT 'local',
  payload MEDIUMTEXT NOT NULL,
  saved_at DATETIME NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_device_saved (device_id, saved_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

