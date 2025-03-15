import sqlite3 from 'sqlite3';
import { NetworksGameState } from '../structs';
import { hb_log } from '../log';
import { BaseDB } from './base_db';

export class NetworksStateDB extends BaseDB {
  constructor(db: sqlite3.Database) {
    super(db);
  }

  setupDatabase(): void {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS networks_state (
        conn_id TEXT PRIMARY KEY,
        muted_to INTEGER DEFAULT 0,
        kicked_to INTEGER DEFAULT 0
      );
    `;

    this.db.run(createTableQuery, (e) => e && hb_log(`!! creating networks_state error: ${e}`));
  }

  async getAllNetworksGameState(): Promise<Map<string, NetworksGameState>> {
    return new Promise((resolve, reject) => {
      const query = `SELECT conn_id, muted_to, kicked_to FROM networks_state;`;

      this.db.all(query, [], (err: any, rows: (NetworksGameState & { conn_id: string })[]) => {
        if (err) {
          return reject('Error fetching networks states: ' + err.message);
        }

        if (!Array.isArray(rows)) {
          return reject('Unexpected data format from database');
        }

        const networksMap = new Map<string, NetworksGameState>();
        rows.forEach((row) => {
          networksMap.set(row.conn_id, {
            muted_to: row.muted_to,
            kicked_to: row.kicked_to
          });
        });

        resolve(networksMap);
      });
    });
  }

  async updateOrInsertNetworkStateKicked(conn_id: string, kicked_to: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO networks_state (conn_id, kicked_to)
        VALUES (?, ?)
        ON CONFLICT(conn_id) DO UPDATE SET kicked_to = excluded.kicked_to;
      `;
  
      this.db.run(query, [conn_id, kicked_to], (err) => {
        if (err) return reject('Error updating kicked_to: ' + err.message);
        resolve();
      });
    });
  }

  async updateOrInsertNetworkStateMuted(conn_id: string, muted_to: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO networks_state (conn_id, muted_to)
        VALUES (?, ?)
        ON CONFLICT(conn_id) DO UPDATE SET muted_to = excluded.muted_to;
      `;
  
      this.db.run(query, [conn_id, muted_to], (err) => {
        if (err) return reject('Error updating muted_to: ' + err.message);
        resolve();
      });
    });
  }
}
