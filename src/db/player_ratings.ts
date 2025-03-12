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
        rating REAL DEFAULT 1500,
        rd REAL DEFAULT 150,
        volatility REAL DEFAULT 0.02
      );
    `;
    this.db.run(createPlayerRatingsTableQuery, (e) => e && hb_log(`!! create player_ratings error: ${e}`));
  }

  async loadPlayerRating(auth_id: string): Promise<PlayerRatingData> {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT auth_id, rating, rd, volatility
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
          });
        } else {
          resolve({
            rating: {
              mu: row.rating,
              rd: row.rd,
              vol: row.volatility,
            },
          });
        }
      });
    });
  }

  async savePlayerRating(auth_id: string, player: PlayerStat): Promise<void> {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO player_ratings (auth_id, rating, rd, volatility)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(auth_id) DO UPDATE SET
          rating = excluded.rating,
          rd = excluded.rd,
          volatility = excluded.volatility;
      `;
      this.db.run(query, [
        auth_id,
        player.glickoPlayer!.getRating(),
        player.glickoPlayer!.getRd(),
        player.glickoPlayer!.getVol(),
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
