import sqlite3 from 'sqlite3';
import { hb_log } from '../log';

export class BaseDB {
  db: sqlite3.Database;
  constructor(db: sqlite3.Database) {
    this.db = db;
  }

  protected async setupWalAndSync() {
    const query = `PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL;`;
    await this.db.run(query, (e) => e && hb_log(`!! setupWalAndSync error: ${e}`));
  }

  async getCurrentDate(): Promise<string> {
    const query = 'SELECT current_date';
    return new Promise((resolve, reject) => {
      this.db.all(query, [], (err, rows: { current_date: string }[]) => {
        if (err) {
          reject('Error fetching current date: ' + err.message);
        } else {
          resolve(rows[0].current_date);
        }
      });
    });
  }
}
