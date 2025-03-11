import sqlite3 from 'sqlite3';
import { PlayerRatingData, PlayerStat } from '../structs';
import { hb_log } from '../log';

export class PlayerRatingsDB {
  db: sqlite3.Database;

  constructor(db: sqlite3.Database) {
    this.db = db;
  }

  setupDatabase(): void {
    // Tworzenie tabeli player_ratings, jeśli jeszcze nie istnieje
    const createPlayerRatingsTableQuery = `
      CREATE TABLE IF NOT EXISTS player_ratings (
        auth_id TEXT PRIMARY KEY,
        rating REAL NOT NULL,
        rd REAL NOT NULL,
        volatility REAL DEFAULT 0,
        total_games INTEGER DEFAULT 0,
        total_full_games INTEGER DEFAULT 0,
        won_games INTEGER DEFAULT 0,
        left_afk INTEGER DEFAULT 0,
        left_votekick INTEGER DEFAULT 0,
        left_server INTEGER DEFAULT 0
      );
    `;
    this.db.run(createPlayerRatingsTableQuery, (e) => e && hb_log(`!! create player_ratings error: ${e}`));
  }

  async loadPlayerRating(auth_id: string): Promise<PlayerRatingData> {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT auth_id, rating, rd, volatility, total_games, total_full_games, won_games, left_afk, left_votekick, left_server
        FROM player_ratings
        WHERE auth_id = ?;
      `;
      this.db.get(query, [auth_id], (err, row: any) => {
        if (err) {
          reject('Error loading player rating: ' + err.message);
        } else if (!row) {
          // Zwracamy domyślne wartości dla nowego gracza
          resolve({
            rating: {
              mu: PlayerStat.DefaultRating,
              rd: PlayerStat.DefaultRd,
              vol: PlayerStat.DefaultVol,
            },
            total_games: 0,
            total_full_games: 0,
            won_games: 0,
            left_afk: 0,
            left_votekick: 0,
            left_server: 0,
          });
        } else {
          resolve({
            rating: {
              mu: row.rating,
              rd: row.rd,
              vol: row.volatility,
            },
            total_games: row.total_games,
            total_full_games: row.total_full_games,
            won_games: row.won_games,
            left_afk: row.left_afk,
            left_votekick: row.left_votekick,
            left_server: row.left_server,
          });
        }
      });
    });
  }

  async savePlayerRating(auth_id: string, player: PlayerStat): Promise<void> {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO player_ratings (auth_id, rating, rd, volatility, total_games, total_full_games, won_games, left_afk, left_votekick, left_server)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(auth_id) DO UPDATE SET
          rating = excluded.rating,
          rd = excluded.rd,
          volatility = excluded.volatility,
          total_games = excluded.total_games,
          total_full_games = excluded.total_full_games,
          won_games = excluded.won_games,
          left_afk = excluded.left_afk,
          left_votekick = excluded.left_votekick,
          left_server = excluded.left_server;
      `;
      this.db.run(query, [
        auth_id,
        player.glickoPlayer!.getRating(),
        player.glickoPlayer!.getRd(),
        player.glickoPlayer!.getVol(), // Zakładam, że Player ma właściwość vol
        player.games,
        player.fullGames,
        player.wins,
        player.counterAfk,
        player.counterVoteKicked,
        player.counterLeftServer,
      ], (err) => {
        if (err) {
          reject('Error saving player rating: ' + err.message);
        } else {
          resolve();
        }
      });
    });
  }
}
