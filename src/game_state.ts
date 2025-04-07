import sqlite3 from 'sqlite3';
import { PlayerData, PlayerStat, Match, PlayerMatchStatsData, PlayerRatingData, GameModeType } from './structs';
import ChatLogger from './chat_logger';
import { PlayersDB } from './db/players';
import { PlayerNamesDB } from './db/player_names';
import { VotesDB } from './db/votes';
import { ReportsDB } from './db/reports';
import { PlayerMatchStatsDB } from './db/player_match_stats';
import { MatchesDB } from './db/matches';
import { MatchStatsDB } from './db/match_stats';
import { MatchRankChangesDB, MatchRankChangesEntry } from './db/match_rank_changes';
import { PlayerRatingsDB } from './db/player_ratings';
import { TopRatingsDB } from './db/top_ratings';
import { PlayersStateDB } from './db/players_state';
import { NetworksStateDB } from './db/networks_state';
import { RejoiceDB } from './db/rejoice';
import { RejoiceTransactionsDB } from './db/rejoice_transactions';
import { RejoicePricesDB } from './db/rejoice_prices';
import { VipOptionsDB } from './db/vip_options';
import { VipTransactionsDB } from './db/vip_transactions';
import { VipOptionsPricesDB } from './db/vip_options_prices';
import { PaymentsDB } from './db/payments';
import { PaymentLinksDB } from './db/payment_links';
import { PaymentLinksWatcher } from './db/payment_links_watcher';
import { TopRatingsDailyDB, TopRatingsWeeklyDB } from './db/top_day_ratings';
import { PenaltyCounterDB } from './db/penalty_saver';
import { ProbableBotsDB } from './db/probable_bots';
import { DiscordAuthLinksDB } from './db/discord_auth_links';
import { DiscordUsersDB } from './db/discord_users';
import { hb_log } from './log';
import { OtherDbFiles } from './config';


interface DBHandlerOtherType {
  db: sqlite3.Database;
  totalPlayerMatchStats: PlayerMatchStatsDB; // all accumulated player stats
  matches: MatchesDB;
  matchStats: MatchStatsDB;
  matchRankChanges: MatchRankChangesDB;
  playerState: PlayersStateDB;
  networksState: NetworksStateDB;
  reports: ReportsDB;
  ratings: PlayerRatingsDB;
  penaltyCounter: PenaltyCounterDB;
  topRatings: TopRatingsDB;
  topRatingsDaily: TopRatingsDailyDB;
  topRatingsWeekly: TopRatingsWeeklyDB;
}

export class DBHandler {
  static GameModes: GameModeType[] = ['freestyle', '1vs1', '2vs2', '3vs3', '4vs4', 'volleyball', 'tennis'];
  mainMode: GameModeType;
  playersDb: sqlite3.Database;
  otherDb: {
    'freestyle': DBHandlerOtherType | null,
    '1vs1': DBHandlerOtherType | null,
    '2vs2': DBHandlerOtherType | null,
    '3vs3': DBHandlerOtherType | null,
    '4vs4': DBHandlerOtherType | null,
    'volleyball': DBHandlerOtherType | null,
    'tennis': DBHandlerOtherType | null,
  };
  vipDb: sqlite3.Database;
  players: PlayersDB;
  playerNames: PlayerNamesDB;
  votes: VotesDB;
  probableBots: ProbableBotsDB;
  discordAuthLinks: DiscordAuthLinksDB;
  discordUsers: DiscordUsersDB;

  playerState: PlayersStateDB;
  networksState: NetworksStateDB;
  reports: ReportsDB;
  penaltyCounter: PenaltyCounterDB;
  topRatings: TopRatingsDB;
  topRatingsDaily: TopRatingsDailyDB;
  topRatingsWeekly: TopRatingsWeeklyDB;

  rejoice: RejoiceDB;
  rejoiceTransactions: RejoiceTransactionsDB;
  rejoicePrices: RejoicePricesDB;
  vipOptions: VipOptionsDB;
  vipTransactions: VipTransactionsDB;
  vipPrices: VipOptionsPricesDB;
  payments: PaymentsDB;
  paymentLinks: PaymentLinksDB;
  paymentLinksWatcher: PaymentLinksWatcher;


