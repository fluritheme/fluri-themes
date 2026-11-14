CREATE TABLE IF NOT EXISTS central_daily (
 date TEXT NOT NULL,
 site TEXT NOT NULL CHECK (site IN ('fluri.xyz','winter.fluri.xyz','spider.fluri.xyz','grinch.fluri.xyz')),
 path TEXT NOT NULL,
 source TEXT NOT NULL,
 views INTEGER NOT NULL DEFAULT 0 CHECK (views>=0),
 updated_at TEXT NOT NULL,
 PRIMARY KEY (date,site,path,source)
);
CREATE TABLE IF NOT EXISTS central_state (site TEXT PRIMARY KEY,started_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS central_daily_site_date ON central_daily(site,date);
