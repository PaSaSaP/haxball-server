import sqlite3 from 'sqlite3';
import { PlayerData, PlayerStat, PlayerRatingData, PlayerTopRatingData, PlayersGameState, NetworksGameState, PlayerMatchStatsData } from './structs';
import ChatLogger from './chat_logger';

class PlayersDB {
  db: sqlite3.Database;

  constructor(db: sqlite3.Database) {
    this.db = db;
  }
  setupDatabase() {
    // Tworzenie tabeli players, jeśli jeszcze nie istnieje
    const createPlayersTableQuery = `
      CREATE TABLE IF NOT EXISTS players (
        auth_id TEXT PRIMARY KEY,
        trusted_level INTEGER DEFAULT 0,
        trusted_by TEXT,
        admin_level INTEGER DEFAULT 0
      );
    `;

    this.db.run(createPlayersTableQuery, (err) => {
      if (err) console.error('Error creating players table:', err.message);
      else console.log('Table "players" created or already exists.');
    });
  }

  async updateAdminLevel(auth_id: string, new_admin_level: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const query = `
        UPDATE players
        SET admin_level = ?
        WHERE auth_id = ?;
      `;
      this.db.run(query, [new_admin_level, auth_id], function (err) {
        if (err) {
          reject('Error updating admin level: ' + err.message);
        } else if (this.changes === 0) {
          reject('No player found with the given auth_id');
        } else {
          resolve();
        }
      });
    });
  }

  getTrustLevel(player: PlayerData): Promise<number> {
    return new Promise((resolve, reject) => {
      const query = `SELECT trusted_level FROM players WHERE auth_id = ?`;
      this.db.get(query, [player.auth_id], (err: any, row: any) => {
        if (err) {
          reject('Error fetching trust level');
        } else {
          resolve((row?.trusted_level as number) ?? 0);
        }
      });
    });
  }

  getTrustAndAdminLevel(player: PlayerData): Promise<{ trust_level: number, admin_level: number }> {
    return new Promise((resolve, reject) => {
      const query = `SELECT trusted_level, admin_level FROM players WHERE auth_id = ?`;
      this.db.get(query, [player.auth_id], (err: any, row: any) => {
        if (err) {
          reject('Error in getTrustAndAdminLevel()');
        } else {
          resolve({
            trust_level: (row?.trusted_level as number) ?? 0,
            admin_level: (row?.admin_level as number) ?? 0
          });
        }
      });
    });
  }

  setTrustLevel(player: PlayerData, trust_level: number, by_player: PlayerData) {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO players (auth_id, trusted_level, trusted_by) 
        VALUES (?, ?, ?) 
        ON CONFLICT(auth_id) 
        DO UPDATE SET trusted_level = excluded.trusted_level, 
                      trusted_by = excluded.trusted_by;
      `;

      this.db.run(query, [player.auth_id, trust_level, by_player.auth_id], function (err: any) {
        if (err) {
          reject('Error setting trust level: ' + err.message);
        } else {
          resolve(true);
        }
      });
    });
  }
}

export class PlayerNamesDB {
  db: sqlite3.Database;

  constructor(db: sqlite3.Database) {
    this.db = db;
  }

  setupDatabase() {
    // Tworzenie tabeli player_names, jeśli jeszcze nie istnieje
    const createPlayerNamesTableQuery = `
        CREATE TABLE IF NOT EXISTS player_names (
          auth_id TEXT,
          name TEXT,
          PRIMARY KEY (auth_id, name)
        );
      `;
    this.db.run(createPlayerNamesTableQuery, (err) => {
      if (err) console.error('Error creating player_names table:', err.message);
      else console.log('Table "player_names" created or already exists.');
    });
  }


  async insertPlayerName(auth_id: string, name: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const query = `
          INSERT OR IGNORE INTO player_names (auth_id, name) 
          VALUES (?, ?);
        `;
      this.db.run(query, [auth_id, name], (err) => {
        if (err) {
          reject('Error inserting player name: ' + err.message);
        } else {
          resolve();
        }
      });
    });
  }

  async getLastPlayerNames(auth_id: string, n = 5): Promise<string[]> {
    return new Promise((resolve, reject) => {
      const query = `
          SELECT name
          FROM player_names
          WHERE auth_id = ?
          ORDER BY ROWID DESC
          LIMIT ?;
        `;

      this.db.all(query, [auth_id, n], (err, rows: any[]) => {
        if (err) {
          reject('Error fetching last player names: ' + err.message);
        } else {
          const names = rows.map(row => row.name);
          resolve(names);
        }
      });
    });
  }

  async getAllPlayerNames(): Promise<Map<string, string>> {
    return new Promise((resolve, reject) => {
      const query = `
          SELECT auth_id, name
          FROM player_names
          WHERE ROWID IN (
            SELECT MAX(ROWID) 
            FROM player_names 
            GROUP BY auth_id
          );
        `;

      this.db.all(query, [], (err, rows: any[]) => {
        if (err) {
          reject('Error fetching all player names: ' + err.message);
        } else {
          const result = new Map<string, string>();
          for (const row of rows) {
            result.set(row.auth_id, row.name);
          }
          resolve(result);
        }
      });
    });
  }
}

class VotesDB {
  db: sqlite3.Database;

  constructor(db: sqlite3.Database) {
    this.db = db;
  }

  setupDatabase() {
    // Nowa tabela votes
    const createVotesTableQuery = `
        CREATE TABLE IF NOT EXISTS votes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          voter_auth_id TEXT,
          target_auth_id TEXT,
          vote_type TEXT, -- "up" lub "down"
          UNIQUE(voter_auth_id, target_auth_id)
        );
      `;

    this.db.run(createVotesTableQuery, (err) => {
      if (err) console.error('Error creating votes table:', err.message);
      else console.log('Table "votes" created or already exists.');
    });
  }

  // Dodanie głosu (up lub down)
  vote(voter_auth_id: string, target_auth_id: string, vote_type: 'up' | 'down') {
    const upsertQuery = `
                  INSERT INTO votes (voter_auth_id, target_auth_id, vote_type)
                  VALUES (?, ?, ?)
                  ON CONFLICT(voter_auth_id, target_auth_id)
                  DO UPDATE SET vote_type = excluded.vote_type;
              `;
    this.db.run(upsertQuery, [voter_auth_id, target_auth_id, vote_type], (err) => {
      if (err) {
        console.error('Error adding/updating vote:', err.message);
      }
    });
  }

  // Usunięcie głosu
  removeVote(voter_auth_id: string, target_auth_id: string) {
    const deleteQuery = `
                  DELETE FROM votes
                  WHERE voter_auth_id = ? AND target_auth_id = ?;
              `;
    this.db.run(deleteQuery, [voter_auth_id, target_auth_id], (err) => {
      if (err) {
        console.error('Error removing vote:', err.message);
      }
    });
  }

  // Policz reputację gracza
  getPlayerReputationSync(target_auth_id: string, callback: (reputation: number) => void) {
    const query = `
                  SELECT 
                      SUM(CASE WHEN vote_type = 'up' THEN 1 ELSE 0 END) as upvotes,
                      SUM(CASE WHEN vote_type = 'down' THEN 1 ELSE 0 END) as downvotes
                  FROM votes
                  WHERE target_auth_id = ?;
              `;
    this.db.get(query, [target_auth_id], (err, row: any) => {
      if (err) {
        console.error('Error calculating reputation:', err.message);
        callback(0);
      } else {
        const upvotes = row.upvotes || 0;
        const downvotes = row.downvotes || 0;
        const reputation = upvotes - downvotes;
        callback(reputation);
      }
    });
  }

  async getPlayerReputation(target_auth_id: string): Promise<{ upvotes: number; downvotes: number }> {
    return new Promise((resolve, reject) => {
      const query = `
                    SELECT 
                        SUM(CASE WHEN vote_type = 'up' THEN 1 ELSE 0 END) as upvotes,
                        SUM(CASE WHEN vote_type = 'down' THEN 1 ELSE 0 END) as downvotes
                    FROM votes
                    WHERE target_auth_id = ?;
                `;
      this.db.get(query, [target_auth_id], (err, row: any) => {
        if (err) {
          console.error('Error calculating reputation:', err.message);
          reject(err);
        } else {
          const upvotes = row.upvotes || 0;
          const downvotes = row.downvotes || 0;
          resolve({ upvotes, downvotes });
        }
      });
    });
  }
}



class ReportsDB {
  db: sqlite3.Database;

  constructor(db: sqlite3.Database) {
    this.db = db;
  }

  setupDatabase() {
    // Tworzenie tabeli reports, jeśli jeszcze nie istnieje
    const createReportsTableQuery = `
        CREATE TABLE IF NOT EXISTS reports (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          player_name TEXT,
          auth_id TEXT,
          report TEXT,
          at TEXT
        );
      `;
    this.db.run(createReportsTableQuery, (err) => {
      if (err) console.error('Error creating reports table:', err.message);
      else console.log('Table "reports" created or already exists.');

    });
  }

  addReport(player_name: string, auth_id: string, report: string) {
    const at = new Date().toISOString(); // Czas raportu w formacie ISO
    const insertReportQuery = `
              INSERT INTO reports (player_name, auth_id, report, at)
              VALUES (?, ?, ?, ?);
          `;

    this.db.run(insertReportQuery, [player_name, auth_id, report, at], function (err) {
      if (err) {
        console.error('Error inserting report:', err.message);
      }
    });
  }
}

export class PlayerMatchStatsDB {
  db: sqlite3.Database;

  constructor(db: sqlite3.Database) {
    this.db = db;
  }

  setupDatabase(): void {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS player_match_stats (
        auth_id TEXT PRIMARY KEY,
        games INTEGER NOT NULL DEFAULT 0,
        full_games INTEGER NOT NULL DEFAULT 0,
        wins INTEGER NOT NULL DEFAULT 0,
        full_wins INTEGER NOT NULL DEFAULT 0,
        goals INTEGER NOT NULL DEFAULT 0,
        assists INTEGER NOT NULL DEFAULT 0,
        own_goals INTEGER NOT NULL DEFAULT 0,
        playtime INTEGER NOT NULL DEFAULT 0,
        clean_sheets INTEGER NOT NULL DEFAULT 0,
        left_afk INTEGER NOT NULL DEFAULT 0,
        left_votekick INTEGER NOT NULL DEFAULT 0,
        left_server INTEGER NOT NULL DEFAULT 0
      );
    `;
    this.db.run(createTableQuery, (err) => {
      if (err) console.error('Error creating player_match_stats table:', err.message);
      else console.log('Table "player_match_stats" created or already exists.');
    });
  }

  async loadPlayerMatchStats(auth_id: string): Promise<PlayerMatchStatsData> {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT games, full_games, wins, full_wins, goals, assists, own_goals, playtime, clean_sheets, left_afk, left_votekick, left_server
        FROM player_match_stats
        WHERE auth_id = ?;
      `;
      this.db.get(query, [auth_id], (err, row: any) => {
        if (err) {
          reject('Error loading player match stats: ' + err.message);
        } else {
          resolve(row || {
            games: 0, full_games: 0, wins: 0, full_wins: 0, goals: 0, assists: 0, own_goals: 0,
            playtime: 0, clean_sheets: 0, left_afk: 0, left_votekick: 0, left_server: 0
          });
        }
      });
    });
  }

  async savePlayerMatchStats(auth_id: string, stat: PlayerStat): Promise<void> {
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
}

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
        volatility REAL NOT NULL,
        total_games INTEGER NOT NULL,
        total_full_games INTEGER NOT NULL,
        won_games INTEGER NOT NULL,
        left_afk INTEGER NOT NULL DEFAULT 0,
        left_votekick INTEGER NOT NULL DEFAULT 0,
        left_server INTEGER NOT NULL DEFAULT 0
      );
    `;
    this.db.run(createPlayerRatingsTableQuery, (err) => {
      if (err) console.error('Error creating player_ratings table:', err.message);
      else console.log('Table "player_ratings" created or already exists.');
    });
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

export class TopRatingsDB {
  db: sqlite3.Database;

  constructor(db: sqlite3.Database) {
    this.db = db;
  }

  setupDatabase(): void {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS top_ratings (
        rank INTEGER PRIMARY KEY,
        auth_id TEXT NOT NULL,
        player_name TEXT NOT NULL,
        rating INTEGER NOT NULL,
        total_full_games INTEGER NOT NULL
      );
    `;
    this.db.run(createTableQuery, (err) => {
      if (err) console.error('Error creating top_ratings table:', err.message);
      else console.log('Table "top_ratings" created or already exists.');
    });
  }

  async updateTopRatings(playerMap: Map<string, string>): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        this.db.run("BEGIN TRANSACTION");
  
        this.db.run("DELETE FROM top_ratings", (err) => {
          if (err) {
            this.db.run("ROLLBACK");
            return reject("Error deleting from top_ratings: " + err.message);
          }
  
          const insertQuery = `
            INSERT INTO top_ratings (rank, auth_id, player_name, rating, total_full_games)
            VALUES (?, ?, ?, ?, ?)
          `;
  
          const selectQuery = `
            SELECT auth_id, rating, total_full_games 
            FROM player_ratings 
            WHERE total_full_games >= 10 
            ORDER BY rating DESC 
            LIMIT 100;
          `;
  
          this.db.all(selectQuery, [], (err, rows) => {
            if (err) {
              this.db.run("ROLLBACK");
              return reject("Error selecting top players: " + err.message);
            }
  
            if (!Array.isArray(rows)) {
              this.db.run("ROLLBACK");
              return reject("Unexpected data format from database");
            }
  
            const stmt = this.db.prepare(insertQuery);
            rows.forEach((row, index) => {
              const playerData = row as PlayerTopRatingData;
              const playerName = playerMap.get(playerData.auth_id) || "GOD";
              stmt.run(index + 1, playerData.auth_id, playerName, Math.round(playerData.rating), playerData.total_full_games);
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
  }

  async getTopNPlayers(n: number): Promise<PlayerTopRatingData[]> {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT rank, auth_id, player_name, rating, total_full_games 
        FROM top_ratings 
        ORDER BY rank ASC 
        LIMIT ?;
      `;
  
      this.db.all(query, [n], (err, rows) => {
        if (err) {
          return reject("Error fetching top players: " + err.message);
        }
  
        if (!Array.isArray(rows)) {
          return reject("Unexpected data format from database");
        }
  
        resolve(rows as PlayerTopRatingData[]);
      });
    });
  }
}

