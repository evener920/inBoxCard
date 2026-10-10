-- inBoxCard D1 schema
CREATE TABLE IF NOT EXISTS collections (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  name_en      TEXT,
  description  TEXT,
  category     TEXT,
  author       TEXT,
  cover_color  TEXT,
  count        INTEGER DEFAULT 0,
  created_at   INTEGER
);

CREATE TABLE IF NOT EXISTS notes (
  id            TEXT PRIMARY KEY,
  collection_id TEXT NOT NULL,
  timestamp     TEXT,
  content       TEXT,
  tags          TEXT,
  source        TEXT,
  seq           INTEGER
);

CREATE INDEX IF NOT EXISTS idx_notes_collection ON notes(collection_id);

CREATE TABLE IF NOT EXISTS categories (
  id      TEXT PRIMARY KEY,
  name    TEXT NOT NULL,
  name_en TEXT,
  icon    TEXT DEFAULT 'BookOpen',
  sort    INTEGER DEFAULT 0
);

INSERT INTO categories (id, name, name_en, icon, sort) VALUES
  ('entrepreneur', '商业巨擘', 'Entrepreneurs', 'Briefcase', 1),
  ('philosophy',   '哲学思想', 'Philosophy',    'BookOpen',  2),
  ('literature',   '文学经典', 'Literature',    'Feather',   3),
  ('history',      '历史智慧', 'History',       'History',   4)
  ON CONFLICT(id) DO NOTHING;
