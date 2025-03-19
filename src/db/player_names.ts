import sqlite3 from 'sqlite3';
import { hb_log } from '../log';
import { BaseDB } from './base_db';

export interface PlayerNameEntry {
  id: number;
  auth_id: string;
  name: string;
  claimed: number;
}
export class PlayerNamesDB extends BaseDB {
  constructor(db: sqlite3.Database) {
    super(db);
  }

  async setupDatabase(): Promise<void> {
    await this.setupWalAndSync();
    // Tworzenie tabeli player_names, jeśli jeszcze nie istnieje
    const createPlayerNamesTableQuery = `
      CREATE TABLE IF NOT EXISTS player_names (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        auth_id TEXT,
        name TEXT,
        claimed INTEGER DEFAULT 0,
        UNIQUE (auth_id, name)
      );
    `;
    await this.promiseQuery(createPlayerNamesTableQuery, 'player_names');
  }


  async insertPlayerName(auth_id: string, name: string): Promise<number> {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO player_names (auth_id, name) 
          SELECT ?, ?
          WHERE NOT EXISTS (
            SELECT 1 FROM player_names WHERE LOWER(name) = LOWER(?) AND claimed = 1
          );
        `;
      this.db.run(query, [auth_id, name], function (err) {
        if (err) {
          reject('Error inserting player name: ' + err.message);
        } else {
          resolve(this.lastID);
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
          ORDER BY id DESC
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
          WHERE (auth_id, claimed) IN (
            SELECT auth_id, MAX(claimed) 
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

  async getAllPlayerNamesAfter(lastId: number): Promise<PlayerNameEntry[]> {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT id, auth_id, name, claimed
          FROM player_names
          WHERE id > ?
          AND (auth_id, claimed) IN (
            SELECT auth_id, MAX(claimed)
            FROM player_names
            GROUP BY auth_id
          )
        ORDER BY id ASC;
      `;
      this.db.all(query, [lastId], (err, rows: PlayerNameEntry[]) => {
        if (err) {
          reject('Error fetching new player names: ' + err.message);
        } else {
          resolve(rows ? rows : []);
        }
      });
    });
  }
}