export class PlayersStateDB {
  db: sqlite3.Database;

  constructor(db: sqlite3.Database) {
    this.db = db;
  }

  setupDatabase(): void {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS players_state (
        auth_id TEXT PRIMARY KEY,
        muted_to INTEGER NOT NULL DEFAULT 0,
        kicked_to INTEGER NOT NULL DEFAULT 0
      );
    `;

    this.db.run(createTableQuery, (err) => {
      if (err) console.error('Error creating players_state table:', err.message);
      else console.log('Table "players_state" created or already exists.');
    });
  }

  async getAllPlayersGameState(): Promise<Map<string, PlayersGameState>> {
    return new Promise((resolve, reject) => {
      const query = `SELECT auth_id, muted_to, kicked_to FROM players_state;`;

      this.db.all(query, [], (err: any, rows: (PlayersGameState & { auth_id: string })[]) => {
        if (err) {
          return reject('Error fetching player states: ' + err.message);
        }

        if (!Array.isArray(rows)) {
          return reject('Unexpected data format from database');
        }

        const playersMap = new Map<string, PlayersGameState>();
        rows.forEach((row) => {
          playersMap.set(row.auth_id, {
            muted_to: row.muted_to,
            kicked_to: row.kicked_to
          });
        });

        resolve(playersMap);
      });
    });
  }

  async updateOrInsertPlayerStateKicked(auth_id: string, kicked_to: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO players_state (auth_id, kicked_to)
        VALUES (?, ?)
        ON CONFLICT(auth_id) DO UPDATE SET kicked_to = excluded.kicked_to;
      `;

      this.db.run(query, [auth_id, kicked_to], (err) => {
        if (err) return reject('Error updating kicked_to: ' + err.message);
        resolve();
      });
    });
  }

  async updateOrInsertPlayerStateMuted(auth_id: string, muted_to: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO players_state (auth_id, muted_to)
        VALUES (?, ?)
        ON CONFLICT(auth_id) DO UPDATE SET muted_to = excluded.muted_to;
      `;

      this.db.run(query, [auth_id, muted_to], (err) => {
        if (err) return reject('Error updating muted_to: ' + err.message);
        resolve();
      });
    });
  }
}

export class NetworksStateDB {
  db: sqlite3.Database;

  constructor(db: sqlite3.Database) {
    this.db = db;
  }

  setupDatabase(): void {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS networks_state (
        conn_id TEXT PRIMARY KEY,
        muted_to INTEGER NOT NULL DEFAULT 0,
        kicked_to INTEGER NOT NULL DEFAULT 0
      );
    `;

    this.db.run(createTableQuery, (err) => {
      if (err) console.error('Error creating networks_state table:', err.message);
      else console.log('Table "networks_state" created or already exists.');
    });
  }

  async getAllNetworksGameState(): Promise<Map<string, NetworksGameState>> {
    return new Promise((resolve, reject) => {
      const query = `SELECT conn_id, muted_to, kicked_to FROM networks_state;`;

      this.db.all(query, [], (err: any, rows: (NetworksGameState & { conn_id: string })[]) => {
        if (err) {
          return reject('Error fetching networks states: ' + err.message);
        }

        if (!Array.isArray(rows)) {
          return reject('Unexpected data format from database');
        }

        const networksMap = new Map<string, NetworksGameState>();
        rows.forEach((row) => {
          networksMap.set(row.conn_id, {
            muted_to: row.muted_to,
            kicked_to: row.kicked_to
          });
        });

        resolve(networksMap);
      });
    });
  }

  async updateOrInsertNetworkStateKicked(conn_id: string, kicked_to: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO networks_state (conn_id, kicked_to)
        VALUES (?, ?)
        ON CONFLICT(conn_id) DO UPDATE SET kicked_to = excluded.kicked_to;
      `;
  
      this.db.run(query, [conn_id, kicked_to, conn_id], (err) => {
        if (err) return reject('Error updating kicked_to: ' + err.message);
        resolve();
      });
    });
  }

  async updateOrInsertNetworkStateMuted(conn_id: string, muted_to: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO networks_state (conn_id, muted_to)
        VALUES (?, ?)
        ON CONFLICT(conn_id) DO UPDATE SET muted_to = excluded.muted_to;
      `;
  
      this.db.run(query, [conn_id, muted_to, conn_id], (err) => {
        if (err) return reject('Error updating muted_to: ' + err.message);
        resolve();
      });
    });
  }
}

