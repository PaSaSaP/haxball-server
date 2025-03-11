import sqlite3 from 'sqlite3';
import { hb_log } from '../log';

export interface RejoicePriceEntry {
  rejoice_id: string;
  for_days: number;
  price: number;
}

export class RejoicePricesDB {
  db: sqlite3.Database;

  constructor(db: sqlite3.Database) {
    this.db = db;
  }

  setupDatabase(): void {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS rejoice_prices (
        rejoice_id TEXT NOT NULL,
        for_days INTEGER NOT NULL,
        price REAL NOT NULL,
        PRIMARY KEY (rejoice_id, for_days)
      );
    `;

    this.db.run(createTableQuery, (e) => e && hb_log(`!! create rejoice_prices error: ${e}`));
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
