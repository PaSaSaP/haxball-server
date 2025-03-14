import sqlite3 from 'sqlite3';
import { hb_log } from '../log';

export interface MatchAccumulatedEntry {
  date: string;
  auth_id: string;
  games: number;
  full_games: number;
  wins: number;
  full_wins: number;
  goals: number;
  assists: number;
  own_goals: number;
  playtime: number;
  clean_sheets: number;
  left_afk: number;
  left_votekick: number;
  left_server: number;
}

export class MatchAccumulatedStatsDB {
  db: sqlite3.Database;

  constructor(db: sqlite3.Database) {
    this.db = db;
  }

  setupDatabase(): void {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS match_accumulated_stats (
        date DATE NOT NULL,
        auth_id TEXT NOT NULL,
        games INTEGER DEFAULT 0,
        full_games INTEGER DEFAULT 0,
        wins INTEGER DEFAULT 0,
        full_wins INTEGER DEFAULT 0,
        goals INTEGER DEFAULT 0,
        assists INTEGER DEFAULT 0,
        own_goals INTEGER DEFAULT 0,
        playtime INTEGER DEFAULT 0,
        clean_sheets INTEGER DEFAULT 0,
        left_afk INTEGER DEFAULT 0,
        left_votekick INTEGER DEFAULT 0,
        left_server INTEGER DEFAULT 0,
        PRIMARY KEY (date, auth_id)
      );
      CREATE INDEX IF NOT EXISTS idx_match_accumulated_stats ON match_accumulated_stats (auth_id, date);
    `;
    this.db.run(createTableQuery, (e) => e && hb_log(`!! create match_accumulated_stats error: ${e}`));
  }

  async updateStatsForDay(date: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO match_accumulated_stats (date, auth_id, games, full_games, wins, full_wins, goals, assists, own_goals, playtime, clean_sheets, left_afk, left_votekick, left_server)
        SELECT 
          DATE(m.date) AS date, 
          ms.auth_id,
          COUNT(ms.match_id) AS games,
          SUM(ms.full_time) AS full_games,
          SUM(CASE WHEN m.winner = ms.team THEN 1 ELSE 0 END) AS wins,
          SUM(CASE WHEN m.winner = ms.team AND ms.full_time = 1 THEN 1 ELSE 0 END) AS full_wins,
          SUM(ms.goals) AS goals,
          SUM(ms.assists) AS assists,
          SUM(ms.own_goals) AS own_goals,
          SUM(ms.playtime) AS playtime,
          SUM(ms.clean_sheet) AS clean_sheets,
          SUM(CASE WHEN ms.left_state = 1 THEN 1 ELSE 0 END) AS left_afk,
          SUM(CASE WHEN ms.left_state = 2 THEN 1 ELSE 0 END) AS left_votekick,
          SUM(CASE WHEN ms.left_state = 3 THEN 1 ELSE 0 END) AS left_server
        FROM match_stats ms
        JOIN matches m ON ms.match_id = m.match_id
        WHERE DATE(m.date) = ?
        GROUP BY date, ms.auth_id
        ON CONFLICT(date, auth_id) DO UPDATE SET 
          games = excluded.games,
          full_games = excluded.full_games,
          wins = excluded.wins,
          full_wins = excluded.full_wins,
          goals = excluded.goals,
          assists = excluded.assists,
          own_goals = excluded.own_goals,
          playtime = excluded.playtime,
          clean_sheets = excluded.clean_sheets,
          left_afk = excluded.left_afk,
          left_votekick = excluded.left_votekick,
          left_server = excluded.left_server;
      `;
      this.db.run(query, [date], (err) => {
        if (err) {
          reject('Error updating stats: ' + err.message);
        } else {
          resolve();
        }
      });
    });
  }

  async updateStatsForToday(): Promise<void> {
    return this.updateStatsForDay('CURRENT_DATE');
  }
  
  async updateStatsForYesterday(): Promise<void> {
    return this.updateStatsForDay("(SELECT DATE('now', '-1 day'))");
  }

  async getStatsForDay(date: string): Promise<MatchAccumulatedEntry[]> {
    return new Promise((resolve, reject) => {
      const query = `SELECT * FROM match_accumulated_stats WHERE date = ?`;
      this.db.all(query, [date], (err, rows: MatchAccumulatedEntry[]) => {
        if (err) {
          reject('Error fetching stats: ' + err.message);
        } else {
          resolve(rows);
        }
      });
    });
  }

  async getStatsForLast7Days(): Promise<MatchAccumulatedEntry[]> {
    return new Promise((resolve, reject) => {
      const query = `SELECT * FROM match_accumulated_stats WHERE date >= DATE('now', '-6 days') ORDER BY date ASC`;
      this.db.all(query, [], (err, rows: MatchAccumulatedEntry[]) => {
        if (err) {
          reject('Error fetching last 7 days match accu stats: ' + err.message);
        } else {
          resolve(rows);
        }
      });
    });
  }

  async getStatsForLastDay(): Promise<MatchAccumulatedEntry[]> {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT * FROM match_accumulated_stats
        WHERE date = CURRENT_DATE;
      `;
      this.db.all(query, [], (err, rows: MatchAccumulatedEntry[]) => {
        if (err) {
          reject('Error fetching stats for last day: ' + err.message);
        } else {
          resolve(rows);
        }
      });
    });
  }

  async getCurrentDate(): Promise<string> {
    const query = 'SELECT current_date';
    return new Promise((resolve, reject) => {
      this.db.all(query, [], (err, rows: { current_date: string }[]) => {
        if (err) {
          reject('Error fetching current date: ' + err.message);
        } else {
          resolve(rows[0].current_date);
        }
      });
    });
  }
}