export class DBHandler {
  playersDb: sqlite3.Database;
  otherDb: sqlite3.Database;
  players: PlayersDB;
  playerNames: PlayerNamesDB;
  votes: VotesDB;
  playerMatchStats: PlayerMatchStatsDB;
  playerState: PlayersStateDB;
  networksState: NetworksStateDB;
  reports: ReportsDB;
  ratings: PlayerRatingsDB;
  topRatings: TopRatingsDB;

  constructor(playersDbFile: string, otherDbFile: string) {
    this.playersDb = new sqlite3.Database(playersDbFile, (err) => {
      if (err) console.error('Error opening database:', err.message);
    });
    this.otherDb = new sqlite3.Database(otherDbFile, (err) => {
      if (err) console.error('Error opening database:', err.message);
    });

    // main players database
    this.players = new PlayersDB(this.playersDb);
    this.playerNames = new PlayerNamesDB(this.playersDb);
    this.votes = new VotesDB(this.playersDb);
    // and second table
    this.playerMatchStats = new PlayerMatchStatsDB(this.otherDb);
    this.playerState = new PlayersStateDB(this.otherDb);
    this.networksState = new NetworksStateDB(this.otherDb);
    this.reports = new ReportsDB(this.otherDb);
    this.ratings = new PlayerRatingsDB(this.otherDb);
    this.topRatings = new TopRatingsDB(this.otherDb);

    this.setupDatabases();
  }

