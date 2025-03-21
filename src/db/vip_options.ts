import sqlite3 from 'sqlite3';
import { hb_log } from '../log';
import { BaseDB } from './base_db';

export interface VipOptionEntry {
  auth_id: string;
  option: string;
  time_from: number;
  time_to: number;
}

export class VipOptionsDB extends BaseDB {
  constructor(db: sqlite3.Database) {
    super(db);
  }

  async setupDatabase(): Promise<void> {
    await this.setupWalAndSync();
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS vip_options (
        auth_id TEXT NOT NULL,
        option TEXT NOT NULL,
        time_from INTEGER DEFAULT 0,
        time_to INTEGER DEFAULT 0,
        PRIMARY KEY (auth_id, option)
      );
    `;

    await this.promiseQuery(createTableQuery, 'vip_options');
  }

  async getVipOptionsForPlayer(auth_id: string): Promise<VipOptionEntry[]> {
    return new Promise((resolve, reject) => {
      const query = `SELECT option, time_from, time_to FROM vip_options WHERE auth_id = ?;`;

      this.db.all(query, [auth_id], (err, rows: VipOptionEntry[]) => {
        if (err) {
          return reject('Error fetching vip options: ' + err.message);
        }
        resolve(rows ?? []);
      });
    });
  }

  async updateOrInsertVipOption(auth_id: string, option: string, time_from: number, time_to: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO vip_options (auth_id, option, time_from, time_to)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(auth_id, option) DO UPDATE 
        SET
          time_from = excluded.time_from,
          time_to = excluded.time_to;
      `;

      this.db.run(query, [auth_id, option, time_from, time_to], (err) => {
        if (err) return reject('Error updating vip options: ' + err.message);
        resolve();
      });
    });
  }
}