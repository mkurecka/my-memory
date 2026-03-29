-- Track when memories are accessed for decay scoring
ALTER TABLE memory ADD COLUMN last_accessed_at INTEGER;

-- Indexes for efficient decay queries
CREATE INDEX IF NOT EXISTS idx_memory_last_accessed ON memory(last_accessed_at);
CREATE INDEX IF NOT EXISTS idx_memory_decay ON memory(created_at, last_accessed_at, priority, tag);
