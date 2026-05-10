use rusqlite::Connection;
use std::sync::Mutex;

use crate::error::AspError;

pub struct Database {
    conn: Mutex<Connection>,
}

impl Database {
    pub fn new(path: &str) -> Result<Self, AspError> {
        let conn = Connection::open(path)?;
        conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;")?;
        Ok(Database {
            conn: Mutex::new(conn),
        })
    }

    pub fn run_migrations(&self) -> Result<(), AspError> {
        let conn = self.conn()?;

        conn.execute_batch(
            "
            CREATE TABLE IF NOT EXISTS commitments (
                leaf_index INTEGER PRIMARY KEY,
                commitment TEXT NOT NULL,
                deposit_tx TEXT,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS merkle_roots (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                root TEXT NOT NULL,
                leaf_count INTEGER NOT NULL,
                submit_tx TEXT,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS nullifiers (
                nullifier_hash TEXT PRIMARY KEY,
                circuit_type TEXT NOT NULL,
                tx_hash TEXT,
                spent_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS proof_jobs (
                id TEXT PRIMARY KEY,
                circuit_type TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'pending',
                error TEXT,
                tx_hash TEXT,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS sync_state (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );

            -- Prevent the same commitment hash appearing at two different leaf slots.
            -- Uses IF NOT EXISTS so re-running migrations on an existing DB is safe.
            CREATE UNIQUE INDEX IF NOT EXISTS idx_commitments_commitment
                ON commitments(commitment);

            -- Speed up root lookups (non-unique: same root can appear at different leaf counts).
            CREATE INDEX IF NOT EXISTS idx_merkle_roots_root
                ON merkle_roots(root);
            ",
        )?;

        Ok(())
    }

    pub fn conn(&self) -> Result<std::sync::MutexGuard<'_, Connection>, AspError> {
        self.conn
            .lock()
            .map_err(|_| AspError::Internal("Database lock poisoned".into()))
    }
}
