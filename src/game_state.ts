import sqlite3 from 'sqlite3';
import { PlayerData, PlayerStat, Match, PlayerMatchStatsData } from './structs';
import ChatLogger from './chat_logger';
import { PlayersDB } from './db/players';
import { PlayerNamesDB } from './db/player_names';
import { VotesDB } from './db/votes';
import { ReportsDB } from './db/reports';
import { PlayerMatchStatsDB } from './db/player_match_stats';
import { MatchesDB } from './db/matches';
import { MatchStatsDB } from './db/match_stats';
import { PlayerRatingsDB } from './db/player_ratings';
import { TopRatingsDB } from './db/top_ratings';
import { PlayersStateDB } from './db/players_state';
import { NetworksStateDB } from './db/networks_state';
import { RejoiceDB } from './db/rejoice';
import { RejoiceTransactionsDB } from './db/rejoice_transactions';
import { RejoicePricesDB } from './db/rejoice_prices';
import { PaymentsDB } from './db/payments';
import { PaymentLinksDB } from './db/payment_links';
import { PaymentLinksWatcher } from './db/payment_links_watcher';
import { TopRatingsDailyDB, TopRatingsWeeklyDB } from './db/top_day_ratings';

export class DBHandler {
  playersDb: sqlite3.Database;
  otherDb: sqlite3.Database;
  vipDb: sqlite3.Database;
  players: PlayersDB;
  playerNames: PlayerNamesDB;
  votes: VotesDB;
  playerMatchStats: PlayerMatchStatsDB; // all accumulated player stats
  matches: MatchesDB;
  matchStats: MatchStatsDB;
  playerState: PlayersStateDB;
  networksState: NetworksStateDB;
  reports: ReportsDB;
  ratings: PlayerRatingsDB;
  topRatings: TopRatingsDB;
  topRatingsDaily: TopRatingsDailyDB;
  topRatingsWeekly: TopRatingsWeeklyDB;


  rejoice: RejoiceDB;
  rejoiceTransactions: RejoiceTransactionsDB;
  rejoicePrices: RejoicePricesDB;
  payments: PaymentsDB;
  paymentLinks: PaymentLinksDB;
  paymentLinksWatcher: PaymentLinksWatcher;

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
    this.matches = new MatchesDB(this.otherDb);
    this.matchStats = new MatchStatsDB(this.otherDb);
    this.playerState = new PlayersStateDB(this.otherDb);
    this.networksState = new NetworksStateDB(this.otherDb);
    this.reports = new ReportsDB(this.otherDb);
    this.ratings = new PlayerRatingsDB(this.otherDb);
    this.topRatings = new TopRatingsDB(this.otherDb);
    this.topRatingsDaily = new TopRatingsDailyDB(this.otherDb);
    this.topRatingsWeekly = new TopRatingsWeeklyDB(this.otherDb);
    // and VIP table
    this.rejoice = new RejoiceDB(this.vipDb);
    this.rejoiceTransactions = new RejoiceTransactionsDB(this.vipDb);
    this.rejoicePrices = new RejoicePricesDB(this.vipDb);
    this.payments = new PaymentsDB(this.vipDb);
    this.paymentLinks = new PaymentLinksDB(this.vipDb);
    this.paymentLinksWatcher = new PaymentLinksWatcher(this.vipDb);

    this.setupDatabases();
  }

  setupDatabases() {
    this.players.setupDatabase();
    this.playerNames.setupDatabase();
    this.votes.setupDatabase();

    this.playerMatchStats.setupDatabase();
    this.matches.setupDatabase();
    this.matchStats.setupDatabase();
    this.playerState.setupDatabase();
    this.networksState.setupDatabase();
    this.reports.setupDatabase();
    this.ratings.setupDatabase();
    this.topRatings.setupDatabase();
    this.topRatingsDaily.setupDatabase();
    this.topRatingsWeekly.setupDatabase();

    this.rejoice.setupDatabase();
    this.rejoiceTransactions.setupDatabase();
    this.rejoicePrices.setupDatabase();
    this.payments.setupDatabase();
    this.paymentLinks.setupDatabase();
    this.paymentLinksWatcher.setupDatabase();
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

  insertNewMatch(match: Match, fullTimeMatchPlayed: boolean) {
    return this.dbHandler.matches.insertNewMatch(match, fullTimeMatchPlayed);
  }
  
  insertNewMatchPlayerStats(match_id: number, auth_id: string, team_id: 0 | 1 | 2, stat: PlayerMatchStatsData) {
    return this.dbHandler.matchStats.insertNewMatchPlayerStats(match_id, auth_id, team_id, stat);
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

  getTop10PlayersShort() {
    return this.dbHandler.topRatings.getTopNPlayersShort(10);
  }

  getTop10Players() {
    return this.dbHandler.topRatings.getTopNPlayers(10);
  }

  getDailyTop10Players() {
    return this.dbHandler.topRatingsDaily.getTopNPlayers(10);
  }

  getDailyTop10PlayersShort() {
    return this.dbHandler.topRatingsDaily.getTopNPlayersShort(10);
  }

  getWeeklyTop10Players() {
    return this.dbHandler.topRatingsWeekly.getTopNPlayers(10);
  }

  getWeeklyTop10PlayersShort() {
    return this.dbHandler.topRatingsWeekly.getTopNPlayersShort(10);
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

  insertRejoiceTransaction(auth_id: string, rejoice_id: string, at_time: number, for_days: number) {
    return this.dbHandler.rejoiceTransactions.insertRejoiceTransaction(auth_id, rejoice_id, at_time, for_days);
  }

  getPaymentLink(auth_id: string, transaction_id: number) {
    return this.dbHandler.paymentLinks.getPaymentLink(auth_id, transaction_id);
  }

  getRejoicePrices() {
    return this.dbHandler.rejoicePrices.getRejoicePrices();
  }

  logMessage(user_name: string, action: string, text: string, for_discord: boolean) {
    return this.chatLogger.logMessage(user_name, action, text, for_discord);
  }

  setPaymentsLinkCallbackAndStart(callback: (auth_id: string, transaction_id: number) => void, intervalMs: number = 5000) {
    this.dbHandler.paymentLinksWatcher.setCallback(callback);
    this.dbHandler.paymentLinksWatcher.startWatching(intervalMs);
  }
}
