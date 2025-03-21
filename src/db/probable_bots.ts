import sqlite3 from 'sqlite3';
import { BaseDB } from './base_db';

export class ProbableBotsDB extends BaseDB {
  constructor(db: sqlite3.Database) {
    super(db);
  }
  async setupDatabase(): Promise<void> {
    await this.setupWalAndSync();
    const createPlayersTableQuery = `
      CREATE TABLE IF NOT EXISTS probable_bots (
        auth_id TEXT,
        conn_id TEXT,
        at DATE,
        PRIMARY KEY(auth_id, conn_id)
      );
    `;
    await this.promiseQuery(createPlayersTableQuery, 'players');
  }

  async addProbableBot(auth_id: string, conn_id: string): Promise<void> {
    const at = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    return new Promise((resolve, reject) => {
      const query = `
          INSERT OR IGNORE INTO probable_bots (auth_id, conn_id) 
          VALUES (?, ?);
      `;
      this.db.run(query, [auth_id, conn_id], function (err) {
        if (err) {
          reject('Error updating admin level: ' + err.message);
        } else {
          resolve();
        }
      });
    });
  }

  async removeProbableBotByAuthId(auth_id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const query = `
        DELETE FROM probable_bots 
        WHERE auth_id = ?;
      `;
      this.db.run(query, [auth_id], function (err) {
        if (err) {
          reject('Error removing probable bot: ' + err.message);
        } else {
          resolve();
        }
      });
    });
  }


  async probableBotExists(auth_id: string, conn_id: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT 1 FROM probable_bots 
        WHERE auth_id = ? OR conn_id = ? 
        LIMIT 1
      `;
      this.db.get(query, [auth_id, conn_id], (err, row) => {
        if (err) {
          reject('Error checking existence: ' + err.message);
        } else {
          resolve(!!row); // Jeśli znaleziono wpis, zwraca true, w przeciwnym razie false
        }
      });
    });
  }

}
