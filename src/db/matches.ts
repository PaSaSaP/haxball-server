import sqlite3 from 'sqlite3';
import { Match } from '../structs';
import { hb_log } from '../log';

export interface MatchEntry {
  match_id: number;
  date: string;
  duration: number;
  full_time: boolean;
  winner: number,
  red_score: number;
  blue_score: number;
  pressure: number;
  possession: number;
}

export class MatchesDB {
  db: sqlite3.Database;

  constructor(db: sqlite3.Database) {
    this.db = db;
  }

  setupDatabase(): void {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS matches (
        match_id INTEGER PRIMARY KEY AUTOINCREMENT,
        date DATE NOT NULL,
        duration INTEGER DEFAULT 0,
        full_time INTEGER DEFAULT 0,
        winner INTEGER DEFAULT 0, 
        red_score INTEGER DEFAULT 0,
        blue_score INTEGER DEFAULT 0,
        pressure INTEGER DEFAULT 0, 
        possession INTEGER DEFAULT 0
      );`;
    this.db.run(createTableQuery, (e) => e && hb_log(`!! create matches error: ${e}`));
  }

  async insertNewMatch(match: Match, fullTimeMatchPlayed: boolean): Promise<number> {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO matches (date, duration, full_time, winner, red_score, blue_score, pressure, possession)
        VALUES (CURRENT_DATE, ?, ?, ?, ?, ?, ?, ?);
      `;
      this.db.run(query, [
        Math.round(match.matchEndTime), 
        fullTimeMatchPlayed,
        match.winnerTeam, 
        match.redScore, 
        match.blueScore, 
        Math.round(match.pressureRed),
        Math.round(match.possessionRed)
      ], function (err) {
        if (err) {
          reject('Error saving match: ' + err.message);
        } else {
          resolve(this.lastID);
        }
      });
    });
  }

  async getMatchesForLast7Days(): Promise<MatchEntry[]> {
    return new Promise((resolve, reject) => {
      const query = `SELECT * FROM matches WHERE date >= DATE('now', '-6 days') ORDER BY date ASC;`;
      this.db.all(query, [], (err, rows: MatchEntry[]) => {
        if (err) {
          reject('Error fetching LAST 7 days matches: ' + err.message);
        } else {
          resolve(rows);
        }
      });
    });
  }

  async getMatchesForLastDay(): Promise<MatchEntry[]> {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT * FROM matches
        WHERE date = CURRENT_DATE;
      `;
      this.db.all(query, [], (err, rows: MatchEntry[]) => {
        if (err) {
          reject('Error fetching matches for last day: ' + err.message);
        } else {
          resolve(rows);
        }
      });
    });
  }

  async getMatchesAfter(lastMatchId: number): Promise<MatchEntry[]> {
    return new Promise((resolve, reject) => {
      const query = `
      SELECT * FROM matches
        WHERE match_id > ?
        ORDER BY match_id ASC;
      `;
    
      this.db.all(query, [lastMatchId], (err, rows: MatchEntry[]) => {
        if (err) {
          reject('Error fetching new player names: ' + err.message);
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
