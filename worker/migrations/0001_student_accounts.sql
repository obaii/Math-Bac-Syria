-- Student accounts foundation for Cloudflare D1.
-- Apply with: npx wrangler d1 migrations apply <DATABASE_NAME> --remote
-- Passwords and session tokens are always stored as one-way hashes.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS student_accounts (
  id TEXT PRIMARY KEY NOT NULL,
  username TEXT NOT NULL COLLATE NOCASE UNIQUE,
  password_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  CHECK (length(username) BETWEEN 3 AND 24),
  CHECK (username NOT GLOB '*[^A-Za-z0-9_-]*'),
  CHECK (length(password_hash) BETWEEN 20 AND 255)
);

CREATE TABLE IF NOT EXISTS student_sessions (
  token_hash TEXT PRIMARY KEY NOT NULL,
  account_id TEXT NOT NULL REFERENCES student_accounts(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL,
  CHECK (length(token_hash) = 64),
  CHECK (expires_at > created_at)
);

CREATE INDEX IF NOT EXISTS idx_student_sessions_account
  ON student_sessions(account_id);
CREATE INDEX IF NOT EXISTS idx_student_sessions_expiry
  ON student_sessions(expires_at);

CREATE TABLE IF NOT EXISTS student_progress (
  account_id TEXT PRIMARY KEY NOT NULL REFERENCES student_accounts(id) ON DELETE CASCADE,
  progress_json TEXT NOT NULL CHECK (json_valid(progress_json)),
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision >= 1),
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS student_recovery_codes (
  id TEXT PRIMARY KEY NOT NULL,
  account_id TEXT NOT NULL REFERENCES student_accounts(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL,
  used_at INTEGER,
  CHECK (length(code_hash) = 64)
);

CREATE INDEX IF NOT EXISTS idx_student_recovery_account
  ON student_recovery_codes(account_id);
