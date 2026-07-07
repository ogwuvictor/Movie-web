-- CineHub Movie Streaming Platform Database
-- MySQL/MariaDB Schema with Analytics and Optimization

CREATE DATABASE IF NOT EXISTS cinehub_db;
USE cinehub_db;

-- ============================================
-- PUBLIC DOMAIN MOVIES
-- ============================================
CREATE TABLE IF NOT EXISTS public_domain_movies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tmdb_id INT NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    download_url TEXT NOT NULL,
    source VARCHAR(100) DEFAULT 'Unknown',
    year INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_tmdb_id (tmdb_id),
    INDEX idx_year (year)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- ADMIN USERS
-- ============================================
CREATE TABLE IF NOT EXISTS admin_users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- ANALYTICS: PAGE VIEWS
-- ============================================
CREATE TABLE IF NOT EXISTS analytics_page_views (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_id VARCHAR(100),
    page_type ENUM('home', 'movie', 'tv', 'search', 'trailer') NOT NULL,
    content_id INT,
    content_type ENUM('movie', 'tv') DEFAULT NULL,
    referrer VARCHAR(255),
    user_agent VARCHAR(255),
    ip_address VARCHAR(45),
    country_code VARCHAR(2),
    city VARCHAR(100),
    device_type ENUM('desktop', 'mobile', 'tablet', 'other'),
    browser VARCHAR(50),
    os VARCHAR(50),
    screen_resolution VARCHAR(20),
    time_on_page INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_session (session_id),
    INDEX idx_page_type (page_type),
    INDEX idx_content_id (content_id),
    INDEX idx_created_at (created_at),
    INDEX idx_country (country_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- ANALYTICS: VIDEO PLAYBACK METRICS
-- ============================================
CREATE TABLE IF NOT EXISTS analytics_playback (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_id VARCHAR(100),
    content_id INT NOT NULL,
    content_type ENUM('movie', 'tv') NOT NULL,
    content_title VARCHAR(255),
    playback_duration INT DEFAULT 0,
    buffer_count INT DEFAULT 0,
    buffer_duration INT DEFAULT 0,
    playback_errors INT DEFAULT 0,
    error_types JSON,
    quality_played VARCHAR(20),
    video_start_time TIMESTAMP,
    video_end_time TIMESTAMP,
    completion_percentage DECIMAL(5,2) DEFAULT 0,
    user_agent VARCHAR(255),
    ip_address VARCHAR(45),
    device_type ENUM('desktop', 'mobile', 'tablet', 'other'),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_session (session_id),
    INDEX idx_content_id (content_id),
    INDEX idx_content_type (content_type),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- ANALYTICS: PROVIDER CLICKS
-- ============================================
CREATE TABLE IF NOT EXISTS analytics_provider_clicks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_id VARCHAR(100),
    content_id INT NOT NULL,
    content_type ENUM('movie', 'tv') NOT NULL,
    content_title VARCHAR(255),
    provider VARCHAR(50) NOT NULL,
    provider_url TEXT,
    user_agent VARCHAR(255),
    ip_address VARCHAR(45),
    country_code VARCHAR(2),
    referrer VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_session (session_id),
    INDEX idx_content_id (content_id),
    INDEX idx_provider (provider),
    INDEX idx_created_at (created_at),
    INDEX idx_country (country_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- ANALYTICS: SEARCH QUERIES
-- ============================================
CREATE TABLE IF NOT EXISTS analytics_search (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_id VARCHAR(100),
    search_query VARCHAR(255) NOT NULL,
    results_count INT DEFAULT 0,
    clicked_result_id INT,
    clicked_result_type ENUM('movie', 'tv'),
    user_agent VARCHAR(255),
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_session (session_id),
    INDEX idx_search_query (search_query),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- ANALYTICS: USER ENGAGEMENT
-- ============================================
CREATE TABLE IF NOT EXISTS analytics_engagement (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_id VARCHAR(100),
    content_id INT NOT NULL,
    content_type ENUM('movie', 'tv') NOT NULL,
    action_type ENUM('like', 'add_to_list', 'share', 'trailer_play', 'details_view') NOT NULL,
    action_value VARCHAR(255),
    user_agent VARCHAR(255),
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_session (session_id),
    INDEX idx_content_id (content_id),
    INDEX idx_action_type (action_type),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- PERFORMANCE: API RESPONSE TIMES
-- ============================================
CREATE TABLE IF NOT EXISTS performance_api_metrics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL,
    response_time_ms INT NOT NULL,
    status_code INT NOT NULL,
    cache_hit BOOLEAN DEFAULT FALSE,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_endpoint (endpoint),
    INDEX idx_method (method),
    INDEX idx_created_at (created_at),
    INDEX idx_status_code (status_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- PERFORMANCE: SYSTEM METRICS
-- ============================================
CREATE TABLE IF NOT EXISTS performance_system_metrics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    metric_type ENUM('cpu', 'memory', 'disk', 'network') NOT NULL,
    metric_value DECIMAL(10,2) NOT NULL,
    metric_unit VARCHAR(20),
    server_name VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_metric_type (metric_type),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- OPTIMIZATION: A/B TEST RESULTS
-- ============================================
CREATE TABLE IF NOT EXISTS optimization_ab_tests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    test_name VARCHAR(255) NOT NULL,
    variant VARCHAR(50) NOT NULL,
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(10,2) NOT NULL,
    sample_size INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_test_name (test_name),
    INDEX idx_variant (variant),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- OPTIMIZATION: FEATURE FLAGS
-- ============================================
CREATE TABLE IF NOT EXISTS optimization_feature_flags (
    id INT AUTO_INCREMENT PRIMARY KEY,
    feature_name VARCHAR(100) NOT NULL UNIQUE,
    is_enabled BOOLEAN DEFAULT FALSE,
    description TEXT,
    rollout_percentage INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_feature_name (feature_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- OPTIMIZATION: CACHING METRICS
-- ============================================
CREATE TABLE IF NOT EXISTS optimization_cache_metrics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cache_key VARCHAR(255) NOT NULL,
    cache_type ENUM('api', 'image', 'data', 'html') NOT NULL,
    hit_count INT DEFAULT 0,
    miss_count INT DEFAULT 0,
    size_bytes BIGINT,
    ttl_seconds INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_cache_key (cache_key),
    INDEX idx_cache_type (cache_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- ERROR LOGGING
-- ============================================
CREATE TABLE IF NOT EXISTS error_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    error_type VARCHAR(100) NOT NULL,
    error_message TEXT NOT NULL,
    stack_trace TEXT,
    file_path VARCHAR(255),
    line_number INT,
    user_agent VARCHAR(255),
    ip_address VARCHAR(45),
    session_id VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_error_type (error_type),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- INSERT DEFAULT DATA
-- ============================================

-- Insert default admin user (password: admin123 - CHANGE THIS IN PRODUCTION!)
INSERT INTO admin_users (username, password, email) 
VALUES ('admin', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin@cinehub.com');

-- Sample Public Domain Movies (for testing)
INSERT INTO public_domain_movies (tmdb_id, title, download_url, source, year) VALUES
(526, 'Night of the Living Dead', 'https://archive.org/download/night-of-the-living-dawn/night_of_the_living_dead.mp4', 'Internet Archive', 1968),
(435, 'His Girl Friday', 'https://archive.org/download/his-girl-friday/his_girl_friday.mp4', 'Internet Archive', 1940);

-- Default Feature Flags
INSERT INTO optimization_feature_flags (feature_name, is_enabled, description, rollout_percentage) VALUES
('dark_mode', true, 'Enable dark mode theme', 100),
('new_ui_design', false, 'New UI design variant', 0),
('enhanced_search', true, 'Enhanced search with filters', 50),
('lazy_loading', true, 'Lazy load images for performance', 100);
