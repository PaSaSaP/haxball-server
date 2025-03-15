import sqlite3 from 'sqlite3';
import { hb_log } from '../log';
import { BaseDB } from './base_db';

export class PaymentsWatcher extends BaseDB {
  callback: ((transaction_id: number, old_status: string, new_status: string) => void) | null = null;
  intervalId: NodeJS.Timeout | null = null;

  constructor(db: sqlite3.Database) {
    super(db);
  }

  setupDatabase(): void {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS payment_status_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        transaction_id INTEGER NOT NULL,
        old_status TEXT NOT NULL,
        new_status TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TRIGGER IF NOT EXISTS after_update_payment_status
      AFTER UPDATE ON payments
      FOR EACH ROW
      WHEN NEW.pay_status IN ('completed', 'failed') AND OLD.pay_status != NEW.pay_status
      BEGIN
        INSERT INTO payment_status_log (transaction_id, old_status, new_status)
        VALUES (NEW.transaction_id, OLD.pay_status, NEW.pay_status);
      END;
    `;

    this.db.exec(createTableQuery, (e) => e && hb_log(`!! create payment_status_log error: ${e}`));
  }

  setCallback(callback: (transaction_id: number, old_status: string, new_status: string) => void): void {
    this.callback = callback;
  }

  startWatching(intervalMs: number = 5000): void {
    if (this.intervalId) return; // Zapobiega wielokrotnemu uruchomieniu

    this.intervalId = setInterval(() => this.checkForNewEntries(), intervalMs);
    console.log(`Started watching for payment status changes every ${intervalMs}ms.`);
  }

  stopWatching(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('Stopped watching for payment status changes.');
    }
  }

  private checkForNewEntries(): void {
    const query = `SELECT * FROM payment_status_log ORDER BY created_at ASC`;

    this.db.all(query, (err, rows: { id: number, transaction_id: number, old_status: string, new_status: string }[]) => {
      if (err) {
        console.error('Error fetching logs:', err.message);
        return;
      }

      for (const row of rows) {
        if (this.callback) {
          this.callback(row.transaction_id, row.old_status, row.new_status);
        }

        // Usuń obsłużony wpis z logów
        this.db.run(`DELETE FROM payment_status_log WHERE id = ?`, [row.id], (deleteErr) => {
          if (deleteErr) console.error('Error deleting processed log:', deleteErr.message);
        });
      }
    });
  }
}
