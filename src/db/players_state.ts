import sqlite3 from 'sqlite3';
import { PlayersGameState } from '../structs';
import { hb_log } from '../log';
import { BaseDB } from './base_db';

export class PlayersStateDB extends BaseDB {
  constructor(db: sqlite3.Database) {
    super(db);
  }

  async setupDatabase(): Promise<void> {
    await this.setupWalAndSync();
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS players_state (
        auth_id TEXT PRIMARY KEY,
        muted_to INTEGER DEFAULT 0,
        kicked_to INTEGER DEFAULT 0
      );
    `;

    await this.promiseQuery(createTableQuery, 'players_state');
  }

  async getAllPlayersGameState(): Promise<Map<string, PlayersGameState>> {
    return new Promise((resolve, reject) => {
      const query = `SELECT auth_id, muted_to, kicked_to FROM players_state;`;

      this.db.all(query, [], (err: any, rows: (PlayersGameState & { auth_id: string })[]) => {
        if (err) {
          return reject('Error fetching player states: ' + err.message);
        }

        if (!Array.isArray(rows)) {
          return reject('Unexpected data format from database');
        }

        const playersMap = new Map<string, PlayersGameState>();
        rows.forEach((row) => {
          playersMap.set(row.auth_id, {
            muted_to: row.muted_to,
            kicked_to: row.kicked_to
          });
        });

        resolve(playersMap);
      });
    });
  }

  async updateOrInsertPlayerStateKicked(auth_id: string, kicked_to: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO players_state (auth_id, kicked_to)
        VALUES (?, ?)
        ON CONFLICT(auth_id) DO UPDATE SET kicked_to = excluded.kicked_to;
      `;

      this.db.run(query, [auth_id, kicked_to], (err) => {
        if (err) return reject('Error updating kicked_to: ' + err.message);
        resolve();
      });
    });
  }

  async updateOrInsertPlayerStateMuted(auth_id: string, muted_to: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO players_state (auth_id, muted_to)
        VALUES (?, ?)
        ON CONFLICT(auth_id) DO UPDATE SET muted_to = excluded.muted_to;
      `;

      this.db.run(query, [auth_id, muted_to], (err) => {
        if (err) return reject('Error updating muted_to: ' + err.message);
        resolve();
      });
    });
  }
}
