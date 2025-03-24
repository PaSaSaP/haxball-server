import sqlite3 from 'sqlite3';
import { BaseDB } from './base_db';

export interface DiscordUserEntry {
  discord_id: number;
  claimed: boolean;
  state: number;
  nickname: string;
  chat_color: number;
}

export class DiscordUsersDB extends BaseDB {
  constructor(db: sqlite3.Database) {
    super(db);
  }

  async setupDatabase(): Promise<void> {
    await this.setupWalAndSync();
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS discord_users (
        discord_id INTEGER PRIMARY KEY,
        claimed BOOLEAN DEFAULT 0,
        state INTEGER DEFAULT 0,
        nickname TEXT DEFAULT '',
        chat_color INTEGER DEFAULT 0xFFFFFF,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (discord_id) REFERENCES discord_auth_links(discord_id)
      );
    `;
    await this.promiseQuery(createTableQuery, 'discord_users');
  }

  async addDiscordUser(discord_id: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO discord_users (discord_id, state)
        VALUES (?, 1)
        ON CONFLICT(discord_id)
        DO UPDATE SET
          state = excluded.state;
      `;
      this.db.run(query, [discord_id], function (err) {
        if (err) {
          reject('Error inserting user: ' + err.message);
        } else {
          resolve();
        }
      });
    });
  }

  async setDiscordUserNickname(discord_id: number, nickname: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const query = `
        UPDATE discord_users
        SET nickname = ?, claimed = 1
        WHERE discord_id = ?;
      `;
      
      this.db.run(query, [nickname, discord_id], function (err) {
        if (err) {
          reject('Error setting nickname: ' + err.message);
        } else {
          resolve();
        }
      });
    });
  }

  async updateDiscordChatColorForUser(discord_id: number, color: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const query = `
        UPDATE discord_users
        SET chat_color = ?
        WHERE discord_id = ?;
      `;
      this.db.run(query, [color, discord_id], function (err) {
        if (err) {
          reject('Error updating discord chat color: ' + err.message);
        } else {
          resolve();
        }
      });
    });
  }

  async getDiscordUser(discord_id: number): Promise<DiscordUserEntry | null> {
    return new Promise((resolve, reject) => {
      const query = `SELECT discord_id, claimed, state, nickname, chat_color FROM discord_users WHERE discord_id = ?`;
      this.db.get(query, [discord_id], (err, row) => {
        if (err) {
          reject('Error fetching user: ' + err.message);
        } else {
          resolve(row as DiscordUserEntry || null);
        }
      });
    });
  }

  async getAllDiscordUsers(): Promise<DiscordUserEntry[]> {
    return new Promise((resolve, reject) => {
      const query = `SELECT discord_id, claimed, state, nickname, chat_color FROM discord_users`;
      this.db.all(query, [], (err, rows) => {
        if (err) {
          reject('Error fetching all users: ' + err.message);
        } else {
          resolve(rows as DiscordUserEntry[]);
        }
      });
    });
  }
}