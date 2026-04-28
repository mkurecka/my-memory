-- Carousels table for tracking generated carousel history
CREATE TABLE IF NOT EXISTS carousels (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT,
  slide_count INTEGER NOT NULL DEFAULT 1,
  slides TEXT NOT NULL, -- JSON array of slide URLs and content
  template TEXT DEFAULT 'gradient',
  primary_color TEXT DEFAULT '#667eea',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Index for listing carousels by date
CREATE INDEX IF NOT EXISTS idx_carousels_created_at ON carousels(created_at DESC);
