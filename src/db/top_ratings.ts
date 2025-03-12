import sqlite3 from 'sqlite3';
import { PlayerTopRatingData, PlayerTopRatingDataShort } from '../structs';
import { hb_log } from '../log';

export class TopRatingsDB {
  db: sqlite3.Database;

  constructor(db: sqlite3.Database) {
    this.db = db;
  }

  setupDatabase(): void {
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

    this.db.run(createSettingsQuery, (e) =>  e && hb_log(`!! create top_ratings_settings error: ${e}`));
    this.db.run(insertDefaultSettingsQuery, (e) => e && hb_log(`!! insert first top_ratings_settings error: ${e}`));
    this.db.run(createTopRatingsQuery, (e) => e && hb_log(`!! create top_ratings error: ${e}`));
  }

  async updateTopRatings(playerMap: Map<string, string>): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        this.db.run("BEGIN TRANSACTION");

        const settingsQuery = "SELECT min_full_games, players_limit FROM top_ratings_settings LIMIT 1";
        this.db.get(settingsQuery, (err, settings: {min_full_games: string, players_limit: number}) => {
          if (err) {
            this.db.run("ROLLBACK");
            return reject("Error fetching settings: " + err.message);
          }

          const minFullGames = settings?.min_full_games || 20;
          const playersLimit = settings?.players_limit || 100;

          this.db.run("DELETE FROM top_ratings", (err) => {
            if (err) {
              this.db.run("ROLLBACK");
              return reject("Error deleting from top_ratings: " + err.message);
            }

            const insertQuery = `
              INSERT INTO top_ratings (rank, auth_id, player_name, rating, games, wins, goals, assists, own_goals, clean_sheets)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            const selectQuery = `
              SELECT p.auth_id, r.rating, p.full_games AS games, p.full_wins AS wins, p.goals, p.assists, p.own_goals, p.clean_sheets
              FROM player_match_stats p
              JOIN player_ratings r ON p.auth_id = r.auth_id
              WHERE p.full_games >= ?
              ORDER BY r.rating DESC
              LIMIT ?;
            `;

            this.db.all(selectQuery, [minFullGames, playersLimit], (err, rows: PlayerTopRatingData[]) => {
              if (err) {
                this.db.run("ROLLBACK");
                return reject("Error selecting top players: " + err.message);
              }

              const stmt = this.db.prepare(insertQuery);
              rows.forEach((row, index) => {
                const playerName = playerMap.get(row.auth_id) || "GOD";
                stmt.run(index + 1, row.auth_id, playerName, Math.round(row.rating), row.games,
                         row.wins, row.goals, row.assists, row.own_goals, row.clean_sheets);
              });

              stmt.finalize((err) => {
                if (err) {
                  this.db.run("ROLLBACK");
                  return reject("Error finalizing statement: " + err.message);
                }

                this.db.run("COMMIT", (err) => {
                  if (err) reject("Error committing transaction: " + err.message);
                  else resolve();
                });
              });
            });
          });
        });
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
