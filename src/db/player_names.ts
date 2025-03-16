import sqlite3 from 'sqlite3';
import { hb_log } from '../log';
import { BaseDB } from './base_db';

export class PlayerNamesDB extends BaseDB {
  constructor(db: sqlite3.Database) {
    super(db);
  }

  async setupDatabase(): Promise<void> {
    await this.setupWalAndSync();
    // Tworzenie tabeli player_names, jeśli jeszcze nie istnieje
    const createPlayerNamesTableQuery = `
        CREATE TABLE IF NOT EXISTS player_names (
          auth_id TEXT,
          name TEXT,
          PRIMARY KEY (auth_id, name)
        );
      `;
    await this.db.run(createPlayerNamesTableQuery, (e) => e && hb_log(`!! create player_names error: ${e}`));
  }


  async insertPlayerName(auth_id: string, name: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const query = `
          INSERT OR IGNORE INTO player_names (auth_id, name) 
          VALUES (?, ?);
        `;
      this.db.run(query, [auth_id, name], (err) => {
        if (err) {
          reject('Error inserting player name: ' + err.message);
        } else {
          resolve();
        }
      });
    });
  }

  async getLastPlayerNames(auth_id: string, n = 5): Promise<string[]> {
    return new Promise((resolve, reject) => {
      const query = `
          SELECT name
          FROM player_names
          WHERE auth_id = ?
          ORDER BY ROWID DESC
          LIMIT ?;
        `;

      this.db.all(query, [auth_id, n], (err, rows: any[]) => {
        if (err) {
          reject('Error fetching last player names: ' + err.message);
        } else {
          const names = rows.map(row => row.name);
          resolve(names);
        }
      });
    });
  }

  async getAllPlayerNames(): Promise<Map<string, string>> {
    return new Promise((resolve, reject) => {
      const query = `
          SELECT auth_id, name
          FROM player_names
          WHERE ROWID IN (
            SELECT MAX(ROWID) 
            FROM player_names 
            GROUP BY auth_id
          );
        `;

      this.db.all(query, [], (err, rows: any[]) => {
        if (err) {
          reject('Error fetching all player names: ' + err.message);
        } else {
          const result = new Map<string, string>();
          for (const row of rows) {
            result.set(row.auth_id, row.name);
          }
          resolve(result);
        }
      });
    });
  }

  async getAllPlayerNamesAfter(lastRowId: number): Promise<[Map<string, string>, number]> {
    return new Promise((resolve, reject) => {
      const query = `
      SELECT ROWID, auth_id, name
        FROM player_names
        WHERE ROWID > ?
        ORDER BY ROWID ASC;
      `;
    
      this.db.all(query, [lastRowId], (err, rows: any[]) => {
        if (err) {
          reject('Error fetching new player names: ' + err.message);
        } else {
          const result = new Map<string, string>();
          let maxRowId = lastRowId;
          for (const row of rows) {
            result.set(row.auth_id, row.name);
            if (row.rowid > maxRowId) {
              maxRowId = row.rowid;
            }
          }
          resolve([result, maxRowId]);
        }
      });
    });
  }
}