  setupDatabases() {
    this.players.setupDatabase();
    this.playerNames.setupDatabase();
    this.votes.setupDatabase();
    this.playerMatchStats.setupDatabase();
    this.playerState.setupDatabase();
    this.networksState.setupDatabase();
    this.reports.setupDatabase();
    this.ratings.setupDatabase();
    this.topRatings.setupDatabase();
  }

  closeDatabases() {
    [this.playersDb, this.otherDb].forEach(db => db.close((err) => {
      if (err) {
        console.error('Error closing database:', err.message);
      }
    }));
  }
}

export class GameState {
  dbHandler: DBHandler;
  chatLogger: ChatLogger;
  constructor(dbHandler: DBHandler, chatLogger: ChatLogger) {
    this.dbHandler = dbHandler;
    this.chatLogger = chatLogger;
  }

  getTrustAndAdminLevel(player: PlayerData) {
    return this.dbHandler.players.getTrustAndAdminLevel(player);
  }

  setTrustLevel(player: PlayerData, trust_level: number, by_player: PlayerData) {
    return this.dbHandler.players.setTrustLevel(player, trust_level, by_player);
  }

  insertPlayerName(auth_id: string, name: string) {
    return this.dbHandler.playerNames.insertPlayerName(auth_id, name);
  }

