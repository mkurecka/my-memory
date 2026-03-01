-- Work sessions table for Claude Code session storage
-- Consolidates session-storage-worker functionality into my-memory
CREATE TABLE IF NOT EXISTS work_sessions (
  id TEXT PRIMARY KEY,
  project TEXT NOT NULL,
  jira_ref TEXT,
  goal TEXT NOT NULL,
  summary TEXT,
  changes TEXT,       -- JSON array
  errors TEXT,        -- JSON array
  open_items TEXT,    -- JSON array
  tags TEXT,          -- JSON array
  verified INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_work_sessions_project ON work_sessions(project);
CREATE INDEX IF NOT EXISTS idx_work_sessions_created ON work_sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_work_sessions_jira ON work_sessions(jira_ref);
