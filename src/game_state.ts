import sqlite3 from 'sqlite3';
import { PlayerData, PlayerStat, PlayerRatingData } from './structs';
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
        won_games INTEGER NOT NULL
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
        SELECT auth_id, rating, rd, volatility, total_games, total_full_games, won_games
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
              mu: PlayerStat.DefaultRating,  // Domyślne Glicko2 rating
              rd: PlayerStat.DefaultRd,   // Domyślne Glicko2 rd
              vol: PlayerStat.DefaultVol, // Domyślne Glicko2 volatility
            },
            total_games: 0,
            total_full_games: 0,
            won_games: 0,
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
          });
        }
      });
    });
  }

  async savePlayerRating(auth_id: string, player: PlayerStat): Promise<void> {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT OR REPLACE INTO player_ratings (auth_id, rating, rd, volatility, total_games, total_full_games, won_games)
        VALUES (?, ?, ?, ?, ?, ?, ?);
      `;
      this.db.run(query, [
        auth_id,
        player.glickoPlayer!.getRating(),
        player.glickoPlayer!.getRd(),
        player.glickoPlayer!.getVol(), // Zakładam, że Player ma właściwość vol
        player.totalGames,
        player.totalFullGames,
        player.wonGames
      ], (err) => {
        if (err) {
          reject('Error saving player rating: ' + err.message);
        } else {
          resolve();
        }
      });
    });
  }

  async getTop10Players(): Promise<[string, number, number][]> {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT auth_id, rating, total_full_games 
        FROM player_ratings
        WHERE total_full_games >= 10
        ORDER BY rating DESC
        LIMIT 10;
      `;
      this.db.all(query, [], (err, rows: any[]) => {
        if (err) {
          reject('Error fetching top 10 players: ' + err.message);
        } else {
          resolve(rows.map(row => [row.auth_id, row.rating, row.total_full_games]));
        }
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
  reports: ReportsDB;
  ratings: PlayerRatingsDB;

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
    this.reports = new ReportsDB(this.otherDb);
    this.ratings = new PlayerRatingsDB(this.otherDb);

    this.setupDatabases();
  }

  setupDatabases() {
    this.players.setupDatabase();
    this.playerNames.setupDatabase();
    this.votes.setupDatabase();
    this.ratings.setupDatabase();
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

  loadPlayerRating(auth_id: string) {
    return this.dbHandler.ratings.loadPlayerRating(auth_id);
  }

  savePlayerRating(auth_id: string, player: PlayerStat) {
    return this.dbHandler.ratings.savePlayerRating(auth_id, player);
  }

  getTop10Players() {
    return this.dbHandler.ratings.getTop10Players();
  }

  logMessage(user_name: string, action: string, text: string, for_discord: boolean) {
    return this.chatLogger.logMessage(user_name, action, text, for_discord);
  }
}