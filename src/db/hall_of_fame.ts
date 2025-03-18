import sqlite3 from 'sqlite3';
import { hb_log } from '../log';
import { BaseDB } from './base_db';

export interface HallOfFameEntry {
  rank: number;
  auth_id: string;
  player_name: string;
  ratio: number;
  rank1: number;
  rank2: number;
  rank3: number;
}

export class HallOfFameDB extends BaseDB {
  private day: string;

  constructor(db: sqlite3.Database) {
    super(db);
    this.day = '';
  }

  async setupDatabase(): Promise<void> {
    await this.setupWalAndSync();
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS hall_of_fame (
        rank INTEGER PRIMARY KEY,
        auth_id TEXT NOT NULL,
        player_name TEXT NOT NULL,
        ratio REAL NOT NULL,
        rank1 INTEGER DEFAULT 0,
        rank2 INTEGER DEFAULT 0,
        rank3 INTEGER DEFAULT 0,
        FOREIGN KEY (auth_id) REFERENCES player_match_stats(auth_id) ON DELETE CASCADE
    );`;
    await this.promiseQuery(createTableQuery, 'hall_of_fame');
  }

  async updateHallOfFameV2(): Promise<void> {
    let date = this.day;
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        // Rozpoczynamy transakcję
        this.db.run("BEGIN TRANSACTION");
  
        // Usuwamy wszystkie dane z tabeli hall_of_fame przed wstawieniem nowych
        this.db.run(`DELETE FROM hall_of_fame`, (err) => {
          if (err) {
            // Jeśli wystąpił błąd podczas usuwania, anulujemy transakcję
            this.db.run("ROLLBACK");
            return reject(`Error deleting from hall_of_fame: ${err.message}`);
          }
  
          const insertQuery = `
            INSERT INTO hall_of_fame (rank, auth_id, player_name, ratio, rank1, rank2, rank3)
            SELECT
              ROW_NUMBER() OVER (
                ORDER BY 
                  rank1 DESC,
                  rank2 DESC,
                  rank3 DESC,
                  ratio ASC
              ) AS rank,
              auth_id,
              player_name,
              ratio,
              rank1,
              rank2,
              rank3
            FROM (
              SELECT
                auth_id,
                player_name,
                COUNT(CASE WHEN rank = 1 THEN 1 END) AS rank1,
                COUNT(CASE WHEN rank = 2 THEN 1 END) AS rank2,
                COUNT(CASE WHEN rank = 3 THEN 1 END) AS rank3,
                SUM(rating / sqrt(games) * games) / SUM(games) AS ratio
              FROM top_ratings_history
              GROUP BY auth_id, player_name
            ) AS hall_of_fame_data`;
  
          // Wykonujemy zapytanie wstawiające dane
          this.db.run(insertQuery, (err) => {
            if (err) {
              // Jeśli wystąpił błąd podczas wstawiania danych, anulujemy transakcję
              this.db.run("ROLLBACK");
              return reject(`Error inserting into hall_of_fame: ${err.message}`);
            }
  
            // Zatwierdzamy transakcję
            this.db.run("COMMIT", (err) => {
              if (err) {
                // Jeśli wystąpił błąd przy zatwierdzaniu transakcji, anulujemy
                this.db.run("ROLLBACK");
                return reject(`Error committing transaction for hall_of_fame: ${err.message}`);
              } else {
                resolve();
              }
            });
          });
        });
      });
    });
  }


  async updateHallOfFame(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        // Rozpoczynamy transakcję
        this.db.run("BEGIN TRANSACTION");
  
        // Usuwamy wszystkie dane z tabeli hall_of_fame przed wstawieniem nowych
        this.db.run(`DELETE FROM hall_of_fame`, (err) => {
          if (err) {
            // Jeśli wystąpił błąd podczas usuwania, anulujemy transakcję
            this.db.run("ROLLBACK");
            return reject(`Error deleting from hall_of_fame: ${err.message}`);
          }
  
          const insertQuery = `
            INSERT INTO hall_of_fame (rank, auth_id, player_name, ratio, rank1, rank2, rank3)
            SELECT
              ROW_NUMBER() OVER (
                ORDER BY 
                  first_positions DESC,
                  second_positions DESC,
                  third_positions DESC,
                  ratio ASC
              ) AS rank,
              auth_id,
              player_name,
              ratio,
              first_positions AS rank1,
              second_positions AS rank2,
              third_positions AS rank3
            FROM (
              SELECT
                auth_id,
                player_name,
                COUNT(CASE WHEN rank = 1 THEN 1 END) AS first_positions,
                COUNT(CASE WHEN rank = 2 THEN 1 END) AS second_positions,
                COUNT(CASE WHEN rank = 3 THEN 1 END) AS third_positions,
                SUM(rating * SQRT(games)) AS weighted_ratio_sum,
                SUM(games) AS total_games,
                SUM(rating * SQRT(games)) / SUM(games) AS ratio
              FROM top_ratings_history
              GROUP BY auth_id
            ) AS hall_of_fame_data
            `;
  
          // Wykonujemy zapytanie wstawiające dane
          this.db.run(insertQuery, (err) => {
            if (err) {
              // Jeśli wystąpił błąd podczas wstawiania danych, anulujemy transakcję
              this.db.run("ROLLBACK");
              return reject(`Error inserting into hall_of_fame: ${err.message}`);
            }
  
            // Zatwierdzamy transakcję
            this.db.run("COMMIT", (err) => {
              if (err) {
                // Jeśli wystąpił błąd przy zatwierdzaniu transakcji, anulujemy
                this.db.run("ROLLBACK");
                return reject(`Error committing transaction for hall_of_fame: ${err.message}`);
              } else {
                resolve();
              }
            });
          });
        });
      });
    });
  }

  async getHallOfFame(): Promise<HallOfFameEntry[]> {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT rank, auth_id, player_name, ratio, rank1, rank2, rank3
          FROM hall_of_fame
          ORDER BY rank ASC;
      `;
      this.db.all(query, [], (err, rows) => {
        if (err) return reject("Error fetching top ratings history: " + err.message);
        resolve(rows ? rows as HallOfFameEntry[] : []);
      });
    });
  }
}
