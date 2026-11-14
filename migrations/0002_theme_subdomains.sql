-- Preserve the existing counters while allowing new Fluri theme subdomains.
-- Request ingestion still uses the explicit application-level host allowlist.
CREATE TABLE central_daily_next (
 date TEXT NOT NULL,
 site TEXT NOT NULL CHECK (site = 'fluri.xyz' OR site GLOB '*.fluri.xyz'),
 path TEXT NOT NULL,
 source TEXT NOT NULL,
 views INTEGER NOT NULL DEFAULT 0 CHECK (views>=0),
 updated_at TEXT NOT NULL,
 PRIMARY KEY (date,site,path,source)
);
INSERT INTO central_daily_next (date,site,path,source,views,updated_at)
 SELECT date,site,path,source,views,updated_at FROM central_daily;
DROP TABLE central_daily;
ALTER TABLE central_daily_next RENAME TO central_daily;
CREATE INDEX central_daily_site_date ON central_daily(site,date);
