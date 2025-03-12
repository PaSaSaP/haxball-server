import { NONAME } from "dns";
import { AntiSpam } from "./anti_spam";
import { ScoreCaptcha } from "./captcha";
import * as config from "./config";
import { Emoji } from "./emoji";
import { GameState } from "./game_state";
import { PlayerAccelerator } from "./player_accelerator";
import { BallPossessionTracker } from "./possesion_tracker";
import { getTimestampHM, normalizeNameString } from "./utils";
import Glicko2 from 'glicko2';

export class PlayerActivity {
  chat: number; // if is writing or is moving players from team to team
  game: number; // not real player action, can by triggered by others
  move: number; // if is moving while match or is moving players from team to team

  constructor() {
    const now = Date.now();
    this.chat = now; // chat or moved player as admin
    this.game = now;
    this.move = now;
  }

  updateChat() { this.chat = Date.now(); }
  updateGame() { this.game = Date.now(); }
  updateMove() { this.move = Date.now(); }
  last() { return this.chat > this.game ? this.chat : this.game; }
}

export class AdminStats {
  active: boolean;
  first_since: string;
  since: string;
  given_by: string | null;
  taken_by: string | null;
  kicked_users: Set<string>;
  banned_users: Set<string>;
  kick_timestamps: number[];
  action_start_stop: number;
  action_pause_unpause: number;
  action_admin: number;
  action_team: number;
  action_kick: number;
  action_other: number;

  constructor() {
    this.active = true;
    this.first_since = getTimestampHM();
    this.since = this.first_since;
    this.given_by = null;
    this.taken_by = null;
    this.kicked_users = new Set();
    this.banned_users = new Set();
    this.kick_timestamps = [];
    this.action_start_stop = 0;
    this.action_pause_unpause = 0;
    this.action_admin = 0;
    this.action_team = 0;
    this.action_kick = 0;
    this.action_other = 0;
  }

  since_now() {
    this.since = getTimestampHM();
    this.active = true;
  }

  add_kick_timestamp() {
    this.kick_timestamps.push(Date.now());
    let s = this.kick_timestamps.length;
    if (s > 1 && this.kick_timestamps[s - 1] - this.kick_timestamps[s - 2] < 10) {
      return true;
    }
    return false;
  }
}

export interface PPP {
  id: number;
  name: string;
  team: TeamID;
  admin: boolean;
  position: { "x": number; "y": number };
  auth: string;
  conn: string;
}

export class TransactionByPlayerInfo {
  transactionId: number;
  link: string;
  status: 'started' | 'completed' | 'failed';
  constructor(transactionId: number) {
    this.transactionId = transactionId;
    this.link = '';
    this.status = 'started';
  }
}

export class PlayerData {
  name: string;
  name_normalized: string;
  id: number;
  team: number;
  admin: boolean;
  admin_stats: AdminStats | null;
  position: { "x": number, "y": number };
  stat: PlayerStat;
  afk: boolean;
  afk_maybe: boolean;
  activity: PlayerActivity;
  auth_id: string;
  conn_id: string;
  connected: boolean;
  trust_level: number;
  admin_level: number;
  join_time: number;
  timer_give_back_admin: any;
  verify_link_requested: boolean;
  afk_avatar: string|null;
  afk_switch_time: number;
  chosen_player_names: string[];
  pendingTransaction: TransactionByPlayerInfo | null;

  constructor(player: PlayerObject|PPP) {
    // this.player = player;
    this.name = player.name; /// @type string
    this.name_normalized = normalizeNameString(this.name);
    this.id = player.id; /// @type int
    this.team = player.team;
    this.admin = player.admin;
    this.admin_stats = null;
    this.position = player.position;
    this.stat = new PlayerStat(this.id);
    this.afk = false;
    this.afk_maybe = false;
    this.activity = new PlayerActivity(); /// @type {PlayerActivity | null}
    this.auth_id = player.auth || ''; /// @type string
    this.conn_id = player.conn; /// @type string
    this.connected = true;
    this.trust_level = 0; // based on player auth from DB
    this.admin_level = 0; // based on player auth from DB
    this.join_time = Date.now();
    this.timer_give_back_admin = null;
    this.verify_link_requested = false;
    this.afk_avatar = null;
    this.afk_switch_time = Date.now();
    this.chosen_player_names = [];
    this.pendingTransaction = null;
  }