  getPlayerNames(auth_id: string, n: number = 5): Promise<string[]> {
    return this.dbHandler.playerNames.getLastPlayerNames(auth_id, n);
  }

  getAllPlayerNames() {
    return this.dbHandler.playerNames.getAllPlayerNames();
  }

  addReport(player_name: string, auth_id: string, report: string) {
    return this.dbHandler.reports.addReport(player_name, auth_id, report);
  }

  voteUp(voter_auth_id: string, target_auth_id: string) {
    return this.dbHandler.votes.vote(voter_auth_id, target_auth_id, "up");
  }

  voteDown(voter_auth_id: string, target_auth_id: string) {
    return this.dbHandler.votes.vote(voter_auth_id, target_auth_id, "down");
  }

  removeVote(voter_auth_id: string, target_auth_id: string) {
    return this.dbHandler.votes.removeVote(voter_auth_id, target_auth_id);
  }

  getPlayerVotes(auth_id: string) {
    return this.dbHandler.votes.getPlayerReputation(auth_id);
  }

  loadPlayerMatchStats(auth_id: string) {
    return this.dbHandler.playerMatchStats.loadPlayerMatchStats(auth_id);
  }

  savePlayerMatchStats(auth_id: string, stat: PlayerStat) {
    return this.dbHandler.playerMatchStats.savePlayerMatchStats(auth_id, stat);
  }

