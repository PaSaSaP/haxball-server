import sqlite3 from 'sqlite3';
import { hb_log } from '../log';

export interface PaymentLinkEntry {
  auth_id: string;
  transaction_id: number;
  link: string;
}

export class PaymentLinksDB {
  db: sqlite3.Database;

  constructor(db: sqlite3.Database) {
    this.db = db;
  }

  setupDatabase(): void {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS payment_links (
        auth_id TEXT NOT NULL,
        transaction_id INTEGER NOT NULL,
        link TEXT NOT NULL,
        selector TEXT NOT NULL,
        PRIMARY KEY (auth_id, transaction_id)
      );
    `;

    this.db.run(createTableQuery, (e) => e && hb_log(`!! create payment_links error: ${e}`));
  }

  async insertPaymentLink(authId: string, paymentTransactionId: number, link: string, selector: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO payment_links (auth_id, transaction_id, link, selector)
        VALUES (?, ?, ?, ?);
      `;

      this.db.run(query, [authId, paymentTransactionId, link, selector], (err) => {
        if (err) return reject('Error inserting payment link: ' + err.message);
        resolve();
      });
    });
  }

  async getPaymentLink(authId: string, paymentTransactionId: number): Promise<string | null> {
    return new Promise((resolve, reject) => {
      const query = `SELECT link FROM payment_links WHERE auth_id = ? AND transaction_id = ?;`;

      this.db.get(query, [authId, paymentTransactionId], (err, row: ({ link: string } | undefined)) => {
        if (err) return reject('Error fetching payment link: ' + err.message);
        resolve(row ? row.link : null);
      });
    });
  }
}
