import sqlite3 from 'sqlite3';
import { hb_log } from '../log';
import { BaseDB } from './base_db';

export interface PaymentLinkEntry {
  auth_id: string;
  transaction_id: number;
  link: string;
  name: string;
}

export class PaymentLinksDB extends BaseDB {
  constructor(db: sqlite3.Database) {
    super(db);
  }

  async setupDatabase(): Promise<void> {
    await this.setupWalAndSync();
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS payment_links (
        auth_id TEXT NOT NULL,
        transaction_id INTEGER NOT NULL,
        link TEXT NOT NULL,
        selector TEXT NOT NULL,
        name TEXT DEFAULT '',
        PRIMARY KEY (auth_id, transaction_id)
      );
    `;

    await this.promiseQuery(createTableQuery, 'payment_links');
  }

  async insertPaymentLink(authId: string, paymentTransactionId: number, link: string, selector: string, name: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO payment_links (auth_id, transaction_id, link, selector, name)
        VALUES (?, ?, ?, ?, ?);
      `;

      this.db.run(query, [authId, paymentTransactionId, link, selector, name], (err) => {
        if (err) return reject('Error inserting payment link: ' + err.message);
        resolve();
      });
    });
  }

  async getPaymentLink(authId: string, paymentTransactionId: number): Promise<PaymentLinkEntry | null> {
    return new Promise((resolve, reject) => {
      const query = `SELECT link, name FROM payment_links WHERE auth_id = ? AND transaction_id = ?;`;

      this.db.get(query, [authId, paymentTransactionId], (err, row: PaymentLinkEntry|null) => {
        if (err) return reject('Error fetching payment link: ' + err.message);
        resolve(row ?? null);
      });
    });
  }
}
