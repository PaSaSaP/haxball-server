import sqlite3 from 'sqlite3';
import { hb_log } from '../log';
import { BaseDB } from './base_db';

export interface PaymentEntry {
  transaction_id: number;
  price: number;
  pay_status: 'started' | 'completed' | 'failed';
}

export class PaymentsDB extends BaseDB {
  constructor(db: sqlite3.Database) {
    super(db);
  }

  async setupDatabase(): Promise<void> {
    await this.setupWalAndSync();
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS payments (
        transaction_id INTEGER PRIMARY KEY AUTOINCREMENT,
        price REAL NOT NULL,
        pay_status TEXT CHECK(pay_status IN ('started', 'completed', 'failed')) NOT NULL
      );
    `;

    await this.promiseQuery(createTableQuery, 'payments');
  }

  async insertPayment(price: number, pay_status: 'started' | 'completed' | 'failed'): Promise<number> {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO payments (price, pay_status)
        VALUES (?, ?);
      `;

      this.db.run(query, [price, pay_status], function (err) {
        if (err) return reject('Error inserting payment: ' + err.message);
        resolve(this.lastID); // Zwraca ID nowo utworzonej płatności
      });
    });
  }

  async updatePaymentStatus(transaction_id: number, pay_status: 'completed' | 'failed'): Promise<void> {
    return new Promise((resolve, reject) => {
      const query = `
        UPDATE payments SET pay_status = ? WHERE transaction_id = ?;
      `;

      this.db.run(query, [pay_status, transaction_id], (err) => {
        if (err) return reject('Error updating payment status: ' + err.message);
        resolve();
      });
    });
  }

  async getPaymentStatus(transaction_id: number): Promise<string | null> {
    return new Promise((resolve, reject) => {
      const query = `SELECT pay_status FROM payments WHERE transaction_id = ?;`;
  
      this.db.get(query, [transaction_id], (err, row: { pay_status: string }) => {
        if (err) {
          reject('Error fetching payment status: ' + err.message);
        } else {
          resolve(row ? row.pay_status : null);
        }
      });
    });
  }
}
