import sqlite3 from 'sqlite3';
import { RejoiceEntry } from '../structs';
import { hb_log } from '../log';
import { BaseDB } from './base_db';

/*
To add new rejoice:
- Create it in rejoice_maker, 
- then update data/rejoice_prices.csv 
- then call scripts/update_rejoice_prices.sh
*/

export class RejoiceDB extends BaseDB {
  constructor(db: sqlite3.Database) {
    super(db);
  }

  setupDatabase(): void {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS rejoices (
        auth_id TEXT NOT NULL,
        rejoice_id TEXT NOT NULL,
        time_from INTEGER DEFAULT 0,
        time_to INTEGER DEFAULT 0,
        PRIMARY KEY (auth_id, rejoice_id)
      );
    `;

    this.db.run(createTableQuery, (e) => e && hb_log(`!! create rejoices error: ${e}`));
  }

  async getRejoicesForPlayer(auth_id: string): Promise<RejoiceEntry[]> {
    return new Promise((resolve, reject) => {
      const query = `SELECT rejoice_id, time_from, time_to FROM rejoices WHERE auth_id = ?;`;

      this.db.all(query, [auth_id], (err, rows: RejoiceEntry[]) => {
        if (err) {
          return reject('Error fetching rejoices: ' + err.message);
        }

        resolve(rows);
      });
    });
  }

  async updateOrInsertRejoice(auth_id: string, rejoice_id: string, time_from: number, time_to: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO rejoices (auth_id, rejoice_id, time_from, time_to)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(auth_id, rejoice_id) DO UPDATE 
        SET time_from = excluded.time_from, time_to = excluded.time_to;
      `;

      this.db.run(query, [auth_id, rejoice_id, time_from, time_to], (err) => {
        if (err) return reject('Error updating rejoices: ' + err.message);
        resolve();
      });
    });

  }
}