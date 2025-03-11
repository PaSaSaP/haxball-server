import sqlite3 from 'sqlite3';
import { hb_log } from '../log';

export class RejoiceTransactionsWatcher {
  // TODO remove auth_id from here?
  db: sqlite3.Database;
  callback: ((auth_id: string, transaction_id: number) => void) | null = null;
  intervalId: NodeJS.Timeout | null = null;

  constructor(db: sqlite3.Database) {
    this.db = db;
  }

  setupDatabase(): void {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS rejoice_transactions_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        auth_id TEXT NOT NULL,
        transaction_id INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TRIGGER IF NOT EXISTS after_insert_rejoice_transactions
      AFTER INSERT ON rejoice_transactions
      BEGIN
        INSERT INTO rejoice_transactions_log (auth_id, transaction_id)
        VALUES (NEW.auth_id, NEW.transaction_id);
      END;
    `;

    this.db.exec(createTableQuery, (e) => e && hb_log(`!! create rejoice_transactions_log error: ${e}`));
  }

  setCallback(callback: (auth_id: string, transaction_id: number) => void): void {
    this.callback = callback;
  }

  startWatching(intervalMs: number = 5000): void {
    if (this.intervalId) return; // Zapobiega wielokrotnemu uruchomieniu

    this.intervalId = setInterval(() => this.checkForNewEntries(), intervalMs);
    console.log(`Started watching for new rejoice transactions every ${intervalMs}ms.`);
  }

  stopWatching(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('Stopped watching for new rejoice transactions.');
    }
  }

  private checkForNewEntries(): void {
    const query = `SELECT * FROM rejoice_transactions_log ORDER BY created_at ASC`;

    this.db.all(query, (err, rows: { id: number, auth_id: string, transaction_id: number }[]) => {
      if (err) {
        console.error('Error fetching logs:', err.message);
        return;
      }

      for (const row of rows) {
        if (this.callback) {
          this.callback(row.auth_id, row.transaction_id);
        }

        // Usuń obsłużony wpis z logów
        this.db.run(`DELETE FROM rejoice_transactions_log WHERE id = ?`, [row.id], (deleteErr) => {
          if (deleteErr) console.error('Error deleting processed log:', deleteErr.message);
        });
      }
    });
  }
}
