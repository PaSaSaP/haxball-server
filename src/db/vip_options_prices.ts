import sqlite3 from 'sqlite3';
import { hb_log } from '../log';
import { BaseDB } from './base_db';

export interface VipOptionsPriceEntry {
  option: string;
  for_days: number;
  price: number;
}

export class VipOptionsPricesDB extends BaseDB {
  constructor(db: sqlite3.Database) {
    super(db);
  }

  async setupDatabase(): Promise<void> {
    await this.setupWalAndSync();
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS vip_options_prices (
        option TEXT NOT NULL,
        for_days INTEGER NOT NULL,
        price REAL NOT NULL,
        PRIMARY KEY (option, for_days)
      );
    `;

    await this.promiseQuery(createTableQuery, 'vip_options_prices');
  }

  async getVipOptionPrice(option: string, for_days: number): Promise<VipOptionsPriceEntry | null> {
    return new Promise((resolve, reject) => {
      const query = `SELECT * FROM vip_options_prices WHERE option = ? AND for_days = ?;`;
  
      this.db.get(query, [option, for_days], (err, row: VipOptionsPriceEntry) => {
        if (err) {
          reject('Error fetching price: ' + err.message);
        } else {
          resolve(row || null);
        }
      });
    });
  }

  async getVipOpionPrices(): Promise<VipOptionsPriceEntry[]> {
    return new Promise((resolve, reject) => {
      const query = `SELECT option, for_days, price FROM vip_options_prices;`;
  
      this.db.all(query, [], (err, rows: VipOptionsPriceEntry[]) => {
        if (err) return reject('Error fetching prices: ' + err.message);
        resolve(rows);
      });
    });
  }
}
