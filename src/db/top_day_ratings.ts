import sqlite3 from 'sqlite3';
import { hb_log } from '../log';
import { PlayerTopRatingData, PlayerTopRatingDataShort } from '../structs';

class BaseTopRatingsDB {
  db: sqlite3.Database;
  tableName: string;

  constructor(db: sqlite3.Database, tableName: string) {
    this.db = db;
    this.tableName = tableName;
  }

  setupDatabase(): void {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS ${this.tableName} (
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
    this.db.run(createTableQuery, (e) => e && hb_log(`!! create ${this.tableName} error: ${e}`));
  }

  async updateTopRatingsFrom(playerTopRatings: PlayerTopRatingData[]): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        // Rozpoczynamy transakcję
        this.db.run("BEGIN TRANSACTION");
  
        // Usuwamy wszystkie dane z tabeli przed wstawieniem nowych
        this.db.run(`DELETE FROM ${this.tableName}`, (err) => {
          if (err) {
            // Jeśli wystąpił błąd podczas usuwania, anulujemy transakcję
            this.db.run("ROLLBACK");
            return reject(`Error deleting from ${this.tableName}: ${err.message}`);
          }
  
          const insertQuery = `
            INSERT INTO ${this.tableName} (rank, auth_id, player_name, rating, games, wins, goals, assists, own_goals, clean_sheets)
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
              return reject(`Error finalizing statement for ${this.tableName}: ${err.message}`);
            }
    
            // Zatwierdzamy transakcję
            this.db.run("COMMIT", (err) => {
              if (err) {
                // Jeśli wystąpił błąd przy zatwierdzaniu transakcji, anulujemy
                this.db.run("ROLLBACK");
                return reject(`Error committing transaction for ${this.tableName}: ${err.message}`);
              } else {
                resolve();
              }
            });
          });
        });
      });
    });
  }
  

  async updateTopRatingsFromV1(playerTopRatings: PlayerTopRatingData[]): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        // Rozpoczynamy transakcję
        this.db.run("BEGIN TRANSACTION");
  
        const insertQuery = `
          INSERT INTO ${this.tableName} (rank, auth_id, player_name, rating, games, wins, goals, assists, own_goals, clean_sheets)
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
            return reject(`Error finalizing statement for ${this.tableName}: ${err.message}`);
          }
  
          // Zatwierdzamy transakcję
          this.db.run("COMMIT", (err) => {
            if (err) {
              // Jeśli wystąpił błąd przy zatwierdzaniu transakcji, anulujemy
              this.db.run("ROLLBACK");
              return reject(`Error committing transaction for ${this.tableName}: ${err.message}`);
            } else {
              resolve();
            }
          });
        });
      });
    });
  }

  async getTopNPlayers(n: number): Promise<PlayerTopRatingData[]> {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT rank, auth_id, player_name, rating, games, wins, goals, assists, own_goals, clean_sheets
        FROM ${this.tableName}
        ORDER BY rank ASC
        LIMIT ?;
      `;
      this.db.all(query, [n], (err, rows) => {
        if (err) return reject(`Error fetching top players from ${this.tableName}: ${err.message}`);
        resolve(rows as PlayerTopRatingData[]);
      });
    });
  }

  async getTopNPlayersShort(n: number): Promise<PlayerTopRatingDataShort[]> {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT player_name, rating
        FROM ${this.tableName} 
        ORDER BY rank ASC 
        LIMIT ?;
      `;
      this.db.all(query, [n], (err, rows) => {
        if (err) return reject("Error fetching top players: " + err.message);
        resolve(rows as PlayerTopRatingDataShort[]);
      });
    });
  }
}

export class TopRatingsDailyDB extends BaseTopRatingsDB {
  constructor(db: sqlite3.Database) {
    super(db, "top_ratings_daily");
  }
}

export class TopRatingsWeeklyDB extends BaseTopRatingsDB {
  constructor(db: sqlite3.Database) {
    super(db, "top_ratings_weekly");
  }
}
