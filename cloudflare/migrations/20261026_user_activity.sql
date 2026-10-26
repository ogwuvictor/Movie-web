CREATE TABLE IF NOT EXISTS visitor_daily_activity (
 user_id INTEGER NOT NULL REFERENCES visitors(id) ON DELETE CASCADE,
 activity_date TEXT NOT NULL,
 last_seen INTEGER NOT NULL,
 PRIMARY KEY(user_id,activity_date)
);
CREATE INDEX IF NOT EXISTS visitor_activity_date ON visitor_daily_activity(activity_date,user_id);
CREATE TABLE IF NOT EXISTS visitor_activity_settings (
 id INTEGER PRIMARY KEY CHECK(id=1),
 started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT OR IGNORE INTO visitor_activity_settings(id) VALUES (1);
