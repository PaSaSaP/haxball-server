import sqlite3 from 'sqlite3';
import { PlayerData, PlayerStat } from './structs';
import ChatLogger from './chat_logger';
import { PlayersDB } from './db/players';
import { PlayerNamesDB } from './db/player_names';
import { VotesDB } from './db/votes';
import { ReportsDB } from './db/reports';
import { PlayerMatchStatsDB } from './db/player_match_stats';
import { PlayerRatingsDB } from './db/player_ratings';
import { TopRatingsDB } from './db/top_ratings';
import { PlayersStateDB } from './db/players_state';
import { NetworksStateDB } from './db/networks_state';
import { RejoiceDB } from './db/rejoice';
export class DBHandler {
  playersDb: sqlite3.Database;
  otherDb: sqlite3.Database;
  vipDb: sqlite3.Database;
  players: PlayersDB;
  playerNames: PlayerNamesDB;
  votes: VotesDB;
  playerMatchStats: PlayerMatchStatsDB;
  playerState: PlayersStateDB;
  networksState: NetworksStateDB;
  reports: ReportsDB;
  ratings: PlayerRatingsDB;
  topRatings: TopRatingsDB;
  rejoice: RejoiceDB;

  constructor(playersDbFile: string, otherDbFile: string, vipDbFile: string) {
    this.playersDb = new sqlite3.Database(playersDbFile, (err) => {
      if (err) console.error('Error opening database:', err.message);
    });
    this.otherDb = new sqlite3.Database(otherDbFile, (err) => {
      if (err) console.error('Error opening database:', err.message);
    });
    this.vipDb = new sqlite3.Database(vipDbFile, (err) => {
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
    this.rejoice = new RejoiceDB(this.vipDb);

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
    this.rejoice.setupDatabase();
  }

  closeDatabases() {
    [this.playersDb, this.otherDb, this.vipDb].forEach(db => db.close((err) => {
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

  getRejoicesForPlayer(auth_id: string) {
    return this.dbHandler.rejoice.getRejoicesForPlayer(auth_id);
  }

  updateOrInsertRejoice(auth_id: string, rejoice_id: string, time_from: number, time_to: number) {
    return this.dbHandler.rejoice.updateOrInsertRejoice(auth_id, rejoice_id, time_from, time_to);
  }

  logMessage(user_name: string, action: string, text: string, for_discord: boolean) {
    return this.chatLogger.logMessage(user_name, action, text, for_discord);
  }
}