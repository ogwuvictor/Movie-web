CREATE TABLE IF NOT EXISTS anonymous_daily_activity (
 browser_hash TEXT NOT NULL,
 activity_date TEXT NOT NULL,
 last_seen INTEGER NOT NULL,
 PRIMARY KEY(browser_hash,activity_date)
);
CREATE INDEX IF NOT EXISTS anonymous_activity_date ON anonymous_daily_activity(activity_date,browser_hash);
CREATE TABLE IF NOT EXISTS anonymous_activity_settings (
 id INTEGER PRIMARY KEY CHECK(id=1),
 started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT OR IGNORE INTO anonymous_activity_settings(id) VALUES (1);
