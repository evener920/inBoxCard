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