  constructor(mainMode: GameModeType, playersDbFile: string, otherDbFiles: OtherDbFiles, vipDbFile: string) {
    this.mainMode = mainMode;
    this.playersDb = new sqlite3.Database(playersDbFile, (err) => {
      if (err) console.error('Error opening database:', err.message);
    });
    this.vipDb = new sqlite3.Database(vipDbFile, (err) => {
      if (err) console.error('Error opening database:', err.message);
    });

    // main players database
    this.players = new PlayersDB(this.playersDb);
    this.playerNames = new PlayerNamesDB(this.playersDb);
    this.votes = new VotesDB(this.playersDb);
    this.probableBots = new ProbableBotsDB(this.playersDb);
    this.discordAuthLinks = new DiscordAuthLinksDB(this.playersDb);
    this.discordUsers = new DiscordUsersDB(this.playersDb);
    // and second table
    this.otherDb = { 'freestyle': null, '1vs1': null, '2vs2': null, '3vs3': null, '4vs4': null, 'volleyball': null, 'tennis': null };
    for (let selector of DBHandler.GameModes) {
      if (!otherDbFiles[selector] || !otherDbFiles[selector].length) continue;
      this.otherDb[selector] = this.createOtherDb(otherDbFiles[selector]);
    }
    this.playerState = this.otherDb[this.mainMode]!.playerState;
    this.networksState = this.otherDb[this.mainMode]!.networksState;
    this.reports = this.otherDb[this.mainMode]!.reports;
    this.penaltyCounter = this.otherDb[this.mainMode]!.penaltyCounter;
    this.topRatings = this.otherDb[this.mainMode]!.topRatings;
    this.topRatingsDaily = this.otherDb[this.mainMode]!.topRatingsDaily;
    this.topRatingsWeekly = this.otherDb[this.mainMode]!.topRatingsWeekly;
    // and VIP table
    this.rejoice = new RejoiceDB(this.vipDb);
    this.rejoiceTransactions = new RejoiceTransactionsDB(this.vipDb);
    this.rejoicePrices = new RejoicePricesDB(this.vipDb);
    this.vipOptions = new VipOptionsDB(this.vipDb);
    this.vipTransactions = new VipTransactionsDB(this.vipDb);
    this.vipPrices = new VipOptionsPricesDB(this.vipDb);
    this.payments = new PaymentsDB(this.vipDb);
    this.paymentLinks = new PaymentLinksDB(this.vipDb);
    this.paymentLinksWatcher = new PaymentLinksWatcher(this.vipDb);

  }

  async setup() {
    await this.setupDatabases().then(() => {
      hb_log(`Databases in game_state ready to use!`);
    })
  }

  private createOtherDb(filename: string): DBHandlerOtherType {
    console.log(`create other db for ${filename}`);
   let otherDb = new sqlite3.Database(filename, (err) => {
      if (err) console.error('Error opening database:', err.message);
    });
    let totalPlayerMatchStats = new PlayerMatchStatsDB(otherDb);
    let matches = new MatchesDB(otherDb);
    let matchStats = new MatchStatsDB(otherDb);
    let matchRankChanges = new MatchRankChangesDB(otherDb);
    let playerState = new PlayersStateDB(otherDb);
    let networksState = new NetworksStateDB(otherDb);
    let reports = new ReportsDB(otherDb);
    let penaltyCounter = new PenaltyCounterDB(otherDb);
    let ratings = new PlayerRatingsDB(otherDb);
    let topRatings = new TopRatingsDB(otherDb);
    let topRatingsDaily = new TopRatingsDailyDB(otherDb);
    let topRatingsWeekly = new TopRatingsWeeklyDB(otherDb);
    return {
      db: otherDb,
      totalPlayerMatchStats: totalPlayerMatchStats,
      matches: matches,
      matchStats: matchStats,
      matchRankChanges: matchRankChanges,
      playerState: playerState,
      networksState: networksState,
      reports: reports,
      penaltyCounter: penaltyCounter,
      ratings: ratings,
      topRatings: topRatings,
      topRatingsDaily: topRatingsDaily,
      topRatingsWeekly: topRatingsWeekly,
    };
  }

  isValidSelector(selector: GameModeType) {
    return this.otherDb[selector] !== null;
  }

  getTotalPlayerMatchStats(selector: GameModeType) {
    return this.otherDb[selector]!.totalPlayerMatchStats;
  }
  getMatches(selector: GameModeType) {
    return this.otherDb[selector]!.matches;
  }
  getMatchStats(selector: GameModeType) {
    return this.otherDb[selector]!.matchStats;
  }
  getMatchRankChanges(selector: GameModeType) {
    return this.otherDb[selector]!.matchRankChanges;
  }
  getRatings(selector: GameModeType) {
    return this.otherDb[selector]!.ratings;
  }
  // getTopRatings(selector: GameModeType) {
  //   return this.otherDb[selector]!.topRatings;
  // }
  // getTopRatingsDaily(selector: GameModeType) {
  //   return this.otherDb[selector]!.topRatingsDaily;
  // }
  // getTopRatingsWeekly(selector: GameModeType) {
  //   return this.otherDb[selector]!.topRatingsWeekly;
  // }

