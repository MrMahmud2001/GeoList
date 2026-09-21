CREATE DATABASE IF NOT EXISTS gis_roads CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE gis_roads;

CREATE TABLE IF NOT EXISTS users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  login         VARCHAR(80)  NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name     VARCHAR(150) NOT NULL,
  role          ENUM('admin','user','customer') NOT NULL DEFAULT 'user',
  approved      TINYINT(1) NOT NULL DEFAULT 0,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS map_uploads (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  filename       VARCHAR(255) NOT NULL,
  uploaded_by    INT NOT NULL,
  features_count INT NOT NULL DEFAULT 0,
  kml_data       LONGTEXT NOT NULL,
  uploaded_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS comments (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  object_name VARCHAR(255) NOT NULL,
  type        ENUM('issue','request','info','other') NOT NULL,
  text        TEXT NOT NULL,
  status      ENUM('active','pending','approved') NOT NULL DEFAULT 'active',
  author_id   INT NOT NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT IGNORE INTO users (login, password_hash, full_name, role, approved)
VALUES ('admin','$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lHHy','Администратор системы','admin',1);
