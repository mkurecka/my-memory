-- Migration: Initial Schema
-- Created: 2025-01-20

-- Users table
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  last_active INTEGER,
  settings_json TEXT,
  subscription_tier TEXT DEFAULT 'free',
  api_usage_count INTEGER DEFAULT 0,
  api_usage_reset_at INTEGER
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created_at ON users(created_at);

-- Posts table
CREATE TABLE posts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  mode TEXT,
  account TEXT,
  original_text TEXT NOT NULL,
  generated_output TEXT,
  language TEXT,
  status TEXT DEFAULT 'pending',
  context_json TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_status ON posts(status);
CREATE INDEX idx_posts_type ON posts(type);
CREATE INDEX idx_posts_created_at ON posts(created_at);

-- Memory table
CREATE TABLE memory (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  text TEXT NOT NULL,
  context_json TEXT,
  tag TEXT,
  priority TEXT DEFAULT 'medium',
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_memory_user_id ON memory(user_id);
CREATE INDEX idx_memory_tag ON memory(tag);
CREATE INDEX idx_memory_priority ON memory(priority);
CREATE INDEX idx_memory_created_at ON memory(created_at);

-- API requests tracking table
CREATE TABLE api_requests (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  model TEXT,
  mode TEXT,
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  total_tokens INTEGER,
  cost_usd REAL,
  response_time_ms INTEGER,
  status_code INTEGER,
  error_message TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_api_requests_user_id ON api_requests(user_id);
CREATE INDEX idx_api_requests_endpoint ON api_requests(endpoint);
CREATE INDEX idx_api_requests_created_at ON api_requests(created_at);

-- Webhooks table
CREATE TABLE webhooks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  url TEXT NOT NULL,
  enabled INTEGER DEFAULT 1,
  events_json TEXT,
  secret TEXT,
  last_triggered_at INTEGER,
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_webhooks_user_id ON webhooks(user_id);
CREATE INDEX idx_webhooks_enabled ON webhooks(enabled);

-- Custom prompts table
CREATE TABLE custom_prompts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  mode TEXT NOT NULL,
  prompt_template TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, mode)
);

CREATE INDEX idx_custom_prompts_user_id ON custom_prompts(user_id);
CREATE INDEX idx_custom_prompts_mode ON custom_prompts(mode);
