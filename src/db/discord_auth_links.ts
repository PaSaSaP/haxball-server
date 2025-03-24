import sqlite3 from 'sqlite3';
import { BaseDB } from './base_db';

export interface DiscordAuthLinksEntry {
  discord_id: number;
  auth_id: string;
}

export class DiscordAuthLinksDB extends BaseDB {
  constructor(db: sqlite3.Database) {
    super(db);
  }

  async setupDatabase(): Promise<void> {
    await this.setupWalAndSync();
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS discord_auth_links (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        discord_id INTEGER NULL,
        auth_id TEXT NOT NULL UNIQUE,
        token TEXT UNIQUE,
        token_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (auth_id) REFERENCES players(auth_id) ON DELETE CASCADE
      );
    `;
    await this.promiseQuery(createTableQuery, 'discord_auth_links');
  }

  async generateAndSendDiscordToken(auth_id: string): Promise<string> {
    let token = this.generateShortToken(auth_id, 32);
    let isTokenUnique = await this.checkTokenUnique(token);
    
    // Ensure token uniqueness
    while (!isTokenUnique) {
      token = this.generateShortToken(auth_id, 32);
      isTokenUnique = await this.checkTokenUnique(token);
    }
  
    // Insert token into database without discord_id
    const query = `
      INSERT INTO discord_auth_links (auth_id, token)
      VALUES (?, ?)
      ON CONFLICT(auth_id) DO UPDATE SET token = excluded.token, token_created_at = CURRENT_TIMESTAMP
    `;
  
    return new Promise<string>((resolve, reject) => {
      this.db.run(query, [auth_id, token], function (err) {
        if (err) {
          reject('Error generating and saving token: ' + err.message);
        } else {
          resolve(token);  // Return generated token
        }
      });
    });
  }

  async associateDiscordWithToken(discord_id: number, token: string, tokenValidityInMinutes = 15): Promise<void> {
    const checkQuery = `
      SELECT token_created_at 
      FROM discord_auth_links 
      WHERE token = ?;
    `;
  
    return new Promise<void>((resolve, reject) => {
      this.db.get(checkQuery, [token], (err, row: any) => {
        if (err) {
          reject('Error checking token existence: ' + err.message);
        } else if (!row) {
          reject('Token does not exist.');
        } else {
          // Sprawdzamy, czy token jest starszy niż 15 minut
          const tokenCreatedAt = new Date(row.token_created_at); // UTC z SQLite
          const now = new Date();
          const nowUTC = new Date(now.getTime() + now.getTimezoneOffset() * 60000); // Konwersja lokalnego czasu na UTC
          const timeDiff = nowUTC.getTime() - tokenCreatedAt.getTime();
          const fifteenMinutesInMs = tokenValidityInMinutes * 60 * 1000;
  
          if (timeDiff > fifteenMinutesInMs) {
            reject(`Token is older than ${tokenValidityInMinutes} minutes.`);
          } else {
            // Jeśli token jest świeży, wykonujemy update
            const updateQuery = `
              UPDATE discord_auth_links
              SET discord_id = ?
              WHERE token = ?
            `;
            
            this.db.run(updateQuery, [discord_id, token], function (err) {
              if (err) {
                reject('Error associating discord_id with token: ' + err.message);
              } else {
                resolve();
              }
            });
          }
        }
      });
    });
  }

  async getDiscordAuthLink(auth_id: string): Promise<DiscordAuthLinksEntry | null> {
    return new Promise((resolve, reject) => {
      const query = `SELECT discord_id, auth_id FROM discord_auth_links WHERE auth_id = ?`;
      this.db.get(query, [auth_id], (err, row) => {
        if (err) {
          reject('Error fetching auth link: ' + err.message);
        } else {
          resolve(row as DiscordAuthLinksEntry || null);
        }
      });
    });
  }

  async getAllDiscordAuthLinks(): Promise<DiscordAuthLinksEntry[]> {
    return new Promise((resolve, reject) => {
      const query = `SELECT discord_id, auth_id FROM discord_auth_links`;
      this.db.all(query, [], (err, rows) => {
        if (err) {
          reject('Error fetching all auth links: ' + err.message);
        } else {
          resolve(rows as DiscordAuthLinksEntry[]);
        }
      });
    });
  }

  private async checkTokenUnique(token: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const query = `SELECT COUNT(*) AS count FROM discord_auth_links WHERE token = ?`;
  
      this.db.get(query, [token], (err, row :{count: number}) => {
        if (err) {
          console.error("Error checking token uniqueness:", err);
          reject('Error checking token uniqueness: ' + err.message);
        } else {
          resolve(row?.count === 0);
        }
      });
    });
  }
}