  update(player: PlayerObject) {
    this.team = player.team;
    this.admin = player.admin;
    this.position = player.position;
  }

  mark_disconnected() { this.connected = false; this.reset_timers(); }
  reset_timers() {
    if (this.timer_give_back_admin) {
      clearInterval(this.timer_give_back_admin);
      this.timer_give_back_admin = null;
    }
  }

  // admin stats related
  admin_stat_start_stop() { if (this.admin_stats) this.admin_stats.action_start_stop += 1; }
  admin_stat_pause_unpause() { if (this.admin_stats) this.admin_stats.action_pause_unpause += 1; }
  admin_stat_admin() { if (this.admin_stats) this.admin_stats.action_admin += 1; }
  admin_stat_team() { if (this.admin_stats) this.admin_stats.action_team += 1; }
  admin_stat_kick() { if (this.admin_stats) this.admin_stats.action_kick += 1; }
  admin_stat_other() { if (this.admin_stats) this.admin_stats.action_other += 1; }
}

export interface PlayerRatingData {
  rating: {
    mu: number;      // Glicko2 rating (mu)
    rd: number;      // Glicko2 rating deviation (sigma)
    vol: number;     // Glicko2 volatility
  };
}

export interface PlayerMatchStatsData {
  games: number;
  full_games: number;
  wins: number;
  full_wins: number;
  goals: number;
  assists: number;
  own_goals: number;
  playtime: number;
  clean_sheets: number;
  left_afk: number;
  left_votekick: number;
  left_server: number;
}

export class PlayerMatchStatsDataImpl implements PlayerMatchStatsData {
  games: number = 0;
  full_games: number = 0;
  wins: number = 0;
  full_wins: number = 0;
  goals: number = 0;
  assists: number = 0;
  own_goals: number = 0;
  playtime: number = 0;
  clean_sheets: number = 0;
  left_afk: number = 0;
  left_votekick: number = 0;
  left_server: number = 0;

  reset() {
    this.games = 0;
    this.full_games = 0;
    this.wins = 0;
    this.full_wins = 0;
    this.goals = 0;
    this.assists = 0;
    this.own_goals = 0;
    this.playtime = 0;
    this.clean_sheets = 0;
    this.left_afk = 0;
    this.left_votekick = 0;
    this.left_server = 0;
  }
}

export interface PlayerTopRatingDataShort {
  player_name: string;
  rating: number;
}

export interface PlayerTopRatingData {
  rank: number;
  auth_id: string;
  player_name: string;
  rating: number;
  games: number;
  wins: number;
  goals: number;
  assists: number;
  own_goals: number;
  clean_sheets: number;
}

export class PlayerStat {
  id: number; // player id
  glickoPlayer: Glicko2.Player|null;

  games: number; // all played ranked games
  fullGames: number; // games when player played from the beginning (joinedAt 0) to end (leavedAt -1)
  wins: number; // losses is (total - won) I think
  fullWins: number;

  goals: number;
  assists: number;
  ownGoals: number;
  playtime: number;
  cleanSheets: number;

  counterAfk: number;
  counterVoteKicked: number;
  counterLeftServer: number;

  currentMatch: PlayerMatchStatsDataImpl;

  constructor(id: number) {
    this.id = id;
    this.glickoPlayer = null;

    this.games = 0;
    this.fullGames = 0;
    this.wins = 0;
    this.fullWins = 0;
    this.goals = 0;
    this.assists = 0;
    this.ownGoals = 0;
    this.playtime = 0;
    this.cleanSheets = 0;

    this.counterAfk = 0;
    this.counterVoteKicked = 0;
    this.counterLeftServer = 0;

    this.currentMatch = new PlayerMatchStatsDataImpl();
  }

  updatePlayer(glickoPlayer: Glicko2.Player) {
    this.glickoPlayer = glickoPlayer;
  }