  async setupDatabases() {
    await this.players.setupDatabase();
    await this.playerNames.setupDatabase();
    await this.votes.setupDatabase();
    await this.probableBots.setupDatabase();
    await this.discordAuthLinks.setupDatabase();
    await this.discordUsers.setupDatabase();

    for (let selector of DBHandler.GameModes) {
      let otherDb = this.otherDb[selector];
      if (!otherDb) continue;
      await otherDb.totalPlayerMatchStats.setupDatabase();
      await otherDb.matches.setupDatabase();
      await otherDb.matchStats.setupDatabase();
      await otherDb.matchRankChanges.setupDatabase();
      await otherDb.playerState.setupDatabase();
      await otherDb.networksState.setupDatabase();
      await otherDb.reports.setupDatabase();
      await otherDb.penaltyCounter.setupDatabase();
      await otherDb.ratings.setupDatabase();
      await otherDb.topRatings.setupDatabase();
      await otherDb.topRatingsDaily.setupDatabase();
      await otherDb.topRatingsWeekly.setupDatabase();
    }

    await this.rejoice.setupDatabase();
    await this.rejoiceTransactions.setupDatabase();
    await this.rejoicePrices.setupDatabase();
    await this.vipOptions.setupDatabase();
    await this.vipTransactions.setupDatabase();
    await this.vipPrices.setupDatabase();
    await this.payments.setupDatabase();
    await this.paymentLinks.setupDatabase();
    await this.paymentLinksWatcher.setupDatabase();
  }

  closeDatabases() {
    const closeDb = (db: sqlite3.Database) => {
      db.close((err) => {
        if (err) {
          console.error('Error closing database:', err.message);
        }
      })
    };
    [this.playersDb, this.vipDb].forEach(db => closeDb(db));
    for (let selector of DBHandler.GameModes) {
      let otherDb = this.otherDb[selector];
      if (!otherDb) continue;
      closeDb(otherDb.db);
    }
  }
}

export class GameState {
  dbHandler: DBHandler;
  chatLogger: ChatLogger;
  constructor(dbHandler: DBHandler, chatLogger: ChatLogger) {
    this.dbHandler = dbHandler;
    this.chatLogger = chatLogger;
  }

