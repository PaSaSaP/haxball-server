import sqlite3 from 'sqlite3';
import { hb_log } from '../log';
import { PlayerTopRatingData, PlayerTopRatingDataShort } from '../structs';
import { BaseDB } from './base_db';

export class TopRatingsHistoryDB extends BaseDB {
  private day: string;

  constructor(db: sqlite3.Database) {
    super(db);
    this.day = '';
  }

  async setupDatabase(): Promise<void> {
    await this.setupWalAndSync();
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS top_ratings_history (
        date INTEGER NOT NULL,
        rank INTEGER NOT NULL,
        auth_id TEXT NOT NULL,
        player_name TEXT NOT NULL,
        rating INTEGER DEFAULT 0,
        games INTEGER DEFAULT 0,
        wins INTEGER DEFAULT 0,
        goals INTEGER DEFAULT 0,
        assists INTEGER DEFAULT 0,
        own_goals INTEGER DEFAULT 0,
        clean_sheets INTEGER DEFAULT 0,
        PRIMARY KEY (date, rank),
        FOREIGN KEY (auth_id) REFERENCES player_match_stats(auth_id) ON DELETE CASCADE
      );`;
    await this.promiseQuery(createTableQuery, 'top_ratings_history');
  }

  setDate(day: string) {
    this.day = day;
  }

  async updateTopRatingsFrom(playerTopRatings: PlayerTopRatingData[]): Promise<void> {
    let date = this.day;
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        // Rozpoczynamy transakcję
        this.db.run("BEGIN TRANSACTION");

        // Usuwamy wszystkie dane z tabeli przed wstawieniem nowych
        this.db.run(`DELETE FROM top_ratings_history WHERE date = ?`, [date], (err) => {
          if (err) {
            // Jeśli wystąpił błąd podczas usuwania, anulujemy transakcję
            this.db.run("ROLLBACK");
            return reject(`Error deleting from top_ratings_history: ${err.message}`);
          }

          const insertQuery = `
            INSERT INTO top_ratings_history (date, rank, auth_id, player_name, rating, games, wins, goals, assists, own_goals, clean_sheets)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `;

          // Przygotowujemy zapytanie wstawiające dane
          const stmt = this.db.prepare(insertQuery);

          // Wstawiamy dane w pętli
          playerTopRatings.forEach((row) => {
            stmt.run(date, row.rank, row.auth_id, row.player_name, Math.round(row.rating), row.games,
              row.wins, row.goals, row.assists, row.own_goals, row.clean_sheets);
          });

          // Finalizujemy zapytanie przygotowane
          stmt.finalize((err) => {
            if (err) {
              // Jeśli wystąpił błąd, anulujemy transakcję
              this.db.run("ROLLBACK");
              return reject(`Error finalizing statement for top_ratings_history: ${err.message}`);
            }

            // Zatwierdzamy transakcję
            this.db.run("COMMIT", (err) => {
              if (err) {
                // Jeśli wystąpił błąd przy zatwierdzaniu transakcji, anulujemy
                this.db.run("ROLLBACK");
                return reject(`Error committing transaction for top_ratings_history: ${err.message}`);
              } else {
                resolve();
              }
            });
          });
        });
      });
    });
  }
  async getTopRatingsHistoryByDate(date: string): Promise<PlayerTopRatingData[]> {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT rank, auth_id, player_name, rating, games, wins, goals, assists, own_goals, clean_sheets
          FROM top_ratings_history
          WHERE date = ?
          ORDER BY rank DESC;
      `;
      this.db.all(query, [date], (err, rows) => {
        if (err) return reject("Error fetching top ratings history: " + err.message);
        resolve(rows ? rows as PlayerTopRatingData[] : []);
      });
    });
  }
}
