import sqlite3 from 'sqlite3';
import { BaseDB } from './base_db';

export interface VipTransactionEntry {
  transaction_id: number;
  auth_id: string;
  option: string;
  at_time: number;
  for_days: number;
  payment_transaction_id: number;
  selector: string;
}

export class VipTransactionsDB extends BaseDB {
  constructor(db: sqlite3.Database) {
    super(db);
  }

  async setupDatabase(): Promise<void> {
    await this.setupWalAndSync();
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS vip_transactions (
        transaction_id INTEGER PRIMARY KEY AUTOINCREMENT,
        auth_id TEXT NOT NULL,
        option TEXT NOT NULL,
        at_time INTEGER NOT NULL,
        for_days INTEGER NOT NULL,
        payment_transaction_id INTEGER DEFAULT 0,
        selector TEXT NOT NULL,
        FOREIGN KEY (payment_transaction_id) REFERENCES payments(transaction_id)
      );
    `;

    await this.promiseQuery(createTableQuery, 'vip_transactions');
  }

  async insertVipTransaction(auth_id: string, option: string, at_time: number, for_days: number, selector: string): Promise<number> {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO vip_transactions (auth_id, option, at_time, for_days, payment_transaction_id, selector)
        VALUES (?, ?, ?, ?, 0, ?);
      `;

      this.db.run(query, [auth_id, option, at_time, for_days, selector], function (err) {
        if (err) return reject('Error inserting transaction: ' + err.message);
        resolve(this.lastID); // Zwraca ID nowo utworzonej transakcji
      });
    });
  }

  async updatePaymentTransactionId(transaction_id: number, payment_transaction_id: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const query = `
        UPDATE vip_transactions 
        SET payment_transaction_id = ? 
        WHERE transaction_id = ?;
      `;

      this.db.run(query, [payment_transaction_id, transaction_id], (err) => {
        if (err) return reject('Error updating payment_transaction_id: ' + err.message);
        resolve();
      });
    });
  }

  async getPendingVipTransaction(transaction_id: number): Promise<VipTransactionEntry | null> {
    return new Promise((resolve, reject) => {
      const query = `SELECT * FROM vip_transactions WHERE transaction_id = ?;`;
  
      this.db.get(query, [transaction_id], (err, row: VipTransactionEntry) => {
        if (err) {
          reject('Error fetching vip_transactions: ' + err.message);
        } else {
          resolve(row || null);
        }
      });
    });
  }

  async getVipTransactionByPaymentId(paymentTransactionId: number): Promise<VipTransactionEntry | null> {
    return new Promise((resolve, reject) => {
      const query = `SELECT * FROM vip_transactions WHERE payment_transaction_id = ?;`;
  
      this.db.get(query, [paymentTransactionId], (err, row: VipTransactionEntry) => {
        if (err) {
          reject('Error fetching vip_transactions: ' + err.message);
        } else {
          resolve(row || null);
        }
      });
    });
  }

  async getPendingVipTransactions(): Promise<VipTransactionEntry[]> {
    return new Promise((resolve, reject) => {
      const query = `SELECT * FROM vip_transactions;`;

      this.db.all(query, [], (err, rows: VipTransactionEntry[]) => {
        if (err) return reject('Error fetching vip_transactions: ' + err.message);
        resolve(rows);
      });
    });
  }
}
