import sqlite3 from 'sqlite3';
import { PlayerData } from '../structs';
import { hb_log } from '../log';

export class PlayersDB {
  db: sqlite3.Database;

  constructor(db: sqlite3.Database) {
    this.db = db;
  }
  setupDatabase() {
    const createPlayersTableQuery = `
      CREATE TABLE IF NOT EXISTS players (
        auth_id TEXT PRIMARY KEY,
        trusted_level INTEGER DEFAULT 0,
        trusted_by TEXT,
        admin_level INTEGER DEFAULT 0
      );
    `;

    this.db.run(createPlayersTableQuery, (e) => e && hb_log(`!! create players error: ${e}`));
  }

  async updateAdminLevel(auth_id: string, new_admin_level: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const query = `
        UPDATE players
        SET admin_level = ?
        WHERE auth_id = ?;
      `;
      this.db.run(query, [new_admin_level, auth_id], function (err) {
        if (err) {
          reject('Error updating admin level: ' + err.message);
        } else if (this.changes === 0) {
          reject('No player found with the given auth_id');
        } else {
          resolve();
        }
      });
    });
  }

  getTrustLevel(player: PlayerData): Promise<number> {
    return new Promise((resolve, reject) => {
      const query = `SELECT trusted_level FROM players WHERE auth_id = ?`;
      this.db.get(query, [player.auth_id], (err: any, row: any) => {
        if (err) {
          reject('Error fetching trust level');
        } else {
          resolve((row?.trusted_level as number) ?? 0);
        }
      });
    });
  }

  getTrustAndAdminLevel(player: PlayerData): Promise<{ trust_level: number, admin_level: number }> {
    return new Promise((resolve, reject) => {
      const query = `SELECT trusted_level, admin_level FROM players WHERE auth_id = ?`;
      this.db.get(query, [player.auth_id], (err: any, row: any) => {
        if (err) {
          reject('Error in getTrustAndAdminLevel()');
        } else {
          resolve({
            trust_level: (row?.trusted_level as number) ?? 0,
            admin_level: (row?.admin_level as number) ?? 0
          });
        }
      });
    });
  }

  setTrustLevel(player: PlayerData, trust_level: number, by_player: PlayerData) {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO players (auth_id, trusted_level, trusted_by) 
        VALUES (?, ?, ?) 
        ON CONFLICT(auth_id) 
        DO UPDATE SET trusted_level = excluded.trusted_level, 
                      trusted_by = excluded.trusted_by;
      `;

      this.db.run(query, [player.auth_id, trust_level, by_player.auth_id], function (err: any) {
        if (err) {
          reject('Error setting trust level: ' + err.message);
        } else {
          resolve(true);
        }
      });
    });
  }
}
