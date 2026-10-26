CREATE TABLE IF NOT EXISTS visitors (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 username TEXT NOT NULL UNIQUE COLLATE NOCASE,
 email TEXT NOT NULL UNIQUE COLLATE NOCASE,
 password_hash TEXT NOT NULL,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS visitor_sessions (
 token_hash TEXT PRIMARY KEY,
 user_id INTEGER NOT NULL REFERENCES visitors(id) ON DELETE CASCADE,
 last_seen INTEGER NOT NULL,
 expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS visitor_sessions_user ON visitor_sessions(user_id);
CREATE TABLE IF NOT EXISTS visitor_library (
 user_id INTEGER NOT NULL REFERENCES visitors(id) ON DELETE CASCADE,
 media_type TEXT NOT NULL CHECK(media_type IN ('movie','tv')),
 tmdb_id INTEGER NOT NULL CHECK(tmdb_id>0),
 list TEXT NOT NULL CHECK(list IN ('favorite','watchlist')),
 title TEXT NOT NULL,
 poster_path TEXT,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(user_id,media_type,tmdb_id,list)
);
CREATE TABLE IF NOT EXISTS visitor_reviews (
 user_id INTEGER NOT NULL REFERENCES visitors(id) ON DELETE CASCADE,
 media_type TEXT NOT NULL CHECK(media_type IN ('movie','tv')),
 tmdb_id INTEGER NOT NULL CHECK(tmdb_id>0),
 rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 10),
 review TEXT NOT NULL DEFAULT '',
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(user_id,media_type,tmdb_id)
);
CREATE INDEX IF NOT EXISTS visitor_reviews_title ON visitor_reviews(media_type,tmdb_id,updated_at);
