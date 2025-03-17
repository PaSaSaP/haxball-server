import sqlite3 from 'sqlite3';
import { PlayerTopRatingData, PlayerTopRatingDataShort, PlayerTopRatingDataShortAuth } from '../structs';
import { hb_log } from '../log';
import { BaseDB } from './base_db';

export class TopRatingsDB extends BaseDB {
  constructor(db: sqlite3.Database) {
    super(db);
  }

  async setupDatabase(): Promise<void> {
    await this.setupWalAndSync();
    const createSettingsQuery = `
      CREATE TABLE IF NOT EXISTS top_ratings_settings (
        min_full_games INTEGER DEFAULT 20,
        min_full_games_daily INTEGER DEFAULT 5,
        min_full_games_weekly INTEGER DEFAULT 10,
        players_limit INTEGER DEFAULT 1000
      );`;
    const insertDefaultSettingsQuery = `
      INSERT INTO top_ratings_settings (min_full_games, min_full_games_daily, min_full_games_weekly, players_limit)
        SELECT 20, 5, 10, 1000
        WHERE NOT EXISTS (SELECT 1 FROM top_ratings_settings
    );`;
    const createTopRatingsQuery = `
      CREATE TABLE IF NOT EXISTS top_ratings (
        rank INTEGER PRIMARY KEY,
        auth_id TEXT NOT NULL,
        player_name TEXT NOT NULL,
        rating INTEGER DEFAULT 0,
        games INTEGER DEFAULT 0,
        wins INTEGER DEFAULT 0,
        goals INTEGER DEFAULT 0,
        assists INTEGER DEFAULT 0,
        own_goals INTEGER DEFAULT 0,
        clean_sheets INTEGER DEFAULT 0
    );`;

    await this.db.run(createSettingsQuery, (e) =>  e && hb_log(`!! create top_ratings_settings error: ${e}`));
    await this.db.run(insertDefaultSettingsQuery, (e) => e && hb_log(`!! insert first top_ratings_settings error: ${e}`));
    await this.db.run(createTopRatingsQuery, (e) => e && hb_log(`!! create top_ratings error: ${e}`));
  }

  async updateTopRatingsFrom(playerTopRatings: PlayerTopRatingData[]): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        // Rozpoczynamy transakcję
        this.db.run("BEGIN TRANSACTION");
  
        // Usuwamy wszystkie dane z tabeli przed wstawieniem nowych
        this.db.run(`DELETE FROM top_ratings`, (err) => {
          if (err) {
            // Jeśli wystąpił błąd podczas usuwania, anulujemy transakcję
            this.db.run("ROLLBACK");
            return reject(`Error deleting from top_ratings: ${err.message}`);
          }
  
          const insertQuery = `
            INSERT INTO top_ratings (rank, auth_id, player_name, rating, games, wins, goals, assists, own_goals, clean_sheets)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `;
    
          // Przygotowujemy zapytanie wstawiające dane
          const stmt = this.db.prepare(insertQuery);
    
          // Wstawiamy dane w pętli
          playerTopRatings.forEach((row) => {
            stmt.run(row.rank, row.auth_id, row.player_name, Math.round(row.rating), row.games,
              row.wins, row.goals, row.assists, row.own_goals, row.clean_sheets);
          });
    
          // Finalizujemy zapytanie przygotowane
          stmt.finalize((err) => {
            if (err) {
              // Jeśli wystąpił błąd, anulujemy transakcję
              this.db.run("ROLLBACK");
              return reject(`Error finalizing statement for top_ratings: ${err.message}`);
            }
    
            // Zatwierdzamy transakcję
            this.db.run("COMMIT", (err) => {
              if (err) {
                // Jeśli wystąpił błąd przy zatwierdzaniu transakcji, anulujemy
                this.db.run("ROLLBACK");
                return reject(`Error committing transaction for top_ratings: ${err.message}`);
              } else {
                resolve();
              }
            });
          });
        });
      });
    });
  }

  async getTopNPlayersShortAuth(n: number): Promise<PlayerTopRatingDataShortAuth[]> {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT player_name, rating, auth_id
        FROM top_ratings 
        ORDER BY rank ASC 
        LIMIT ?;
      `;
      this.db.all(query, [n], (err, rows) => {
        if (err) return reject("Error fetching top players with auth: " + err.message);
        resolve(rows as PlayerTopRatingDataShortAuth[]);
      });
    });
  }

  async getTopNPlayersShort(n: number): Promise<PlayerTopRatingDataShort[]> {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT player_name, rating
        FROM top_ratings 
        ORDER BY rank ASC 
        LIMIT ?;
      `;
      this.db.all(query, [n], (err, rows) => {
        if (err) return reject("Error fetching top players: " + err.message);
        resolve(rows as PlayerTopRatingDataShort[]);
      });
    });
  }

  async getTopNPlayers(n: number): Promise<PlayerTopRatingData[]> {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT rank, auth_id, player_name, rating, games, wins, goals, assists, own_goals, clean_sheets
        FROM top_ratings
        ORDER BY rank ASC
        LIMIT ?;
      `;
      this.db.all(query, [n], (err, rows) => {
        if (err) return reject("Error fetching extended top players: " + err.message);
        resolve(rows as PlayerTopRatingData[]);
      });
    });
  }
}
