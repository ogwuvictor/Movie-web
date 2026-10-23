-- Cloudflare D1 / SQLite. No default accounts, passwords or sample movie claims.
CREATE TABLE IF NOT EXISTS public_domain_movies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tmdb_id INTEGER NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    download_url TEXT NOT NULL,
    source VARCHAR(100) DEFAULT 'Unknown',
    year INTEGER,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP

);
CREATE INDEX IF NOT EXISTS public_domain_movies_idx_tmdb_id ON public_domain_movies (tmdb_id);
CREATE INDEX IF NOT EXISTS public_domain_movies_idx_year ON public_domain_movies (year);
CREATE TABLE IF NOT EXISTS analytics_page_views (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id VARCHAR(100),
    page_type TEXT NOT NULL,
    content_id INTEGER,
    content_type TEXT DEFAULT NULL,
    referrer VARCHAR(255),
    user_agent VARCHAR(255),
    ip_address VARCHAR(45),
    country_code VARCHAR(2),
    city VARCHAR(100),
    device_type TEXT,
    browser VARCHAR(50),
    os VARCHAR(50),
    screen_resolution VARCHAR(20),
    time_on_page INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP

);
CREATE INDEX IF NOT EXISTS analytics_page_views_idx_session ON analytics_page_views (session_id);
CREATE INDEX IF NOT EXISTS analytics_page_views_idx_page_type ON analytics_page_views (page_type);
CREATE INDEX IF NOT EXISTS analytics_page_views_idx_content_id ON analytics_page_views (content_id);
CREATE INDEX IF NOT EXISTS analytics_page_views_idx_created_at ON analytics_page_views (created_at);
CREATE INDEX IF NOT EXISTS analytics_page_views_idx_country ON analytics_page_views (country_code);
CREATE TABLE IF NOT EXISTS analytics_playback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id VARCHAR(100),
    content_id INTEGER NOT NULL,
    content_type TEXT NOT NULL,
    content_title VARCHAR(255),
    playback_duration INTEGER DEFAULT 0,
    buffer_count INTEGER DEFAULT 0,
    buffer_duration INTEGER DEFAULT 0,
    playback_errors INTEGER DEFAULT 0,
    error_types TEXT,
    quality_played VARCHAR(20),
    video_start_time TEXT,
    video_end_time TEXT,
    completion_percentage REAL DEFAULT 0,
    user_agent VARCHAR(255),
    ip_address VARCHAR(45),
    device_type TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP

);
CREATE INDEX IF NOT EXISTS analytics_playback_idx_session ON analytics_playback (session_id);
CREATE INDEX IF NOT EXISTS analytics_playback_idx_content_id ON analytics_playback (content_id);
CREATE INDEX IF NOT EXISTS analytics_playback_idx_content_type ON analytics_playback (content_type);
CREATE INDEX IF NOT EXISTS analytics_playback_idx_created_at ON analytics_playback (created_at);
CREATE TABLE IF NOT EXISTS analytics_provider_clicks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id VARCHAR(100),
    content_id INTEGER NOT NULL,
    content_type TEXT NOT NULL,
    content_title VARCHAR(255),
    provider VARCHAR(50) NOT NULL,
    provider_url TEXT,
    user_agent VARCHAR(255),
    ip_address VARCHAR(45),
    country_code VARCHAR(2),
    referrer VARCHAR(255),
    created_at TEXT DEFAULT CURRENT_TIMESTAMP

);
CREATE INDEX IF NOT EXISTS analytics_provider_clicks_idx_session ON analytics_provider_clicks (session_id);
CREATE INDEX IF NOT EXISTS analytics_provider_clicks_idx_content_id ON analytics_provider_clicks (content_id);
CREATE INDEX IF NOT EXISTS analytics_provider_clicks_idx_provider ON analytics_provider_clicks (provider);
CREATE INDEX IF NOT EXISTS analytics_provider_clicks_idx_created_at ON analytics_provider_clicks (created_at);
CREATE INDEX IF NOT EXISTS analytics_provider_clicks_idx_country ON analytics_provider_clicks (country_code);
CREATE TABLE IF NOT EXISTS analytics_search (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id VARCHAR(100),
    search_query VARCHAR(255) NOT NULL,
    results_count INTEGER DEFAULT 0,
    clicked_result_id INTEGER,
    clicked_result_type TEXT,
    user_agent VARCHAR(255),
    ip_address VARCHAR(45),
    created_at TEXT DEFAULT CURRENT_TIMESTAMP

);
CREATE INDEX IF NOT EXISTS analytics_search_idx_session ON analytics_search (session_id);
CREATE INDEX IF NOT EXISTS analytics_search_idx_search_query ON analytics_search (search_query);
CREATE INDEX IF NOT EXISTS analytics_search_idx_created_at ON analytics_search (created_at);
CREATE TABLE IF NOT EXISTS analytics_engagement (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id VARCHAR(100),
    content_id INTEGER NOT NULL,
    content_type TEXT NOT NULL,
    action_type TEXT NOT NULL,
    action_value VARCHAR(255),
    user_agent VARCHAR(255),
    ip_address VARCHAR(45),
    created_at TEXT DEFAULT CURRENT_TIMESTAMP

);
CREATE INDEX IF NOT EXISTS analytics_engagement_idx_session ON analytics_engagement (session_id);
CREATE INDEX IF NOT EXISTS analytics_engagement_idx_content_id ON analytics_engagement (content_id);
CREATE INDEX IF NOT EXISTS analytics_engagement_idx_action_type ON analytics_engagement (action_type);
CREATE INDEX IF NOT EXISTS analytics_engagement_idx_created_at ON analytics_engagement (created_at);
CREATE TABLE IF NOT EXISTS performance_api_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL,
    response_time_ms INTEGER NOT NULL,
    status_code INTEGER NOT NULL,
    cache_hit INTEGER DEFAULT FALSE,
    error_message TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP

);
CREATE INDEX IF NOT EXISTS performance_api_metrics_idx_endpoint ON performance_api_metrics (endpoint);
CREATE INDEX IF NOT EXISTS performance_api_metrics_idx_method ON performance_api_metrics (method);
CREATE INDEX IF NOT EXISTS performance_api_metrics_idx_created_at ON performance_api_metrics (created_at);
CREATE INDEX IF NOT EXISTS performance_api_metrics_idx_status_code ON performance_api_metrics (status_code);
CREATE TABLE IF NOT EXISTS performance_system_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    metric_type TEXT NOT NULL,
    metric_value REAL NOT NULL,
    metric_unit VARCHAR(20),
    server_name VARCHAR(100),
    created_at TEXT DEFAULT CURRENT_TIMESTAMP

);
CREATE INDEX IF NOT EXISTS performance_system_metrics_idx_metric_type ON performance_system_metrics (metric_type);
CREATE INDEX IF NOT EXISTS performance_system_metrics_idx_created_at ON performance_system_metrics (created_at);
CREATE TABLE IF NOT EXISTS optimization_ab_tests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    test_name VARCHAR(255) NOT NULL,
    variant VARCHAR(50) NOT NULL,
    metric_name VARCHAR(100) NOT NULL,
    metric_value REAL NOT NULL,
    sample_size INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP

);
CREATE INDEX IF NOT EXISTS optimization_ab_tests_idx_test_name ON optimization_ab_tests (test_name);
CREATE INDEX IF NOT EXISTS optimization_ab_tests_idx_variant ON optimization_ab_tests (variant);
CREATE INDEX IF NOT EXISTS optimization_ab_tests_idx_created_at ON optimization_ab_tests (created_at);
CREATE TABLE IF NOT EXISTS optimization_feature_flags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    feature_name VARCHAR(100) NOT NULL UNIQUE,
    is_enabled INTEGER DEFAULT FALSE,
    description TEXT,
    rollout_percentage INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP

);
CREATE INDEX IF NOT EXISTS optimization_feature_flags_idx_feature_name ON optimization_feature_flags (feature_name);
CREATE TABLE IF NOT EXISTS optimization_cache_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cache_key VARCHAR(255) NOT NULL,
    cache_type TEXT NOT NULL,
    hit_count INTEGER DEFAULT 0,
    miss_count INTEGER DEFAULT 0,
    size_bytes INTEGER,
    ttl_seconds INTEGER,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP

);
CREATE INDEX IF NOT EXISTS optimization_cache_metrics_idx_cache_key ON optimization_cache_metrics (cache_key);
CREATE INDEX IF NOT EXISTS optimization_cache_metrics_idx_cache_type ON optimization_cache_metrics (cache_type);
CREATE TABLE IF NOT EXISTS streaming_catalog (tmdb_id TEXT PRIMARY KEY, record TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS request_limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS request_limits_expiry ON request_limits(expires_at);
CREATE TABLE IF NOT EXISTS admin_audit (id INTEGER PRIMARY KEY AUTOINCREMENT, actor TEXT NOT NULL, action TEXT NOT NULL, entity TEXT NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