  static DefaultRating: number = 1500;
  static DefaultRd: number = 150;
  static DefaultVol: number = 0.02;
  static DefaultTau: number = 0.5;
}

export enum PlayerLeavedDueTo {
  none, // default value
  afk, // player was afk so it left game, should be punished because of he destroys game other players
  voteKicked, // player was kicked by other players requested by player from the same team, little punishment
  leftServer, // even worse than AFK except before starting game or at the end of match; win or loose - should be punished
}

export class PlayerStatInMatch {
  id: number; // player id
  joinedAt: number; // the same timelime like matchEndTime, 0 for players playing from the beginning
  leftAt: number; // any value greater than -1 means that player leaved match; 0 means that player leaved even before first ball touch
  leftDueTo: PlayerLeavedDueTo;

  constructor(id: number) {
    this.id = id;
    this.joinedAt = 0;
    this.leftAt = -1;
    this.leftDueTo = PlayerLeavedDueTo.none;
  }

  isLeftStatusSet() { return this.leftDueTo != PlayerLeavedDueTo.none; }
}

export enum RatingProcessingState {
  none,
  ranked,
  updated
}

export enum MatchStatsProcessingState {
  none,
  ranked,
  updated
}

export class Match {
  redScore: number; // goals scored by red
  blueScore: number; // goals scored by blue
  matchEndTime: number; // total [seconds]
  fullTimeMatchPlayed: boolean; // match played to resultative result or by pressure
  startedAt: number; // Date time, not for statistics
  endedAt: number;  // Date time, not for statistics
  redTeam: number[]; // player ids
  blueTeam: number[]; // player ids
  playerStats: Map<number, PlayerStatInMatch>; // player id -> stat
  goals: [number, 1|2][]; // list of tuples (time, team) where time is in seconds, team 1 is red, 2 is blue
  ratingState: RatingProcessingState;
  matchStatsState: MatchStatsProcessingState;

  winnerTeam: 0 | 1 | 2; // red = 1, blue = 2
  winStreak: number; // streak is for team so if player is in team then he "has" streak
  pressureRed: number; // pressure by red, 0-100 [%]
  pressureBlue: number; // pressure by blue, 0-100 [%], (it is of course: 100 - pressureRed)

  constructor() {
    this.redScore = 0;
    this.blueScore = 0;
    this.matchEndTime = 0;
    this.fullTimeMatchPlayed = false;
    this.startedAt = Date.now();
    this.endedAt = 0;
    this.redTeam = [];
    this.blueTeam = [];
    this.playerStats = new Map<number, PlayerStatInMatch>();
    this.goals = [];
    this.ratingState = RatingProcessingState.none;
    this.matchStatsState = MatchStatsProcessingState.none;
    this.winnerTeam = 0;
    this.winStreak = 0;
    this.pressureRed = 0;
    this.pressureBlue = 0;
  }
  setEnd(ranked: boolean, fullTimeMatchPlayed: boolean = false) {
    this.endedAt = Date.now();
    if (ranked) {
      this.ratingState = RatingProcessingState.ranked;
      this.matchStatsState = MatchStatsProcessingState.ranked;
    }
    this.fullTimeMatchPlayed = fullTimeMatchPlayed;
  }
  isEnded() { return this.endedAt > 0; }
  stat(id: number): PlayerStatInMatch {
    if (!this.playerStats.has(id)) this.playerStats.set(id, new PlayerStatInMatch(id));
    return this.playerStats.get(id)!;
  }

  getWinnerTeamIds() {
    if (this.winnerTeam == 1) return this.redTeam;
    if (this.winnerTeam == 2) return this.blueTeam;
    return [];
  }

  getLoserTeamIds() {
    if (this.winnerTeam == 2) return this.redTeam;
    if (this.winnerTeam == 1) return this.blueTeam;
    return [];
  }
}

export interface PlayersGameState {
  muted_to: number;
  kicked_to: number;
}

export interface NetworksGameState {
  muted_to: number;
  kicked_to: number;
}

export interface RejoiceEntry {
  rejoice_id: string;
  time_from: number;
  time_to: number;
}
