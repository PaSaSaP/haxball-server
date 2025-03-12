import sqlite3 from 'sqlite3';
import { hb_log } from '../log';

export class PaymentLinksWatcher {
  db: sqlite3.Database;
  callback: ((auth_id: string, transaction_id: number) => void) | null = null;
  selector: string;
  intervalId: NodeJS.Timeout | null = null;

  constructor(db: sqlite3.Database) {
    this.db = db;
    this.selector = '';
  }

  setupDatabase(): void {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS payment_links_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        auth_id TEXT NOT NULL,
        transaction_id INTEGER NOT NULL,
        selector TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TRIGGER IF NOT EXISTS after_insert_payment_links
      AFTER INSERT ON payment_links
      BEGIN
        INSERT INTO payment_links_log (auth_id, transaction_id, selector)
        VALUES (NEW.auth_id, NEW.transaction_id, NEW.selector);
      END;
    `;

    this.db.exec(createTableQuery, (e) => e && hb_log(`!! create payment_links_log error: ${e}`));
  }

  setCallback(callback: (auth_id: string, transaction_id: number) => void, selector: string): void {
    this.callback = callback;
    this.selector = selector;
  }

  startWatching(intervalMs: number = 5000): void {
    if (this.intervalId) return; // Zapobiega wielokrotnemu uruchomieniu

    this.intervalId = setInterval(() => this.checkForNewEntries(), intervalMs);
    console.log(`Started watching for new payment links every ${intervalMs}ms.`);
  }

  stopWatching(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('Stopped watching for new payment links.');
    }
  }

  private checkForNewEntries(): void {
    const query = `SELECT * FROM payment_links_log WHERE selector='${this.selector}' ORDER BY created_at ASC`;

    this.db.all(query, (err, rows: { id: number, auth_id: string, transaction_id: number, selector: string }[]) => {
      if (err) {
        console.error('Error fetching logs:', err.message);
        return;
      }

      for (const row of rows) {
        if (this.callback) {
          this.callback(row.auth_id, row.transaction_id);
        }

        // Usuń obsłużony wpis z logów
        this.db.run(`DELETE FROM payment_links_log WHERE id = ?`, [row.id], (deleteErr) => {
          if (deleteErr) console.error('Error deleting processed log:', deleteErr.message);
        });
      }
    });
  }
}
