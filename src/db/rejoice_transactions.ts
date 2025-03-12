import sqlite3 from 'sqlite3';
import { hb_log } from '../log';

export interface RejoiceTransactionEntry {
  transaction_id: number;
  auth_id: string;
  rejoice_id: string;
  at_time: number;
  for_days: number;
  payment_transaction_id: number;
  selector: string;
}

export class RejoiceTransactionsDB {
  db: sqlite3.Database;

  constructor(db: sqlite3.Database) {
    this.db = db;
  }

  setupDatabase(): void {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS rejoice_transactions (
        transaction_id INTEGER PRIMARY KEY AUTOINCREMENT,
        auth_id TEXT NOT NULL,
        rejoice_id TEXT NOT NULL,
        at_time INTEGER NOT NULL,
        for_days INTEGER NOT NULL,
        payment_transaction_id INTEGER DEFAULT 0,
        selector TEXT NOT NULL,
        FOREIGN KEY (payment_transaction_id) REFERENCES payments(transaction_id)
      );
    `;

    this.db.run(createTableQuery, (e) => e && hb_log(`!! create reojice_transactions error: ${e}`));
  }

  async insertRejoiceTransaction(auth_id: string, rejoice_id: string, at_time: number, for_days: number, selector: string): Promise<number> {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO rejoice_transactions (auth_id, rejoice_id, at_time, for_days, payment_transaction_id, selector)
        VALUES (?, ?, ?, ?, 0, ?);
      `;

      this.db.run(query, [auth_id, rejoice_id, at_time, for_days, selector], function (err) {
        if (err) return reject('Error inserting transaction: ' + err.message);
        resolve(this.lastID); // Zwraca ID nowo utworzonej transakcji
      });
    });
  }

  async updatePaymentTransactionId(transaction_id: number, payment_transaction_id: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const query = `
        UPDATE rejoice_transactions 
        SET payment_transaction_id = ? 
        WHERE transaction_id = ?;
      `;

      this.db.run(query, [payment_transaction_id, transaction_id], (err) => {
        if (err) return reject('Error updating payment_transaction_id: ' + err.message);
        resolve();
      });
    });
  }

  async getPendingRejoiceTransaction(transaction_id: number): Promise<RejoiceTransactionEntry | null> {
    return new Promise((resolve, reject) => {
      const query = `SELECT * FROM rejoice_transactions WHERE transaction_id = ?;`;
  
      this.db.get(query, [transaction_id], (err, row: RejoiceTransactionEntry) => {
        if (err) {
          reject('Error fetching rejoice_transaction: ' + err.message);
        } else {
          resolve(row || null);
        }
      });
    });
  }

  async getRejoiceTransactionByPaymentId(paymentTransactionId: number): Promise<RejoiceTransactionEntry | null> {
    return new Promise((resolve, reject) => {
      const query = `SELECT * FROM rejoice_transactions WHERE payment_transaction_id = ?;`;
  
      this.db.get(query, [paymentTransactionId], (err, row: RejoiceTransactionEntry) => {
        if (err) {
          reject('Error fetching rejoice_transaction: ' + err.message);
        } else {
          resolve(row || null);
        }
      });
    });
  }

  async getPendingRejoiceTransactions(): Promise<RejoiceTransactionEntry[]> {
    return new Promise((resolve, reject) => {
      const query = `SELECT * FROM rejoice_transactions;`;

      this.db.all(query, [], (err, rows: RejoiceTransactionEntry[]) => {
        if (err) return reject('Error fetching rejoice_transactions: ' + err.message);
        resolve(rows);
      });
    });
  }
}
