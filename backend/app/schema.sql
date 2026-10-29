PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS accounts (
 id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, login TEXT NOT NULL, server TEXT NOT NULL,
 symbol TEXT NOT NULL DEFAULT 'XAGUSD', token_hash TEXT NOT NULL, enabled INTEGER NOT NULL DEFAULT 1,
 currency TEXT NOT NULL DEFAULT '', balance REAL NOT NULL DEFAULT 0, equity REAL NOT NULL DEFAULT 0,
 floating REAL NOT NULL DEFAULT 0, margin REAL NOT NULL DEFAULT 0, last_seen INTEGER,
 trade_allowed INTEGER NOT NULL DEFAULT 0, mode TEXT NOT NULL DEFAULT 'unknown', positions TEXT NOT NULL DEFAULT '[]',
 bot_applied INTEGER NOT NULL DEFAULT 0, bot_message TEXT NOT NULL DEFAULT 'Awaiting EA', created_at INTEGER NOT NULL,
 UNIQUE(login,server)
);
CREATE TABLE IF NOT EXISTS pairings (
 id INTEGER PRIMARY KEY AUTOINCREMENT, code_hash TEXT NOT NULL UNIQUE, label TEXT NOT NULL,
 symbol TEXT NOT NULL DEFAULT 'XAGUSD', status TEXT NOT NULL DEFAULT 'pending',
 account_id INTEGER REFERENCES accounts(id), created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL,
 claimed_at INTEGER
);
CREATE INDEX IF NOT EXISTS pairings_status ON pairings(status,expires_at);
CREATE TABLE IF NOT EXISTS intents (
 id INTEGER PRIMARY KEY AUTOINCREMENT, request_key TEXT NOT NULL UNIQUE, payload_hash TEXT NOT NULL,
 payload TEXT NOT NULL, created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS commands (
 id INTEGER PRIMARY KEY AUTOINCREMENT, intent_id INTEGER NOT NULL REFERENCES intents(id),
 account_id INTEGER NOT NULL REFERENCES accounts(id), payload TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'queued', ticket TEXT NOT NULL DEFAULT '', message TEXT NOT NULL DEFAULT '',
 retcode TEXT NOT NULL DEFAULT '', created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL, updated_at INTEGER NOT NULL,
 UNIQUE(intent_id,account_id)
);
CREATE INDEX IF NOT EXISTS commands_account ON commands(account_id,status);
CREATE TABLE IF NOT EXISTS deals (
 account_id INTEGER NOT NULL REFERENCES accounts(id), ticket TEXT NOT NULL, order_ticket TEXT NOT NULL,
 position_id TEXT NOT NULL, symbol TEXT NOT NULL, side TEXT NOT NULL, entry TEXT NOT NULL,
 volume REAL NOT NULL, price REAL NOT NULL, profit REAL NOT NULL, commission REAL NOT NULL,
 swap REAL NOT NULL, fee REAL NOT NULL, magic TEXT NOT NULL, time INTEGER NOT NULL, comment TEXT NOT NULL,
 PRIMARY KEY(account_id,ticket)
);
CREATE INDEX IF NOT EXISTS deals_time ON deals(time);
CREATE TABLE IF NOT EXISTS journal_notes (
 account_id INTEGER NOT NULL, ticket TEXT NOT NULL, note TEXT NOT NULL DEFAULT '', updated_at INTEGER NOT NULL,
 PRIMARY KEY(account_id,ticket), FOREIGN KEY(account_id,ticket) REFERENCES deals(account_id,ticket) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS bots (
 account_id INTEGER PRIMARY KEY REFERENCES accounts(id), version INTEGER NOT NULL DEFAULT 0,
 desired TEXT NOT NULL DEFAULT 'stopped', config TEXT NOT NULL DEFAULT '{}', run_id TEXT NOT NULL DEFAULT '',
 started_at INTEGER, expires_at INTEGER NOT NULL DEFAULT 0, updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS audit (
 id INTEGER PRIMARY KEY AUTOINCREMENT, event TEXT NOT NULL, detail TEXT NOT NULL, created_at INTEGER NOT NULL
);
