import sqlite3 from 'sqlite3';
import { PlayerMatchStatsData } from '../structs';
import { hb_log } from '../log';

export interface MatchStatsEntry {
  match_id: number;
  auth_id: string;
  team: 0|1|2;
  goals: number;
  assists: number;
  own_goals: number;
  clean_sheet: number;
  playtime: number;
  full_time: number;
  left_state: number;
}

interface MatchStatsEntryRowId extends MatchStatsEntry {
  rowid: number;
}

export class MatchStatsDB {
  db: sqlite3.Database;

  constructor(db: sqlite3.Database) {
    this.db = db;
  }

  setupDatabase(): void {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS match_stats (
        match_id INTEGER NOT NULL,
        auth_id TEXT NOT NULL,
        team INTEGER DEFAULT 0,
        goals INTEGER DEFAULT 0,
        assists INTEGER DEFAULT 0,
        own_goals INTEGER DEFAULT 0,
        clean_sheet INTEGER DEFAULT 0,
        playtime INTEGER DEFAULT 0,
        full_time INTEGER DEFAULT 0,
        left_state INTEGER DEFAULT 0,
        PRIMARY KEY (match_id, auth_id),
        FOREIGN KEY (match_id) REFERENCES matches(match_id) ON DELETE CASCADE,
        FOREIGN KEY (auth_id) REFERENCES player_match_stats(auth_id) ON DELETE CASCADE
      );`;
    const createIndexAuthIdQuery = `CREATE INDEX IF NOT EXISTS index_match_stats_auth_id ON match_stats(auth_id);`;
    const createIndexMatchIdQuery = `CREATE INDEX IF NOT EXISTS index_match_stats_match_id ON match_stats(match_id);`;
    this.db.run(createTableQuery, (e) => e && hb_log(`!! create match_stats error: ${e}`));
    this.db.run(createIndexAuthIdQuery, (e) => e && hb_log(`!! create index_match_stats_auth_id error: ${e}`));
    this.db.run(createIndexMatchIdQuery, (e) => e && hb_log(`!! create index_match_stats_match_id error: ${e}`));
  }

  async insertNewMatchPlayerStats(match_id: number, auth_id: string, team_id: 0|1|2, stat: PlayerMatchStatsData): Promise<void> {
    return new Promise((resolve, reject) => {
      // Calculate left_state based on conditions
      let left_state = 0;
      if (stat.left_afk > 0) left_state = 1;
      else if (stat.left_votekick > 0) left_state = 2;
      else if (stat.left_server > 0) left_state = 3;

      // Calculate full_time based on full_games
      const full_time = stat.full_games > 0 ? 1 : 0;

      // Prepare the query
      const query = `
        INSERT INTO match_stats (match_id, auth_id, team, goals, assists, own_goals, clean_sheet, playtime, full_time, left_state)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(auth_id, match_id) DO UPDATE SET
          team = excluded.team,
          goals = excluded.goals,
          assists = excluded.assists,
          own_goals = excluded.own_goals,
          clean_sheet = excluded.clean_sheet,
          playtime = excluded.playtime,
          full_time = excluded.full_time,
          left_state = excluded.left_state;
      `;
      
      // Run the query with the provided data
      this.db.run(query, [
        match_id, 
        auth_id, 
        team_id,
        stat.goals, 
        stat.assists, 
        stat.own_goals, 
        stat.clean_sheets, 
        Math.round(stat.playtime),
        full_time, 
        left_state
      ], (err) => {
        if (err) {
          reject('Error saving player match stats: ' + err.message);
        } else {
          resolve();
        }
      });
    });
  }

  async getMatchStatsForRange(start_match_id: number, end_match_id: number): Promise<MatchStatsEntry[]> {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT * FROM match_stats 
        WHERE match_id BETWEEN ? AND ? 
        ORDER BY match_id ASC;
      `;
      
      this.db.all(query, [start_match_id, end_match_id], (err, rows: MatchStatsEntry[]) => {
        if (err) {
          reject('Error fetching match stats: ' + err.message);
        } else {
          resolve(rows);
        }
      });
    });
  }

  async getMatchStatsAfter(lastRowId: number): Promise<[MatchStatsEntry[], number]> {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT ROWID, * FROM match_stats 
        WHERE ROWID > ?
        ORDER BY ROWID ASC;
      `;
      this.db.all(query, [lastRowId], (err, rows: MatchStatsEntryRowId[]) => {
        if (err) {
          reject('Error fetching match stats: ' + err.message);
        } else {
          resolve([rows, rows[rows.length-1].rowid]);
        }
      });
    });
  }
}
