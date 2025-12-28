-- Migration: Claude Code Sessions
-- Created: 2025-11-28
-- Stores Claude Code / AI coding session summaries and messages

-- Claude Code sessions table
CREATE TABLE IF NOT EXISTS claude_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'default_user',
  session_id TEXT,
  title TEXT,
  summary TEXT,
  project_path TEXT,
  working_directory TEXT,
  status TEXT DEFAULT 'active',
  started_at INTEGER,
  ended_at INTEGER,
  duration_seconds INTEGER,
  total_messages INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  cost_usd REAL DEFAULT 0,
  model TEXT,
  tags TEXT,
  metadata_json TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_claude_sessions_user_id ON claude_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_claude_sessions_session_id ON claude_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_claude_sessions_status ON claude_sessions(status);
CREATE INDEX IF NOT EXISTS idx_claude_sessions_created_at ON claude_sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_claude_sessions_project_path ON claude_sessions(project_path);

-- Claude session messages table (individual messages within a session)
CREATE TABLE IF NOT EXISTS claude_messages (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  tool_calls_json TEXT,
  tool_results_json TEXT,
  tokens_used INTEGER,
  model TEXT,
  message_index INTEGER,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (session_id) REFERENCES claude_sessions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_claude_messages_session_id ON claude_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_claude_messages_role ON claude_messages(role);
CREATE INDEX IF NOT EXISTS idx_claude_messages_created_at ON claude_messages(created_at);
