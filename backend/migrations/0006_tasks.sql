-- Tasks History Table
-- Stores user-created tasks from the content overlay system
-- Supports conversation threading with follow-up messages

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  task TEXT NOT NULL,
  source_item_id TEXT,
  source_item_type TEXT,
  source_text TEXT,
  source_url TEXT,
  source_context TEXT,
  status TEXT DEFAULT 'pending',
  response TEXT,
  conversation_thread TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_source_item ON tasks(source_item_id);
