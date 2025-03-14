import sqlite3 from 'sqlite3';
import { hb_log } from '../log';

export interface MatchRankChangesEntry {
  match_id: number;
  auth_id: string;
  old_rd: number;
  old_mu: number;
  new_mu: number;
  penalty: number;
}

export class MatchRankChangesDB {
  db: sqlite3.Database;

  constructor(db: sqlite3.Database) {
    this.db = db;
  }

  setupDatabase(): void {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS match_rank_changes (
        match_id INTEGER NOT NULL,
        auth_id TEXT NOT NULL,
        old_rd INTEGER DEFAULT 0,
        old_mu INTEGER DEFAULT 0,
        new_mu INTEGER DEFAULT 0,
        penalty INTEGER DEFAULT 0,
        PRIMARY KEY (match_id, auth_id),
        FOREIGN KEY (match_id) REFERENCES matches(match_id) ON DELETE CASCADE,
        FOREIGN KEY (auth_id) REFERENCES player_match_stats(auth_id) ON DELETE CASCADE
      );`;
    const createIndexAuthIdQuery = `CREATE INDEX IF NOT EXISTS index_match_rank_changed_auth_id ON match_rank_changes(auth_id);`;
    const createIndexMatchIdQuery = `CREATE INDEX IF NOT EXISTS index_match_rank_changed_match_id ON match_rank_changes(match_id);`;
    this.db.run(createTableQuery, (e) => e && hb_log(`!! create match_rank_changes error: ${e}`));
    this.db.run(createIndexAuthIdQuery, (e) => e && hb_log(`!! create index_match_rank_changed_auth_id error: ${e}`));
    this.db.run(createIndexMatchIdQuery, (e) => e && hb_log(`!! create index_match_rank_changed_match_id error: ${e}`));
  }

  async insertNewMatchRankChanges(m: MatchRankChangesEntry): Promise<void> {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO match_rank_changes (match_id, auth_id, old_rd, old_mu, new_mu, penalty)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(auth_id, match_id) DO UPDATE SET
          old_rd = excluded.old_rd,
          old_mu = excluded.old_mu,
          new_mu = excluded.new_mu,
          penalty = excluded.penalty;
      `;
      
      // Run the query with the provided data
      this.db.run(query, [m.match_id, m.auth_id, m.old_rd, m.old_mu, m.new_mu, m.penalty], (err) => {
        if (err) {
          reject('Error saving match rank changes: ' + err.message);
        } else {
          resolve();
        }
      });
    });
  }

  async getMatchRankChangesFor(matchId: number): Promise<MatchRankChangesEntry[]> {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT * FROM match_rank_changes 
        WHERE match_id = ?
        ORDER BY match_id ASC;
      `;
      
      this.db.all(query, [matchId], (err, rows: MatchRankChangesEntry[]) => {
        if (err) {
          reject('Error fetching match rank changes: ' + err.message);
        } else {
          resolve(rows);
        }
      });
    });
  }
}
