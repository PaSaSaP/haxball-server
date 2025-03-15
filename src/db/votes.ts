import sqlite3 from 'sqlite3';
import { hb_log } from '../log';
import { BaseDB } from './base_db';

export class VotesDB extends BaseDB {
  constructor(db: sqlite3.Database) {
    super(db);
  }

  setupDatabase() {
    // TODO change "up"/"down" to integer 1/-1
    // Nowa tabela votes
    const createVotesTableQuery = `
        CREATE TABLE IF NOT EXISTS votes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          voter_auth_id TEXT,
          target_auth_id TEXT,
          vote_type TEXT, -- "up" lub "down"
          UNIQUE(voter_auth_id, target_auth_id)
        );
      `;

    this.db.run(createVotesTableQuery, (e) => e && hb_log(`!! create votes error: ${e}`));
  }

  // Dodanie głosu (up lub down)
  vote(voter_auth_id: string, target_auth_id: string, vote_type: 'up' | 'down') {
    const upsertQuery = `
                  INSERT INTO votes (voter_auth_id, target_auth_id, vote_type)
                  VALUES (?, ?, ?)
                  ON CONFLICT(voter_auth_id, target_auth_id)
                  DO UPDATE SET vote_type = excluded.vote_type;
              `;
    this.db.run(upsertQuery, [voter_auth_id, target_auth_id, vote_type], (err) => {
      if (err) {
        console.error('Error adding/updating vote:', err.message);
      }
    });
  }

  // Usunięcie głosu
  removeVote(voter_auth_id: string, target_auth_id: string) {
    const deleteQuery = `
                  DELETE FROM votes
                  WHERE voter_auth_id = ? AND target_auth_id = ?;
              `;
    this.db.run(deleteQuery, [voter_auth_id, target_auth_id], (err) => {
      if (err) {
        console.error('Error removing vote:', err.message);
      }
    });
  }

  // Policz reputację gracza
  getPlayerReputationSync(target_auth_id: string, callback: (reputation: number) => void) {
    const query = `
                  SELECT 
                      SUM(CASE WHEN vote_type = 'up' THEN 1 ELSE 0 END) as upvotes,
                      SUM(CASE WHEN vote_type = 'down' THEN 1 ELSE 0 END) as downvotes
                  FROM votes
                  WHERE target_auth_id = ?;
              `;
    this.db.get(query, [target_auth_id], (err, row: any) => {
      if (err) {
        console.error('Error calculating reputation:', err.message);
        callback(0);
      } else {
        const upvotes = row.upvotes || 0;
        const downvotes = row.downvotes || 0;
        const reputation = upvotes - downvotes;
        callback(reputation);
      }
    });
  }

  async getPlayerReputation(target_auth_id: string): Promise<{ upvotes: number; downvotes: number }> {
    return new Promise((resolve, reject) => {
      const query = `
                    SELECT 
                        SUM(CASE WHEN vote_type = 'up' THEN 1 ELSE 0 END) as upvotes,
                        SUM(CASE WHEN vote_type = 'down' THEN 1 ELSE 0 END) as downvotes
                    FROM votes
                    WHERE target_auth_id = ?;
                `;
      this.db.get(query, [target_auth_id], (err, row: any) => {
        if (err) {
          console.error('Error calculating reputation:', err.message);
          reject(err);
        } else {
          const upvotes = row.upvotes || 0;
          const downvotes = row.downvotes || 0;
          resolve({ upvotes, downvotes });
        }
      });
    });
  }
}
