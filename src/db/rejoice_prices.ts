import sqlite3 from 'sqlite3';
import { hb_log } from '../log';
import { BaseDB } from './base_db';

export interface RejoicePriceEntry {
  rejoice_id: string;
  for_days: number;
  price: number;
}

export class RejoicePricesDB extends BaseDB {
  constructor(db: sqlite3.Database) {
    super(db);
  }

  async setupDatabase(): Promise<void> {
    await this.setupWalAndSync();
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS rejoice_prices (
        rejoice_id TEXT NOT NULL,
        for_days INTEGER NOT NULL,
        price REAL NOT NULL,
        PRIMARY KEY (rejoice_id, for_days)
      );
    `;

    await this.promiseQuery(createTableQuery, 'rejoice_prices');
  }

  async getRejoicePrice(rejoice_id: string, for_days: number): Promise<RejoicePriceEntry | null> {
    return new Promise((resolve, reject) => {
      const query = `SELECT * FROM rejoice_prices WHERE rejoice_id = ? AND for_days = ?;`;
  
      this.db.get(query, [rejoice_id, for_days], (err, row: RejoicePriceEntry) => {
        if (err) {
          reject('Error fetching price: ' + err.message);
        } else {
          resolve(row || null);
        }
      });
    });
  }

  async getRejoicePrices(): Promise<RejoicePriceEntry[]> {
    return new Promise((resolve, reject) => {
      const query = `SELECT rejoice_id, for_days, price FROM rejoice_prices;`;
  
      this.db.all(query, [], (err, rows: RejoicePriceEntry[]) => {
        if (err) return reject('Error fetching prices: ' + err.message);
        resolve(rows);
      });
    });
  }
}