  async setup() {
    await this.dbHandler.setup();
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

  getPlayerNameInfo(auth_id: string) {
    return this.dbHandler.playerNames.getPlayerNameInfo(auth_id);
  }

  getPlayerNames(auth_id: string, n: number = 5): Promise<string[]> {
    return this.dbHandler.playerNames.getLastPlayerNames(auth_id, n);
  }

  getAllPlayerNames() {
    return this.dbHandler.playerNames.getAllPlayerNames();
  }

  addProbableBot(auth_id: string, conn_id: string) {
    return this.dbHandler.probableBots.addProbableBot(auth_id, conn_id);
  }

  removeProbableBotByAuthId(auth_id: string) {
    return this.dbHandler.probableBots.removeProbableBotByAuthId(auth_id);
  }

  probableBotExists(auth_id: string, conn_id: string) {
    return this.dbHandler.probableBots.probableBotExists(auth_id, conn_id);
  }

  generateAndSendDiscordToken(auth_id: string) {
    return this.dbHandler.discordAuthLinks.generateAndSendDiscordToken(auth_id);
  }

  getAllDiscordAuthLinks() {
    return this.dbHandler.discordAuthLinks.getAllDiscordAuthLinks();
  }

  getDiscordAuthLink(auth_id: string) {
    return this.dbHandler.discordAuthLinks.getDiscordAuthLink(auth_id);
  }

  getAllDiscordUsers() {
    return this.dbHandler.discordUsers.getAllDiscordUsers();
  }

  getDiscordUser(discord_id: number) {
    return this.dbHandler.discordUsers.getDiscordUser(discord_id);
  }

  setDiscordUserNickname(discord_id: number, nickname: string) {
    return this.dbHandler.discordUsers.setDiscordUserNickname(discord_id, nickname);
  }

  updateDiscordChatColorForUser(discord_id: number, color: number) {
    return this.dbHandler.discordUsers.updateDiscordChatColorForUser(discord_id, color);
  }

  addReport(player_name: string, auth_id: string, report: string) {
    return this.dbHandler.reports.addReport(player_name, auth_id, report);
  }

  getPenaltyCounterFor(auth_id: string) {
    return this.dbHandler.penaltyCounter.getPenaltyCounterFor(auth_id);
  }

  incrementPenaltyCounterFor(auth_id: string) {
    return this.dbHandler.penaltyCounter.incrementPenaltyCounterFor(auth_id);
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

  loadTotalPlayerMatchStats(selector: GameModeType, auth_id: string): Promise<PlayerMatchStatsData|null> {
    if (!this.dbHandler.isValidSelector(selector)) return Promise.resolve(null);
    return this.dbHandler.getTotalPlayerMatchStats(this.dbHandler.mainMode).loadTotalPlayerMatchStats(auth_id);
  }

  // saveTotalPlayerMatchStats(selector: GameModeType, auth_id: string, stat: PlayerStat) {
  //   if (!this.dbHandler.isValidSelector(selector)) return Promise.resolve(null);
  //   return this.dbHandler.getTotalPlayerMatchStats(selector).saveTotalPlayerMatchStats(auth_id, stat);
  // }

  updateTotalPlayerMatchStats(selector: GameModeType, auth_id: string, stat: PlayerStat, playerMatchStats: PlayerMatchStatsData): Promise<void> {
    if (!this.dbHandler.isValidSelector(selector)) return Promise.resolve();
    return this.dbHandler.getTotalPlayerMatchStats(selector).updateTotalPlayerMatchStats(auth_id, stat, playerMatchStats);
  }

  insertNewMatch(selector: GameModeType, match: Match, fullTimeMatchPlayed: boolean): Promise<number> {
    if (!this.dbHandler.isValidSelector(selector)) return Promise.resolve(-1);
    return this.dbHandler.getMatches(selector).insertNewMatch(match, fullTimeMatchPlayed);
  }

  insertNewMatchPlayerStats(selector: GameModeType, match_id: number, auth_id: string, team_id: 0 | 1 | 2, stat: PlayerMatchStatsData) {
    if (!this.dbHandler.isValidSelector(selector)) return Promise.resolve(null);
    return this.dbHandler.getMatchStats(selector).insertNewMatchPlayerStats(match_id, auth_id, team_id, stat);
  }

  insertNewMatchRankChanges(selector: GameModeType, m: MatchRankChangesEntry) {
    if (!this.dbHandler.isValidSelector(selector)) return Promise.resolve(null);
    return this.dbHandler.getMatchRankChanges(selector).insertNewMatchRankChanges(m);
  }

  loadPlayerRating(selector: GameModeType, auth_id: string): Promise<PlayerRatingData|null>  {
    if (!this.dbHandler.isValidSelector(selector)) return Promise.resolve(null);
    return this.dbHandler.getRatings(selector).loadPlayerRating(auth_id);
  }

  // savePlayerRating(selector: GameModeType, auth_id: string, player: PlayerStat) {
  //   if (!this.dbHandler.isValidSelector(selector)) return new Promise((resolve, reject) => resolve(null));
  //   return this.dbHandler.getRatings(selector).savePlayerRating(auth_id, player);
  // }

  updatePlayerRating(selector: GameModeType, auth_id: string, new_rating: number, rating_diff: number, rd: number, vol: number) {
    if (!this.dbHandler.isValidSelector(selector)) return new Promise((resolve, reject) => resolve(null));
    return this.dbHandler.getRatings(selector).updatePlayerRating(auth_id, new_rating, rating_diff, rd, vol);
  }

  getTopPlayersShortAuth(limit: number = 1000) {
    return this.dbHandler.topRatings.getTopNPlayersShortAuth(limit);
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

  insertRejoiceTransaction(auth_id: string, rejoice_id: string, at_time: number, for_days: number, selector: string) {
    return this.dbHandler.rejoiceTransactions.insertRejoiceTransaction(auth_id, rejoice_id, at_time, for_days, selector);
  }

  getRejoicePrices() {
    return this.dbHandler.rejoicePrices.getRejoicePrices();
  }

  getVipOptionsForPlayer(auth_id: string) {
    return this.dbHandler.vipOptions.getVipOptionsForPlayer(auth_id);
  }

  updateOrInsertVipOption(auth_id: string, option: string, time_from: number, time_to: number) {
    return this.dbHandler.vipOptions.updateOrInsertVipOption(auth_id, option, time_from, time_to);
  }

  insertVipTransaction(auth_id: string, option: string, at_time: number, for_days: number, selector: string) {
    return this.dbHandler.vipTransactions.insertVipTransaction(auth_id, option, at_time, for_days, selector);
  }

  async getVipOpionPrices() {
    return this.dbHandler.vipPrices.getVipOpionPrices();
  }

  getPaymentLink(auth_id: string, transaction_id: number) {
    return this.dbHandler.paymentLinks.getPaymentLink(auth_id, transaction_id);
  }

  getPaymentStatus(transaction_id: number) {
    return this.dbHandler.payments.getPaymentStatus(transaction_id);
  }

  logMessage(user_name: string, action: string, text: string, for_discord: boolean) {
    return this.chatLogger.logMessage(user_name, action, text, for_discord);
  }

  setPaymentsLinkCallbackAndStart(callback: (auth_id: string, transaction_id: number) => void, selector: string, intervalMs: number = 5000) {
    this.dbHandler.paymentLinksWatcher.setCallback(callback, selector);
    this.dbHandler.paymentLinksWatcher.startWatching(intervalMs);
  }
}
