import sqlite3 from 'sqlite3';
import { hb_log } from '../log';

export interface ShortLinkEntry {
  hash: string;
  long_link: string;
}

export class ShortLinksDB {
  db: sqlite3.Database;

  constructor(db: sqlite3.Database) {
    this.db = db;
  }

  setupDatabase(): void {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS short_links (
        hash TEXT PRIMARY KEY NOT NULL,
        long_link TEXT NOT NULL
      );
    `;

    this.db.run(createTableQuery, (e) => e && hb_log(`!! create short_links error: ${e}`));
  }

  async insertShortLink(hash: string, long_link: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO short_links (hash, long_link)
        VALUES (?, ?)
        ON CONFLICT(hash) DO UPDATE SET long_link = excluded.long_link;
      `;

      this.db.run(query, [hash, long_link], (err) => {
        if (err) return reject('Error inserting short link: ' + err.message);
        resolve();
      });
    });
  }

  async getLongLinkByHash(hash: string): Promise<string | null> {
    return new Promise((resolve, reject) => {
      const query = `SELECT long_link FROM short_links WHERE hash = ?;`;

      this.db.get(query, [hash], (err, row: ({ long_link: string } | undefined)) => {
        if (err) return reject('Error fetching long link: ' + err.message);
        resolve(row ? row.long_link : null);
      });
    });
  }
}
