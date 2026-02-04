-- Call Monitor App - MySQL Database Schema

-- Create database
CREATE DATABASE IF NOT EXISTS call_monitor;
USE call_monitor;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Devices table
CREATE TABLE IF NOT EXISTS devices (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id VARCHAR(36) NOT NULL,
    device_name VARCHAR(255) NOT NULL,
    device_model VARCHAR(255),
    platform ENUM('android', 'ios', 'web') NOT NULL,
    os_version VARCHAR(50),
    app_version VARCHAR(50),
    last_sync TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_devices_user_id (user_id),
    INDEX idx_devices_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Call logs table
CREATE TABLE IF NOT EXISTS call_logs (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id VARCHAR(36) NOT NULL,
    device_id VARCHAR(36) NOT NULL,
    phone_number VARCHAR(50) NOT NULL,
    contact_name VARCHAR(255),
    call_type ENUM('incoming', 'outgoing', 'missed') NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    duration INT DEFAULT 0,
    has_recording BOOLEAN DEFAULT FALSE,
    recording_url TEXT,
    device_platform ENUM('android', 'ios') NOT NULL,
    is_synced BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE,
    INDEX idx_call_logs_user_id (user_id),
    INDEX idx_call_logs_timestamp (timestamp),
    INDEX idx_call_logs_phone (phone_number),
    INDEX idx_call_logs_type (call_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Recordings table
CREATE TABLE IF NOT EXISTS recordings (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    call_log_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT,
    duration INT,
    format VARCHAR(20) DEFAULT 'mp3',
    encryption_key TEXT,
    is_encrypted BOOLEAN DEFAULT TRUE,
    is_uploaded BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (call_log_id) REFERENCES call_logs(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_recordings_call_log (call_log_id),
    INDEX idx_recordings_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert test user (password: test123)
INSERT INTO users (id, email, password_hash, full_name) 
VALUES (
    'test-user-id',
    'test@callmonitor.com',
    '$2a$10$YourHashedPasswordHere',
    'Test User'
) ON DUPLICATE KEY UPDATE email=email;

-- Insert test device
INSERT INTO devices (id, user_id, device_name, platform, is_active)
VALUES (
    'test-device-id',
    'test-user-id',
    'Test Android Device',
    'android',
    TRUE
) ON DUPLICATE KEY UPDATE device_name=device_name;

-- Insert sample call logs
INSERT INTO call_logs (id, user_id, device_id, phone_number, contact_name, call_type, timestamp, duration, has_recording, device_platform, is_synced)
VALUES 
    ('1', 'test-user-id', 'test-device-id', '+15551234567', 'John Doe', 'incoming', DATE_SUB(NOW(), INTERVAL 1 HOUR), 245, TRUE, 'android', TRUE),
    ('2', 'test-user-id', 'test-device-id', '+15559876543', 'Jane Smith', 'outgoing', DATE_SUB(NOW(), INTERVAL 2 HOUR), 180, FALSE, 'android', TRUE),
    ('3', 'test-user-id', 'test-device-id', '+15555550123', 'Sarah Wilson', 'missed', DATE_SUB(NOW(), INTERVAL 1 DAY), 0, FALSE, 'android', TRUE),
    ('4', 'test-user-id', 'test-device-id', '+15552345678', 'Mike Johnson', 'incoming', DATE_SUB(NOW(), INTERVAL 2 DAY), 420, TRUE, 'android', TRUE)
ON DUPLICATE KEY UPDATE phone_number=phone_number;
