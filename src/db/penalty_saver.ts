import sqlite3 from 'sqlite3';
import { hb_log } from '../log';
import { BaseDB } from './base_db';

export class PenaltyCounterDB extends BaseDB {
  constructor(db: sqlite3.Database) {
    super(db);
  }

  async setupDatabase(): Promise<void> {
    await this.setupWalAndSync();
    const createReportsTableQuery = `
        CREATE TABLE IF NOT EXISTS penalty_counter (
          auth_id TEXT NOT NULL,
          date DATE NOT NULL,
          count INTEGER DEFAULT 0,
          PRIMARY KEY(auth_id, date)
        );
      `;
    await this.promiseQuery(createReportsTableQuery, 'penalty_saver');
  }

  async getPenaltyCounterFor(auth_id: string): Promise<number> {
    return new Promise((resolve, reject) => {
      const at = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const query = `
        SELECT count FROM penalty_counter 
        WHERE auth_id = ? AND date = ?;
      `;
  
      this.db.get(query, [auth_id, at], (err: any, row: any) => {
        if (err) {
          reject(`Error fetching penalty counter: ${err}`);
        } else {
          resolve(row?.count ?? 0); // Jeśli brak wpisu, zwraca 0
        }
      });
    });
  }

  async incrementPenaltyCounterFor(auth_id: string): Promise<number> {
    return new Promise((resolve, reject) => {
      const at = new Date().toISOString().split('T')[0]; // Zachowujemy tylko YYYY-MM-DD
      const insertReportQuery = `
      INSERT INTO penalty_counter (auth_id, date, count)
      VALUES (?, ?, 1)
      ON CONFLICT(auth_id, date) DO UPDATE SET
        count = count + 1
      RETURNING count;
    `;

      this.db.get(insertReportQuery, [auth_id, at], (err: any, row: any) => {
        if (err) {
          reject(`Error inserting report: ${err}`);
        } else {
          resolve(row?.count || 1);
        }
      });
    });
  }
}