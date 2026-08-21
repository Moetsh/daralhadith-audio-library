-- دار الحديث الصوتية — مخطط قاعدة البيانات
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'user',          -- admin / user
  avatar_url    TEXT,
  is_banned     INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  last_login_at TEXT
);

CREATE TABLE IF NOT EXISTS categories (
  id               TEXT PRIMARY KEY,
  name             TEXT NOT NULL,
  name_en          TEXT,
  parent_id        TEXT REFERENCES categories(id) ON DELETE CASCADE,
  icon             TEXT DEFAULT 'book',
  description      TEXT,
  cover_image_url  TEXT,
  sort_order       INTEGER NOT NULL DEFAULT 0,
  is_active        INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS scholars (
  id             TEXT PRIMARY KEY,
  name           TEXT NOT NULL,
  name_en        TEXT,
  bio            TEXT,
  bio_en         TEXT,
  image_url      TEXT,
  specialization TEXT,
  country        TEXT,
  status         TEXT NOT NULL DEFAULT 'active',       -- active / inactive / deceased
  is_featured    INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS series (
  id             TEXT PRIMARY KEY,
  title          TEXT NOT NULL,
  title_en       TEXT,
  scholar_id     TEXT REFERENCES scholars(id),
  category_id    TEXT REFERENCES categories(id),
  description    TEXT,
  cover_image_url TEXT,
  total_episodes INTEGER NOT NULL DEFAULT 0,
  is_complete    INTEGER NOT NULL DEFAULT 0,
  order_direction TEXT NOT NULL DEFAULT 'asc',
  parent_id      TEXT REFERENCES series(id)
);

CREATE TABLE IF NOT EXISTS audios (
  id             TEXT PRIMARY KEY,
  title          TEXT NOT NULL,
  title_en       TEXT,
  scholar_id     TEXT REFERENCES scholars(id),
  category_id    TEXT REFERENCES categories(id),
  sub_category_id TEXT REFERENCES categories(id),
  series_id      TEXT REFERENCES series(id),
  episode_number INTEGER,
  description    TEXT,
  description_en TEXT,
  archive_url    TEXT,
  file_url       TEXT,
  duration       INTEGER NOT NULL DEFAULT 0,           -- ثواني
  file_size      INTEGER NOT NULL DEFAULT 0,           -- بايت
  bitrate        INTEGER,
  cover_image_url TEXT,
  tags           TEXT DEFAULT '[]',
  status         TEXT NOT NULL DEFAULT 'published',    -- published / draft / hidden
  is_featured    INTEGER NOT NULL DEFAULT 0,
  allow_download INTEGER NOT NULL DEFAULT 1,
  listen_count   INTEGER NOT NULL DEFAULT 0,
  download_count INTEGER NOT NULL DEFAULT 0,
  added_days     INTEGER NOT NULL DEFAULT 0,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now')),
  published_at   TEXT
);
CREATE INDEX IF NOT EXISTS idx_audios_cat ON audios(category_id);
CREATE INDEX IF NOT EXISTS idx_audios_scholar ON audios(scholar_id);
CREATE INDEX IF NOT EXISTS idx_audios_series ON audios(series_id);
CREATE INDEX IF NOT EXISTS idx_audios_status ON audios(status);

CREATE TABLE IF NOT EXISTS favorite_folders (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS favorites (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  audio_id   TEXT NOT NULL REFERENCES audios(id) ON DELETE CASCADE,
  folder_id  INTEGER REFERENCES favorite_folders(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, audio_id)
);

CREATE TABLE IF NOT EXISTS playlists (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  is_public  INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS playlist_items (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  playlist_id INTEGER NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  audio_id    TEXT NOT NULL REFERENCES audios(id) ON DELETE CASCADE,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  UNIQUE(playlist_id, audio_id)
);

CREATE TABLE IF NOT EXISTS downloads (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  audio_id      TEXT NOT NULL REFERENCES audios(id) ON DELETE CASCADE,
  status        TEXT NOT NULL DEFAULT 'done',
  downloaded_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, audio_id)
);

CREATE TABLE IF NOT EXISTS listening_history (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id      INTEGER REFERENCES users(id) ON DELETE CASCADE,
  audio_id     TEXT NOT NULL REFERENCES audios(id) ON DELETE CASCADE,
  position     REAL NOT NULL DEFAULT 0,
  duration     REAL NOT NULL DEFAULT 0,
  is_completed INTEGER NOT NULL DEFAULT 0,
  listened_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_hist_audio ON listening_history(audio_id);

CREATE TABLE IF NOT EXISTS announcements (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  title           TEXT NOT NULL,
  content         TEXT,
  type            TEXT NOT NULL DEFAULT 'banner',     -- banner / popup / notification
  target_audience TEXT NOT NULL DEFAULT 'all',
  is_active       INTEGER NOT NULL DEFAULT 1,
  starts_at       TEXT,
  expires_at      TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS settings (
  key        TEXT PRIMARY KEY,
  value      TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS activity_logs (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_id    INTEGER REFERENCES users(id),
  action      TEXT NOT NULL,
  entity_type TEXT,
  entity_id   TEXT,
  details     TEXT,
  ip_address  TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS search_logs (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id      INTEGER REFERENCES users(id),
  query        TEXT NOT NULL,
  results_count INTEGER NOT NULL DEFAULT 0,
  searched_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
