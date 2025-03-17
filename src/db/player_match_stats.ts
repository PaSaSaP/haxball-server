import sqlite3 from 'sqlite3';
import { PlayerMatchStatsData, PlayerStat } from '../structs';
import { hb_log } from '../log';
import { BaseDB } from './base_db';

export class PlayerMatchStatsDB extends BaseDB {
  constructor(db: sqlite3.Database) {
    super(db);
  }

  async setupDatabase(): Promise<void> {
    await this.setupWalAndSync();
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS player_match_stats (
        auth_id TEXT PRIMARY KEY,
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
        left_server INTEGER DEFAULT 0
      );
    `;
    await this.db.run(createTableQuery, (e) => e && hb_log(`!! create player_match_stats error: ${e}`));
  }

  async loadTotalPlayerMatchStats(auth_id: string): Promise<PlayerMatchStatsData|null> {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT games, full_games, wins, full_wins, goals, assists, own_goals, playtime, clean_sheets, left_afk, left_votekick, left_server
        FROM player_match_stats
        WHERE auth_id = ?;
      `;
      this.db.get(query, [auth_id], (err, row: any) => {
        if (err) {
          reject('Error loading player match stats: ' + err.message);
        } else if (!row) {
          return null;
        } else {
          resolve(row);
        }
      });
    });
  }

  async saveTotalPlayerMatchStats(auth_id: string, stat: PlayerStat): Promise<void> {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO player_match_stats (auth_id, games, full_games, wins, full_wins, goals, assists, own_goals, playtime, clean_sheets, left_afk, left_votekick, left_server)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(auth_id) DO UPDATE SET
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
      this.db.run(query, [
        auth_id, stat.games, stat.fullGames, stat.wins, stat.fullWins,
        stat.goals, stat.assists, stat.ownGoals, stat.playtime, stat.cleanSheets,
        stat.counterAfk, stat.counterVoteKicked, stat.counterLeftServer
      ], (err) => {
        if (err) {
          reject('Error saving player match stats: ' + err.message);
        } else {
          resolve();
        }
      });
    });
  }

  async updateTotalPlayerMatchStats(auth_id: string, stat: PlayerStat, playerMatchStats: PlayerMatchStatsData): Promise<void> {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO player_match_stats (
          auth_id, games, full_games, wins, full_wins, goals, assists, own_goals,
          playtime, clean_sheets, left_afk, left_votekick, left_server
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(auth_id) DO UPDATE SET
          games = player_match_stats.games + ?,
          full_games = player_match_stats.full_games + ?,
          wins = player_match_stats.wins + ?,
          full_wins = player_match_stats.full_wins + ?,
          goals = player_match_stats.goals + ?,
          assists = player_match_stats.assists + ?,
          own_goals = player_match_stats.own_goals + ?,
          playtime = player_match_stats.playtime + ?,
          clean_sheets = player_match_stats.clean_sheets + ?,
          left_afk = player_match_stats.left_afk + ?,
          left_votekick = player_match_stats.left_votekick + ?,
          left_server = player_match_stats.left_server + ?;
      `;
  
      this.db.run(query, [
        auth_id, stat.games, stat.fullGames, stat.wins, stat.fullWins,
        stat.goals, stat.assists, stat.ownGoals, stat.playtime, stat.cleanSheets,
        stat.counterAfk, stat.counterVoteKicked, stat.counterLeftServer,

        playerMatchStats.games, playerMatchStats.full_games, playerMatchStats.wins, playerMatchStats.full_wins, 
        playerMatchStats.goals, playerMatchStats.assists, playerMatchStats.own_goals, playerMatchStats.playtime, 
        playerMatchStats.clean_sheets, playerMatchStats.left_afk, playerMatchStats.left_votekick, playerMatchStats.left_server
      ], (err) => {
        if (err) {
          reject('Error saving player match stats: ' + err.message);
        } else {
          resolve();
        }
      });
    });
  }
}
