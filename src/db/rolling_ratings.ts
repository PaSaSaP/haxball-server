import sqlite3 from 'sqlite3';
import { hb_log } from '../log';
import { BaseDB } from './base_db';

export interface RollingRatingsData {
  auth_id: string;
  date: string;
  match_id: number; // last processed match id, not as key!!
  mu: number;
  rd: number;
  vol: number;
  games: number;
  wins: number;
  goals: number;
  assists: number;
  own_goals: number;
  clean_sheets: number;
  playtime: number;
  left_afk: number;
  left_votekick: number;
  left_server: number;
}

export class RollingRatingsDB extends BaseDB {
  constructor(db: sqlite3.Database) {
    super(db);
  }

  async setupDatabase(): Promise<void> {
    await this.setupWalAndSync();
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS rolling_ratings (
        auth_id TEXT NOT NULL,
        date DATE NOT NULL,
        match_id INTEGER DEFAULT 0,
        mu REAL DEFAULT 0,
        rd REAL DEFAULT 0,
        vol REAL DEFAULT 0,
        games INTEGER DEFAULT 0,
        wins INTEGER DEFAULT 0,
        goals INTEGER DEFAULT 0,
        assists INTEGER DEFAULT 0,
        own_goals INTEGER DEFAULT 0,
        clean_sheets INTEGER DEFAULT 0,
        playtime INTEGER DEFAULT 0,
        left_afk INTEGER DEFAULT 0,
        left_votekick INTEGER DEFAULT 0,
        left_server INTEGER DEFAULT 0,
        PRIMARY KEY (date, auth_id),
        FOREIGN KEY (auth_id) REFERENCES player_match_stats(auth_id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS index_rolling_stats_auth_id ON rolling_ratings (auth_id);
      CREATE INDEX IF NOT EXISTS index_rolling_stats_date ON rolling_ratings (date);
    `;
    await this.promiseQuery(createTableQuery, 'rollinkg_ratings');
  }

  async updateRollingRatingsFrom(rating: RollingRatingsData): Promise<void> {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO rolling_ratings (
          auth_id, date, match_id, mu, rd, vol, games, wins, goals, assists, own_goals, clean_sheets,
          playtime, left_afk, left_votekick, left_server
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(auth_id, date) DO UPDATE SET
          match_id = excluded.match_id,
          mu = excluded.mu,
          rd = excluded.rd,
          vol = excluded.vol,
          games = excluded.games,
          wins = excluded.wins,
          goals = excluded.goals,
          assists = excluded.assists,
          own_goals = excluded.own_goals,
          clean_sheets = excluded.clean_sheets,
          playtime = excluded.playtime,
          left_afk = excluded.left_afk,
          left_votekick = excluded.left_votekick,
          left_server = excluded.left_server;
      `;

      this.db.run(query, [
        rating.auth_id,
        rating.date,
        rating.match_id,
        rating.mu,
        rating.rd,
        rating.vol,
        rating.games,
        rating.wins,
        rating.goals,
        rating.assists,
        rating.own_goals,
        rating.clean_sheets,
        rating.playtime,
        rating.left_afk,
        rating.left_votekick,
        rating.left_server
      ], (err) => {
        if (err) {
          reject('Error updating rolling ratings: ' + err.message);
        } else {
          resolve();
        }
      });
    });
  }

  async getRollingRatingFor(auth_id: string, date: string): Promise<RollingRatingsData|null> {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT auth_id, date, match_id, mu, rd, vol, games, wins, goals, assists, own_goals, clean_sheets,
          playtime, left_afk, left_votekick, left_server
        FROM rolling_ratings
        WHERE auth_id = ? AND date = ?;
      `;
      this.db.all(query, [auth_id, date], (err: any, row: RollingRatingsData) => {
        if (err) return reject(`Error fetching from rolling_ratings: ${err.message}`);
        resolve(row? row as RollingRatingsData: null);
      });
    });
  }

  async getRollingRatingsByAuthId(auth_id: string): Promise<RollingRatingsData|null> {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT auth_id, date, match_id, mu, rd, vol, games, wins, goals, assists, own_goals, clean_sheets,
          playtime, left_afk, left_votekick, left_server
        FROM rolling_ratings
        WHERE auth_id = ?;
      `;
      this.db.all(query, [auth_id], (err: any, row: RollingRatingsData) => {
        if (err) return reject(`Error fetching from rolling_ratings: ${err.message}`);
        resolve(row? row as RollingRatingsData: null);
      });
    });
  }

  async getRollingRatingsByDate(date: string, min_games: number, limit_players: number): Promise<RollingRatingsData[]> {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT auth_id, date, match_id, mu, rd, vol, games, wins, goals, assists, own_goals, clean_sheets,
          playtime, left_afk, left_votekick, left_server
        FROM rolling_ratings
        WHERE date = ? AND games > ?
        ORDER BY mu DESC
        LIMIT ?;
      `;
      this.db.all(query, [date, min_games-1, limit_players], (err: any, rows: RollingRatingsData[]) => {
        if (err) return reject(`Error fetching from rolling_ratings: ${err.message}`);
        resolve(rows? rows as RollingRatingsData[]: []);
      });
    });
  }

  async getRollingRatingsByDateFromDate(date: string, from_date: string, min_games: number, limit_players: number): Promise<RollingRatingsData[]> {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT rr.auth_id, rr.date, rr.match_id, rr.mu, rr.rd, rr.vol, rr.games, rr.wins, rr.goals, rr.assists,
               rr.own_goals, rr.clean_sheets, rr.playtime, rr.left_afk, rr.left_votekick, rr.left_server
        FROM rolling_ratings rr
        INNER JOIN matches m ON rr.match_id = m.match_id
        WHERE rr.date = ?
          AND rr.games > ?
          AND m.date >= ?
        ORDER BY rr.mu DESC
        LIMIT ?;
      `;
      this.db.all(query, [date, min_games - 1, from_date, limit_players], (err: any, rows: RollingRatingsData[]) => {
        if (err) return reject(`Error fetching from rolling_ratings with match filter: ${err.message}`);
        resolve(rows ?? []);
      });
    });
  }

  async getRollingRatingsBetweenMatchIds(start_match_id: number, end_match_id: number): Promise<RollingRatingsData[]> {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT DISTINCT rr.*
        FROM rolling_ratings rr
        INNER JOIN match_stats ms ON rr.auth_id = ms.auth_id
        WHERE ms.match_id >= ? AND ms.match_id <=  ?
        ORDER BY date ASC;
      `;
      this.db.all(query, [start_match_id, end_match_id], (err: any, rows: RollingRatingsData[]) => {
        if (err) return reject(`Error fetching from rolling_ratings: ${err.message}`);
        resolve(rows? rows as RollingRatingsData[]: []);
      });
    });
  }

  async getRollingRatingsMaxMatchId(): Promise<number> {
    return new Promise((resolve, reject) => {
      const query = `SELECT MAX(match_id) AS max_match_id FROM rolling_ratings;`;

      this.db.get(query, [], (err, row: {max_match_id: number}|null) => {
        if (err) {
          reject('Error fetching max match_id: ' + err.message);
        } else {
          resolve(row?.max_match_id ?? 0);
        }
      });
    });
  }

  async getRollingRatingAllDays(): Promise<string[]> {
    return new Promise((resolve, reject) => {
      const query = `SELECT DISTINCT date FROM rolling_ratings;`;
      this.db.all(query, [], (err: any, rows: {date: string}[]) => {
        if (err) {
          reject('Error fetching dates: ' + err.message);
        } else {
          resolve(rows? rows.map(row => row.date): []);
        }
      });
    });
  }
}
