import sqlite3 from 'sqlite3';
import { hb_log } from '../log';
import { BaseDB } from './base_db';

export class RejoiceTransactionsWatcher extends BaseDB {
  // TODO remove auth_id from here?
  callback: ((auth_id: string, transaction_id: number, selector: string) => void) | null = null;
  intervalId: NodeJS.Timeout | null = null;

  constructor(db: sqlite3.Database) {
    super(db);
  }

  async setupDatabase(): Promise<void> {
    await this.setupWalAndSync();
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS rejoice_transactions_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        auth_id TEXT NOT NULL,
        transaction_id INTEGER NOT NULL,
        selector TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TRIGGER IF NOT EXISTS after_insert_rejoice_transactions
      AFTER INSERT ON rejoice_transactions
      BEGIN
        INSERT INTO rejoice_transactions_log (auth_id, transaction_id, selector)
        VALUES (NEW.auth_id, NEW.transaction_id, NEW.selector);
      END;
    `;

    await this.promiseQuery(createTableQuery, 'rejoice_transactions_log');
  }

  setCallback(callback: (auth_id: string, transaction_id: number, selector: string) => void): void {
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

    this.db.all(query, (err, rows: { id: number, auth_id: string, transaction_id: number, selector: string }[]) => {
      if (err) {
        console.error('Error fetching logs:', err.message);
        return;
      }

      for (const row of rows) {
        if (this.callback) {
          this.callback(row.auth_id, row.transaction_id, row.selector);
        }

        // Usuń obsłużony wpis z logów
        this.db.run(`DELETE FROM rejoice_transactions_log WHERE id = ?`, [row.id], (deleteErr) => {
          if (deleteErr) console.error('Error deleting processed log:', deleteErr.message);
        });
      }
    });
  }
}