  loadPlayerRating(auth_id: string) {
    return this.dbHandler.ratings.loadPlayerRating(auth_id);
  }

  savePlayerRating(auth_id: string, player: PlayerStat) {
    return this.dbHandler.ratings.savePlayerRating(auth_id, player);
  }

  updateTopRatings(playerMap: Map<string, string>) {
    return this.dbHandler.topRatings.updateTopRatings(playerMap);
  }

  getTop10Players() {
    return this.dbHandler.topRatings.getTopNPlayers(10);
  }

  getAllPlayersGameState() {
    return this.dbHandler.playerState.getAllPlayersGameState();
  }

  updateOrInsertPlayerStateKicked(auth_id: string, kicked_to: number) {
    return this.dbHandler.playerState.updateOrInsertPlayerStateKicked(auth_id, kicked_to);
  }

  updateOrInsertPlayerStateMuted(auth_id: string, muted_to: number) {
    return this.dbHandler.playerState.updateOrInsertPlayerStateMuted(auth_id, muted_to);
  }

  getAllNetworksGameState() {
    return this.dbHandler.networksState.getAllNetworksGameState();
  }

  updateOrInsertNetworkStateKicked(conn_id: string, kicked_to: number) {
    return this.dbHandler.networksState.updateOrInsertNetworkStateKicked(conn_id, kicked_to);
  }

  updateOrInsertNetworkStateMuted(conn_id: string, muted_to: number) {
    return this.dbHandler.networksState.updateOrInsertNetworkStateMuted(conn_id, muted_to);
  }

  logMessage(user_name: string, action: string, text: string, for_discord: boolean) {
    return this.chatLogger.logMessage(user_name, action, text, for_discord);
  }
}