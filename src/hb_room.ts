// https://pastebin.com/f4PSNz7C
// https://pastebin.com/2nHXPbvS

import { setupTokenDatabase, tokenDatabase, ServerRow } from './db/token_database';
import * as config from './config';
import ChatLogger from './chat_logger';
import { sleep, normalizeNameString } from './utils';
import { Emoji } from './emoji';
import { ScoreCaptcha } from './captcha';
import { BallPossessionTracker } from './possesion_tracker';
import { AntiSpam } from './anti_spam';
import { PlayerAccelerator } from './player_accelerator';
import {
  PPP, AdminStats, PlayerData, PlayerStat, MatchStatsProcessingState, TransactionByPlayerInfo,
  PlayerTopRatingDataShort, PlayerMatchStatsData, Match, PlayerLeavedDueTo, PlayerRatingData,
  GameModeType
} from './structs';
import { Colors } from './colors';
import {isValidMap, getMap, MapPhysicsType, updateMapPhysics } from './maps';
import { BuyCoffee } from './buy_coffee';
import { DBHandler, GameState } from './game_state';
import Commander from './commands';
import { AutoBot } from './auto_mode';
import { Ratings } from './rating';
import Glicko2 from 'glicko2';
import { PlayersGameStateManager } from './pg_manager';
import { hb_log } from './log';
import { MatchStats } from './stats';
import { RejoiceMaker } from './rejoice_maker';
import WelcomeMessage from './welcome_message';
import Pinger from './pinger';
import { MatchRankChangesEntry } from './db/match_rank_changes';
import GodCommander from './god_commander';
import { DelayJoiner } from './delay_join';
import { PlayerGatekeeper } from './gatekeeper/player_gatekeeper';
import { PlayerJoinLogger } from './ip_logger';
import { VipOptionsHandler } from './vip_options';
import { getBotKickMessage, getStillAfkMessage } from './spam_data';
import { DiscordAccountManager } from './discord_account';
import { GhostPlayers } from './ghost_players';
import { Volleyball } from './volleyball';
import { Tennis } from './tennis';
import { Recording } from './recording';
import { Handball } from './handball';
import { CurrentMatchState } from './match_state';
import { Fouls } from './fouls';
import { StepMove } from './step_move';


declare global {
  var PlayerFlagByPlayerId: Map<number, string>;
}

export class HaxballRoom {
  room: RoomObject;
  room_config: config.RoomServerConfig;
  server_start_time: number;
  current_date_obj: Date;
  current_time: number;
  scores: ScoresObject|null;
  pressure_left: number;
  pressure_right: number;
  pressure_total: number;
  last_match_time: number;
  game_tick_counter: number;
  count_ticks_per_second_enabled: boolean;
  pressure_bar_length: number;
  feature_pressure: boolean;
  feature_pressure_stadium: boolean;
  players_ext_all: Map<number, PlayerData>; // all players connected since server started
  players_ext: Map<number, PlayerData>; // players currently connected
  emoji: Emoji;
  anti_spam: AntiSpam;
  captcha: ScoreCaptcha;
  to_be_trusted: Set<number>;
  allow_connecting_only_trusted: boolean;
  allow_chatting_only_trusted: boolean;
  player_duplicate_allowed: boolean;
  whitelisted_nontrusted_player_names: Set<string>;
  last_command: Map<number, string>;
  muted_players: Set<number>;
  game_state: GameState;
  acceleration_tasks: PlayerAccelerator;
  ball_possesion_tracker: BallPossessionTracker;
  auto_bot: AutoBot;
  player_stats: Map<number, PlayerStat>;
  player_stats_auth: Map<string, number>; // auth -> id in player_stats
  // glicko_settings: Glicko2.Glicko2Settings;
  glicko: Glicko2.Glicko2;
  glicko_players: Map<string, Glicko2.Player>;
  ratings: Ratings;
  ratings_for_all_games: boolean;
  match_stats: MatchStats;
  current_match_state: CurrentMatchState;
  game_stopped_timer: any | null;
  game_paused_timer: any | null;
  matchStatsTimer: any | null;
  last_player_team_changed_by_admin_time: number;
  last_winner_team: 0|1|2;
  auto_mode: boolean;
  auto_afk: boolean;
  max_afk_time_minutes: number;
  limit: number;
  commander: Commander;
  default_map_name: string;
  last_selected_map_name: string | null;
  default_selected_ball: MapPhysicsType;
  last_selected_ball: MapPhysicsType;
  map_name_classic: string;
  map_name_big: string;
  map_name_huge: string;
  time_limit_reached: boolean;
  players_num: number;
  room_link: string;
  room_data_sync_timer: any | null;
  god_player: PlayerObject;
  top10: PlayerTopRatingDataShort[];
  top10_daily: PlayerTopRatingDataShort[];
  top10_weekly: PlayerTopRatingDataShort[];
  global_rank_by_auth: Map<string, number>;
  player_names_by_auth: Map<string, string>;
  player_ids_by_auth: Map<string, number>;
  player_ids_by_normalized_name: Map<string, number>;
  players_game_state_manager: PlayersGameStateManager;
  rejoice_maker: RejoiceMaker;
  vip_options: VipOptionsHandler;
  rejoice_prices: Map<string, { for_days: number, price: number }[]>;
  vip_option_prices: Map<string, { for_days: number, price: number }[]>;
  welcome_message: WelcomeMessage;
  pinger: Pinger;
  god_commander: GodCommander;
  delay_joiner: DelayJoiner;
  gatekeeper: PlayerGatekeeper;
  pl_logger: PlayerJoinLogger;
  discord_account: DiscordAccountManager;
  ghost_players: GhostPlayers;
  volleyball: Volleyball;
  tennis: Tennis;
  handball: Handball;
  no_x_for_all: boolean;
  bot_stopping_enabled = false;
  temporarily_trusted: Set<number>;
  auto_temp_trust: boolean;
  game_tick_array: number[];
  logs_to_discord: boolean;
  recording: Recording;
  force_recording_enabled: boolean;
  tourney_mode: boolean;
  fouls: Fouls;
  step_move: StepMove;

  constructor(room: RoomObject, roomConfig: config.RoomServerConfig, gameState: GameState) {
    this.room = room;
    this.room_config = roomConfig;

    this.current_date_obj = new Date();
    this.server_start_time = this.current_date_obj.getTime();
    this.current_time = this.server_start_time;
    this.scores = null;
    this.pressure_left = 0.0;
    this.pressure_right = 0.0;
    this.pressure_total = 0.0;
    this.last_match_time = 0.0;
    this.game_tick_counter = 0;
    this.count_ticks_per_second_enabled = false;
    this.pressure_bar_length = 300;
    this.feature_pressure = true;
    this.feature_pressure_stadium = false;
    this.players_ext_all = new Map();
    this.players_ext = new Map();
    this.emoji = new Emoji(this.room);
    this.anti_spam = new AntiSpam(3, 5000, 60000);
    this.captcha = new ScoreCaptcha(this.room);
    this.to_be_trusted = new Set();
    this.allow_connecting_only_trusted = false;
    this.allow_chatting_only_trusted = false;
    this.player_duplicate_allowed = false;
    this.whitelisted_nontrusted_player_names = new Set();
    this.last_command = new Map();  // Mapa: id -> command_string
    this.muted_players = new Set();
    this.game_state = gameState;
    this.acceleration_tasks = new PlayerAccelerator(this.room);
    this.ball_possesion_tracker = new BallPossessionTracker();
    this.game_stopped_timer = null;
    this.game_paused_timer = null;
    this.matchStatsTimer = null;
    this.last_player_team_changed_by_admin_time = Date.now();
    this.last_winner_team = 0;
    this.limit = roomConfig.playersInTeamLimit;
    this.max_afk_time_minutes = 10;
    this.player_stats = new Map();
    this.player_stats_auth = new Map();
    // this.glicko_settings = null;
    this.glicko = new Glicko2.Glicko2();
    this.glicko_players = new Map();
    this.ratings = new Ratings(this.glicko, { limits: this.room_config.limits });
    this.ratings_for_all_games = false;
    this.match_stats = new MatchStats();
    this.current_match_state = new CurrentMatchState();
    this.auto_mode = roomConfig.autoModeEnabled;
    this.auto_afk = true;
    this.room_link = '';
    this.room_data_sync_timer = null;
    this.god_player = this.createGodPlayer();
    this.top10 = [];
    this.top10_daily = [];
    this.top10_weekly = [];
    this.global_rank_by_auth = new Map();
    this.player_names_by_auth = new Map();
    this.player_ids_by_auth = new Map();
    this.player_ids_by_normalized_name = new Map();
    this.players_game_state_manager = new PlayersGameStateManager(this);
    this.rejoice_maker = new RejoiceMaker(this);
    this.vip_options = new VipOptionsHandler(this);
    this.rejoice_prices = new Map();
    this.vip_option_prices = new Map();
    this.welcome_message = new WelcomeMessage((player: PlayerData, msg: string) => { this.sendMsgToPlayer(player, msg, Colors.LightYellow, 'bold', 2) });
    this.pinger = new Pinger(this.getSselector(), () => [this.players_ext.size, this.getAfkCount()]);
    this.god_commander = new GodCommander(this.god_player, (player: PlayerObject, command: string) => this.handlePlayerChat(player, command),
      roomConfig.selector, roomConfig.subselector);
    this.delay_joiner = this.createDelayJoincer();
    this.gatekeeper = new PlayerGatekeeper(this);
    this.pl_logger = new PlayerJoinLogger(this);
    this.discord_account = new DiscordAccountManager(this);
    this.ghost_players = new GhostPlayers(this);
    this.auto_bot = new AutoBot(this);
    this.volleyball = new Volleyball(this, this.room_config.selector === 'volleyball');
    this.tennis = new Tennis(this, this.room_config.selector === 'tennis');
    this.handball = new Handball(this, this.room_config.selector === 'handball');
    this.no_x_for_all = false;
    this.temporarily_trusted = new Set();
    this.auto_temp_trust = this.room_config.selector === 'handball';
    this.game_tick_array = [];
    this.logs_to_discord = true;
    this.recording = new Recording(this, './recordings', true);
    this.force_recording_enabled = false;
    this.tourney_mode = false;
    this.fouls = new Fouls(this);
    this.step_move = new StepMove(this);

    this.ratings.isEnabledPenaltyFor = (playerId: number) => {
      let playerExt = this.Pid(playerId);
      return playerExt.trust_level === 0 || (playerExt.trust_level > 0 && playerExt.penalty_counter >= 3);
    };
    this.welcome_message.setMessage('Sprawdź ranking globalny: !ttop, sprawdź również ranking tygodnia: !wtop, wesprzyj twórcę: !sklep');
    this.welcome_message.setMessageNonTrusted([
      `By grać musisz zyskać pierwszy stopień zaufania, sprawdź Discord! 💬 ${config.discordLink} 💬`,
      `Necesitas nivel 1 de confianza. ¡Únete a Discord! 💬 ${config.discordLink} 💬`,
      `Для игры нужен 1 уровень доверия. Заходи в Discord! 💬 ${config.discordLink} 💬`,
      `To play, you need to gain the first level of trust. Check out our Discord! 💬 ${config.discordLink} 💬`,
    ]);

    this.room.onRoomLink = this.handleRoomLink.bind(this);
    this.room.onGameTick = this.handleGameTick.bind(this);
    this.room.onGameStart = this.handleGameStart.bind(this);
    this.room.onGameStop = this.handleGameStop.bind(this);
    this.room.onGamePause = this.handleGamePause.bind(this);
    this.room.onGameUnpause = this.handleGameUnpause.bind(this);
    this.room.onPlayerJoin = this.handlePlayerJoin.bind(this);
    this.room.onPlayerLeave = this.handlePlayerLeave.bind(this);
    this.room.onPlayerChat = this.handlePlayerChat.bind(this);
    this.room.onPlayerAdminChange = this.handlePlayerAdminChange.bind(this);
    this.room.onPlayerKicked = this.handlePlayerKicked.bind(this);
    this.room.onPlayerTeamChange = this.handlePlayerTeamChange.bind(this);
    this.room.onPlayerActivity = this.handlePlayerActivity.bind(this);
    this.room.onPlayerBallKick = this.handlePlayerBallKick.bind(this);
    this.room.onTeamGoal = this.handleTeamGoal.bind(this);
    this.room.onTeamVictory = this.handleTeamVictory.bind(this);
    this.room.onPositionsReset = this.handlePositionsReset.bind(this);
    this.room.onStadiumChange = this.handleStadiumChange.bind(this);
    this.room.onKickRateLimitSet = this.handleKickRateLimitSet.bind(this);
    this.room.onTeamsLockChange = this.handleTeamsLockChange.bind(this); // TODO edited by hand onTeamLockChange

    this.commander = new Commander(this);
    this.default_map_name = 'futsal';
    if (this.room_config.selector === 'volleyball') this.default_map_name = 'volleyball';
    else if (this.room_config.selector === 'tennis') this.default_map_name = 'tennis';
    else if (this.room_config.selector === 'handball') this.default_map_name = 'handball';
    this.last_selected_map_name = null;
    this.default_selected_ball = 'vehax';
    if (this.room_config.mapSet === 'handball') {
      this.map_name_classic = 'handball';
      this.map_name_big = 'handball_big';
      this.map_name_huge = 'handball_huge';
      this.default_selected_ball = 'hand';
    } else {
      this.map_name_classic = 'futsal';
      this.map_name_big = 'futsal_big';
      this.map_name_huge = 'futsal_huge';
    }
    this.last_selected_ball = this.default_selected_ball;
    this.time_limit_reached = false;
    this.players_num = 0;
    this.room.setDefaultStadium("Classic");
    this.setMapByName(this.default_map_name);
    this.room.setTeamsLock(true);
    this.setDefaultKickRateLimit();
    this.setDefaultScoreTimeLimit();
    this.initData();
  }

  private async initData() {
    await this.game_state.setup();
    this.initPlayerNames();
    this.players_game_state_manager.initAllGameState();
    if (this.auto_mode) {
      this.auto_bot.resetAndStart();
      this.anti_spam.setEnabled(true); // enable anti spam there
      // on spam set timed mute for 5 mintues
      this.anti_spam.setOnMute((playerId: number) => {
        let playerExt = this.Pid(playerId);
        const muteInSeconds = playerExt.trust_level < 2 ? 5 * 60 : 60;
        this.players_game_state_manager.setPlayerTimeMuted(playerExt, this.God(), muteInSeconds);
        this.anti_spam.clearMute(playerId);
      });
    }

    this.game_state.getRejoicePrices().then((results) => {
      for (let result of results) {
        if (!this.rejoice_prices.has(result.rejoice_id)) this.rejoice_prices.set(result.rejoice_id, []);
        this.rejoice_prices.get(result.rejoice_id)!.push({for_days: result.for_days, price: result.price});
      }
    }).catch((error) => {hb_log(`!! getRejoicePrices error: ${error}`)});

    this.game_state.getVipOpionPrices().then((results) => {
      for (let result of results) {
        if (!this.vip_option_prices.has(result.option)) this.vip_option_prices.set(result.option, []);
        this.vip_option_prices.get(result.option)!.push({for_days: result.for_days, price: result.price});
      }
    }).catch((error) => {hb_log(`!! getVipOpionPrices error: ${error}`)});

    this.game_state.setPaymentsLinkCallbackAndStart((authId: string, paymentTransactionId: number) => {
      this.game_state.getPaymentLink(authId, paymentTransactionId).then((result) => {
        let playerId = this.player_ids_by_auth.get(authId)!;
        let player = this.Pid(playerId);
        if (!player) return;
        let link = 'INVALID';
        let name = '';
        if (result) {
          link = result.link;
          name = result.name;
        }
        if (name === 'vip') {
          player.pendingVipOptionTransaction = new TransactionByPlayerInfo(paymentTransactionId);
          player.pendingVipOptionTransaction.link = link;
        } else {
          player.pendingRejoiceTransaction = new TransactionByPlayerInfo(paymentTransactionId);
          player.pendingRejoiceTransaction.link = link;
        }
        let txt = `Link ⇒  ${link}  ⇐ Zakup przez Stripe! Następnie wyjdź i wejdź!`;
        this.sendMsgToPlayer(player, txt, Colors.OrangeTangelo, 'bold');
        hb_log(`Gracz ${player.name} otrzymał link: ${txt}`);
      }).catch((error) => { hb_log(`!! getPaymentLink error: ${error}`) });
    }, this.getSselector());
    await this.discord_account.setupDiscordAccounts();
    await setupTokenDatabase();
    hb_log("#I# InitData() done");
  }

  private initPlayerNames() {
    this.game_state.getAllPlayerNames().then((result) => {
      this.player_names_by_auth = result;
      hb_log(`#I# initPlayerNames(${this.player_names_by_auth.size})`);
      this.updateTop10();
    }).catch((error) => {hb_log(`!! getAllPlayerNames error: ${error}`)});
  }

  private createGodPlayer() {
    // it does not sent do chat but can send announcements of course
    let team: TeamID = 0;
    const ppp: PPP = {
      name: "God",
      id: 0,
      team: team,
      admin: true,
      position: { "x": 0.0, "y": 0.0 },
      auth: 'QxkI4PJuA0LOT0krfPdtAgPojFw_nCXWP8qL0Aw0dGc',
      conn: 'CONN',
      country: 'pl',
      real_ip: '127.0.0.1'
    };
    let p = new PlayerData(ppp);
    p.mark_disconnected();
    p.admin_level = 40;
    p.trust_level = 40;
    if (this.room_config.mapSet === 'handball') p.selected_ball = this.default_selected_ball;
    this.players_ext_all.set(p.id, p);
    return ppp;
  }

  private createDelayJoincer() {
    const OnDelayJoinMinPlayers = 5;
    const onDelayJoinCallback = (player: PlayerData, kick: boolean): boolean => {
      if (player.trust_level) {
        this.auto_bot.handlePlayerJoin(player);
        return true;
      } else if (this.players_ext.size <= OnDelayJoinMinPlayers) {
        this.delay_joiner.addPlayerOnGameStop(player);
        this.auto_bot.handlePlayerJoin(player);
        return true;
      } else if (kick) this.kickPlayerByServer(player, getBotKickMessage());
      return false;
    };
    const onGameStopCallback = (player: PlayerData) => {
      if (!player.trust_level) this.kickPlayerByServer(player, getBotKickMessage());
    }
    const shouldBeDelayedInSecondsCallback = (player: PlayerData) => {
      if (this.players_ext.size <= OnDelayJoinMinPlayers) { // no players, allow to play all bots and players :D
        if (!player.trust_level) return 10; // 10 seconds delay for non trusted
        return 5; // 5 seconds delay for trusted
      } else if (!player.trust_level) {
        return 60; // 60 seconds delay for non trusted when more players
      } else return 5; // 5 seconds delay for trusted
    };
    const shouldKickOnGameStopCallback = () => {
      return this.players_ext.size > OnDelayJoinMinPlayers;
    }
    let delay_joiner = new DelayJoiner(onDelayJoinCallback, onGameStopCallback, shouldBeDelayedInSecondsCallback,
      shouldKickOnGameStopCallback, this.auto_mode);
    return delay_joiner;
  }

  private getGodPlayer() {
    return this.Pid(this.god_player.id);
  }

  God() {
    return this.getGodPlayer();
  }

  getAfkCount() {
    let afks = 0;
    this.players_ext.forEach(p => {
      if (p.afk || p.afk_maybe) ++afks;
    });
    return afks;
  }

  anyPlayer(): PlayerData|null {
    for (let [id, player] of this.players_ext) {
      return player;
    }
    return null;
  }

  async handleRoomLink(link: string) {
    this.pinger.start();
    if (link != this.room_link) {
      hb_log(`New link: ${link}`, true);
      if (this.room_link == '') this.game_state.logMessage('God', 'server', `Serwer juz działa: ${link}`, true);
    }
    this.room_link = link;
    if (!this.room_data_sync_timer) {
      this.makeRoomDataSync();
      this.room_data_sync_timer = setInterval(() => {
        this.makeRoomDataSync();
      }, 60 * 1000); // every minute
    }
  }

  makeRoomDataSync() {
    // TODO connectable should be updated by another thread?job? async independent from that
    const playersMax = this.room_config.maxPlayersOverride;
    const ps = this.players_ext.size;
    let playersCur = ps > playersMax ? playersMax : ps;
    const selector = this.getSselector();
    const serverData: ServerRow = {
      selector: selector,
      token: this.room_config.token,
      link: this.room_link,
      room_name: this.room_config.roomName,
      player_num: playersCur,
      player_max: playersMax,
      connectable: true,
      active: true,
    }
    tokenDatabase!.saveServer(serverData);
    let players = Array.from(this.players_ext).map(p => ({
      name: p[1].name_normalized,
      trust_level: p[1].trust_level,
      team: p[1].team,
      afk: p[1].afk || p[1].afk_maybe,
    }));
    let selectorSting = '';
    if (selector === '4vs4_1') selectorSting = '4vs4';
    else if (selector === '3vs3_1') selectorSting = '3vs3';
    else if (selector === '1vs1_1') selectorSting = '1vs1';
    else if (selector === 'volleyball_1') selectorSting = 'volleyball';
    else if (selector === 'tennis_1') selectorSting = 'tennis';
    else if (selector === 'freestyle_1') selectorSting = 'freestyle';
    else if (selector === 'handball_1') selectorSting = 'handball';
    else return;
    this.game_state.logMessage('God', 'players', JSON.stringify({
      selector: selectorSting,
      description: `${this.room_config.roomName} (${playersCur}/${playersMax})`,
      link: this.room_link,
      players: players,
    }), true);
  }

  P(player: PlayerObject): PlayerData {
    // get from all because there can be onPlayerLeave before onPlayerKicked
    let p = this.players_ext_all.get(player.id);
    if (!p) throw new Error("P() is null, should be prevented");
    p.update(player);
    return p;
  }

  Pid(playerId: number): PlayerData {
    let p = this.players_ext_all.get(playerId);
    if (!p) throw new Error("Pid() is null, should be prevented");
    return p;
  }

  resetPressureStats() {
    // hb_log("HB reset pressure stats")
    this.pressure_left = 0.0;
    this.pressure_right = 0.0;
    this.pressure_total = 0.0;
    this.last_match_time = 0.0;
    this.game_tick_counter = 0;
  }

  private countTicksPerSecond(currentTime: number) {
    if (!this.count_ticks_per_second_enabled) return;
    if (this.game_tick_counter % 60 === 0) this.game_tick_array.push(currentTime); // TODO debug, need to verify
    if (this.game_tick_array.length === 60) {
      for (let i = 0; i < this.game_tick_array.length-1; ++i) {
        this.game_tick_array[i] = this.game_tick_array[i + 1] - this.game_tick_array[i];
      }
      hb_log(`TICK ARRAY ${this.game_tick_array}`);
      this.game_tick_array.length = 0;
    }
  }

  async handleGameTick() {
    this.current_date_obj = new Date();
    const currentTime = this.current_date_obj.getTime(); // [ms]
    this.current_time = currentTime;
    ++this.game_tick_counter;
    this.countTicksPerSecond(currentTime);
    this.pinger.sendKeepAlive(currentTime);
    let scores = this.room.getScores();
    this.current_match_state.handleGameTick(scores);
    this.scores = scores;
    let players = this.getPlayersExtList(true);
    let currentMatchTime = scores.time;
    let deltaTime = currentMatchTime - this.last_match_time;
    this.last_match_time = currentMatchTime;
    const ball_position = this.room.getDiscProperties(0);
    this.pl_logger.handleGameTick(currentTime, ball_position, players);
    this.step_move.handleGameTick(currentTime, players);

    if (this.feature_pressure) {
      if (deltaTime > 0 && ball_position) {
        // Calc pressure
        if (ball_position.x < 0) {
          this.pressure_left += deltaTime;
        } else if (ball_position.x > 0) {
          this.pressure_right += deltaTime;
        } else {
          this.pressure_left += deltaTime;
          this.pressure_right += deltaTime;
        }
        this.pressure_total += deltaTime;

        // update every second
        if (this.feature_pressure_stadium && this.game_tick_counter % 60 === 0) {
          let blue_pressure = (this.pressure_left / this.pressure_total) * 100;
          let red_pressure = (this.pressure_right / this.pressure_total) * 100;
          let pressure_disc_color;
          let pressure_disc_pos_x;
          if (blue_pressure > red_pressure) {
            pressure_disc_color = 0x0000FF;
            pressure_disc_pos_x = blue_pressure * this.pressure_bar_length / 100 - this.pressure_bar_length / 2;
          } else if (red_pressure > blue_pressure) {
            pressure_disc_color = 0xFF0000;
            pressure_disc_pos_x = -red_pressure * this.pressure_bar_length / 100 + this.pressure_bar_length / 2;
          } else {
            pressure_disc_color = 0x202020;
            pressure_disc_pos_x = 0.0;
          }
          let pressure_dist_prop = this.room.getDiscProperties(6)
          this.room.setDiscProperties(6, { // Pressure disc properties (id: 6)
            xspeed: (pressure_disc_pos_x - pressure_dist_prop.x) / 60,
            color: pressure_disc_color,
          });

          // ball possesion
          let possesion_total = this.ball_possesion_tracker.getTotalPossessionTime();
          let possesion_time_blue = this.ball_possesion_tracker.getPossessionTime(2);
          let possesion_time_red = this.ball_possesion_tracker.getPossessionTime(1);
          let blue_possesion = (possesion_time_blue / possesion_total) * 100;
          let red_possesion = (possesion_time_red / possesion_total) * 100;
          let possesion_disc_color;
          let possesion_disc_pos_x;
          if (blue_possesion > red_possesion) {
            possesion_disc_color = 0x2222DD;
            possesion_disc_pos_x = blue_possesion * this.pressure_bar_length / 100 - this.pressure_bar_length / 2;
          } else if (red_possesion > blue_possesion) {
            possesion_disc_color = 0xDD2222;
            possesion_disc_pos_x = -red_possesion * this.pressure_bar_length / 100 + this.pressure_bar_length / 2;
          } else {
            possesion_disc_color = 0x424242;
            possesion_disc_pos_x = 0.0;
          }
          let possesion_disc_prop = this.room.getDiscProperties(5);
          this.room.setDiscProperties(5, { // Possesion disc properties (id: 5)
            xspeed: (possesion_disc_pos_x - possesion_disc_prop.x) / 60,
            color: possesion_disc_color,
          });
        }
      }
    }

    // check for AFK, twice per second
    if (this.game_tick_counter % 30 === 0) {
      const afkPlayersNum = this.checkIfPlayersAreAfkWhileGame(currentTime, currentMatchTime, players, this.game_tick_counter % 60 === 0? 1: 2);
      this.checkAllPlayersAfk(afkPlayersNum, players);
      this.checkBallOutside(ball_position);
    }
    this.acceleration_tasks.update();
    this.ball_possesion_tracker.trackPossession(currentMatchTime, ball_position, players);
    let distances = this.ball_possesion_tracker.getDistances();
    if (this.auto_mode) this.auto_bot.handleGameTick(scores);
    this.volleyball.handleGameTick(currentTime, ball_position);
    let [redTeam, blueTeam] = this.getRedBluePlayerIdsInTeams(players);
    this.tennis.handleGameTick(currentTime, scores, ball_position, redTeam, blueTeam, distances);
    this.handball.handleGameTick(currentTime, scores, ball_position, this.players_ext, redTeam, blueTeam, distances);
    this.match_stats.handleGameTick(scores, ball_position, this.players_ext_all, redTeam, blueTeam);
    this.ghost_players.handleGameTick(scores, redTeam, blueTeam);
    this.rejoice_maker.handleGameTick();
  }
  static readonly MaxAllowedAfkNoMoveTime = 15; // [s]
  static readonly MaxAllowedAfkNoMoveTimeMs = this.MaxAllowedAfkNoMoveTime * 1000; // [ms]
  static readonly MaxAllowedAfkNoMoveTimeEmojiCooldown = this.MaxAllowedAfkNoMoveTime - 10; // [s]

  checkIfPlayersAreAfkWhileGame(currentTime: number, currentMatchTime: number, players: PlayerData[], soundType: number) {
    let afkPlayersNum = 0;
    if (this.auto_afk) {
      if (!this.auto_mode || (this.auto_mode && !this.auto_bot.isLobbyTime())) {
        players.forEach(playerExt => {
          if (playerExt.team) {
            const afkTime = ((currentTime - playerExt.activity.game) / 1000) | 0; // [s]
            if (afkTime > HaxballRoom.MaxAllowedAfkNoMoveTime) {
              if (!playerExt.afk) {
                this.markPlayerAsAutoAfk(playerExt, currentTime);
              }
              else if (playerExt.afk_maybe) this.moveAfkMaybeToSpec(playerExt);
            } else if (afkTime >= HaxballRoom.MaxAllowedAfkNoMoveTimeEmojiCooldown) {
              let idx = afkTime - HaxballRoom.MaxAllowedAfkNoMoveTimeEmojiCooldown;
              idx = idx < 0 ? 0 : idx > 8 ? 8 : idx;
              this.setPlayerAvatarTo(playerExt, Emoji.CountdownEmojis[idx]);
              if (this.auto_mode && currentMatchTime < 20
                  && this.room.getPlayerInput(playerExt.id) === 0
                  && !this.room.isPlayerTypingMsg(playerExt.id))
                this.sendMsgToPlayer(playerExt, getStillAfkMessage(), Colors.BrightBlue, undefined, soundType);
            }
            if (playerExt.afk) afkPlayersNum++;
          }
        });
      }
    }
    return afkPlayersNum;
  }

  checkAllPlayersAfk(afkPlayersNum: number, players: PlayerData[]) {
    if (!this.auto_mode) {
      if (afkPlayersNum == players.length) {
        this.allPlayersAfking(players);
      }
    }
  }

  checkBallOutside(ball_position: DiscPropertiesObject) {
    if (this.auto_mode && !this.current_match_state.isBallInGame()) return;
    let ballOutside = false;
    let x = 0;
    if (this.last_selected_map_name === "futsal" && (ball_position.x < -460 || ball_position.x > 460 || ball_position.y < -210 || ball_position.y > 210)) {
      ballOutside = true;
    } else if (this.last_selected_map_name === "futsal_big" && (ball_position.x < -660 || ball_position.x > 660 || ball_position.y < -280 || ball_position.y > 280)) {
      ballOutside = true;
    } else if (this.last_selected_map_name === "futsal_huge" && (ball_position.x < -760 || ball_position.x > 760 || ball_position.y < -330 || ball_position.y > 330)) {
      ballOutside = true;
    } else if (this.last_selected_map_name === "handball" && (ball_position.x < -450 || ball_position.x > 450 || ball_position.y < -210 || ball_position.y > 210)) {
      ballOutside = true;
      x = ball_position.x < 0 ? -405 : 405;
    } else if ((this.last_selected_map_name === "handball_big" || this.last_selected_map_name === "handball_huge") && (ball_position.x < -680 || ball_position.x > 680 || ball_position.y < -330 || ball_position.y > 330)) {
      ballOutside = true;
      x = ball_position.x < 0 ? -600 : 600;
    }
    if (ballOutside) {
      this.sendMsgToAll('Piłka poza boiskiem, następnym razem nie oddam!', Colors.DarkRed);
      this.room.setDiscProperties(0, { x, y: 0, xspeed: 0, yspeed: 0 });
    }
  }

  setPlayerAvatarTo(playerExt: PlayerData, avatar: string) {
    if (playerExt.avatar === avatar) return;
    if (playerExt.avatar_until !== null) return;
    playerExt.avatar = avatar;
    this.room.setPlayerAvatar(playerExt.id, avatar.length? avatar: null);
  }

  markPlayerAsAutoAfk(playerExt: PlayerData, now: number) {
    // set on afk
    if (playerExt.afk) return;
    playerExt.afk_switch_time = now - HaxballRoom.MaxAllowedAfkNoMoveTimeMs; // do not block auto detected
    playerExt.afk = true;
    this.setPlayerAvatarTo(playerExt, Emoji.Afk);
    this.sendMsgToAll(`${playerExt.name} zapomniał o nas, jest teraz AFK (!afk !back !jj)`, Colors.Afk);
    if (playerExt.team != 0) {
      this.room.setPlayerTeam(playerExt.id, 0);
    }
    if (!this.auto_mode && playerExt.admin) this.updateAdmins(null);
  }

  moveAfkMaybeToSpec(player: PlayerData) {
    this.setPlayerAvatarTo(player, Emoji.AfkMaybe);
    this.room.setPlayerTeam(player.id, 0);
  }

  async allPlayersAfking(players: PlayerData[]) {
    this.sendMsgToAll(`Wszyscy afczą… Wszyscy na boisko! Ruszać się!`, Colors.GameState, 'bold');
    let current_time = Date.now();
    players.forEach(player => {
      let player_ext = this.Pid(player.id);
      if (player_ext.afk || !player_ext.afk_maybe) {
        this.setPlayerAvatarTo(player_ext, Emoji.AfkMaybe);
        player_ext.afk_maybe = true;
      } else {
        this.setPlayerAvatarTo(player_ext, '');
      }
      player_ext.activity.game = current_time;
      player_ext.afk = false;
    })
    this.room.stopGame();
    await sleep(125);
    this.shuffleAllPlayers(players);
    // Przydzielanie do drużyn losowo
    players.forEach((player, index) => {
      player.team = index % 2 === 0 ? 1 : 2;
      this.room.setPlayerTeam(player.id, player.team);
    });
    await sleep(125);
    this.selectAppropriateMap(players);
    await sleep(125);
    this.room.startGame();
  }

  shuffleAllPlayers(players: PlayerData[]) {
    // Mieszanie graczy (Fisher-Yates shuffle)
    for (let i = players.length - 1; i > 0; i--) {
      let j = Math.floor(Math.random() * (i + 1));
      [players[i], players[j]] = [players[j], players[i]];
    }
  }

  setMapByName(map_name: string, bg_color: number = 0, ball_color: number = 0, ballPhysics: MapPhysicsType = 'vehax') {
    if (!isValidMap(map_name)) return;
    if (['1', '2', 'f'].includes(map_name)) map_name = 'futsal';
    else if (['3', 'fb'].includes(map_name)) map_name = 'futsal_big';
    else if (['4', 'fh'].includes(map_name)) map_name = 'futsal_huge';
    else if (['n'].includes(map_name)) map_name = 'handball';
    else if (['nb'].includes(map_name)) map_name = 'handball_big';
    else if (['nh'].includes(map_name)) map_name = 'handball_huge';
    else if (['v', 'volley'].includes(map_name)) map_name = 'volleyball';
    else if (['t', 'tenis'].includes(map_name)) map_name = 'tennis';
    if (this.last_selected_map_name !== map_name || this.last_selected_ball !== ballPhysics) {
      let next_map = getMap(map_name, bg_color, ball_color);
      if (!this.volleyball.isEnabled() && !this.tennis.isEnabled() && (this.last_selected_ball !== ballPhysics || this.last_selected_map_name !== map_name)) {
        updateMapPhysics(map_name, next_map, ballPhysics);
        this.last_selected_ball = ballPhysics;
      }
      if (next_map) {
        this.room.setCustomStadiumJson(next_map);
        this.last_selected_map_name = map_name;
      }
    }
  }

  selectAppropriateMap(players: PlayerData[]) {
    let red = 0;
    let blue = 0;
    players.forEach(player => {
      if (player.team == 1) red++;
      else if (player.team == 2) blue++;
    });
    if (red >= 4 && blue >= 4) {
      this.setScoreTimeLimitByMode("4vs4");
      this.setMapByName(this.map_name_huge);
    }  else if ((red >= 2 && blue >= 3) || (red >= 3 && blue >= 2)) {
      this.setScoreTimeLimitByMode("3vs3");
      this.setMapByName(this.map_name_big);
    } else {
      this.setScoreTimeLimitByMode("2vs2");
      this.setMapByName(this.map_name_classic);
    }
  }

  async handleGameStart(byPlayer: PlayerObject | null) {
    this.game_tick_array = [];
    this.pinger.stop();
    this.pl_logger.handleGameStart();
    this.recording.handleGameStart(true);
    this.current_match_state.handleGameStart();
    if (this.tourney_mode) this.fouls.handleGameStart();
    this.last_winner_team = 0;
    this.time_limit_reached = false;
    this.resetPressureStats();
    if (byPlayer) this.Pid(byPlayer.id).admin_stat_start_stop();
    this.acceleration_tasks.reset();
    const now = Date.now();
    for (let p of this.getPlayersExt()) {
      p.activity.game = now;

      if (p.trust_level < 2) { // TODO Debug
        this.setPlayerAvatarTo(p, `<${p.trust_level}`);
      }
    }
    this.gameStopTimerReset();
    this.ball_possesion_tracker.resetPossession();
    if (this.auto_mode) this.auto_bot.handleGameStart(null);
    this.volleyball.handleGameStart();
    this.tennis.handleGameStart();
    let [redTeam, blueTeam] = this.getRedBluePlayerIdsInTeams(this.getPlayersExtList(true));
    this.handball.handleGameStart(redTeam, blueTeam);
    this.matchStatsTimer = setTimeout(() => {
      this.matchStatsTimer = null;
      let anyPlayerProperties = this.getAnyPlayerDiscProperties();
      let ballProperties = this.getBallProperties();
      if (anyPlayerProperties === null || ballProperties === null) {
        hb_log(`ST coś jest null: ${anyPlayerProperties}, ${ballProperties} ${anyPlayerProperties?.radius} `
          + `${anyPlayerProperties?.damping} ${ballProperties?.radius} ${ballProperties?.damping}`);
      }
      this.match_stats.handleGameStart(anyPlayerProperties, ballProperties, redTeam, blueTeam, this.players_ext);
      this.ball_possesion_tracker.updateRadius(anyPlayerProperties, ballProperties, this.tennis.isEnabled()? 9: 6.5);
    }, 1000);
    this.ghost_players.handleGameStart();
    this.kickLongAfkingPlayers();
  }

  getAnyPlayerDiscProperties() {
    for (let [id, player] of this.players_ext) {
      if (player.team) {
        let props = this.room.getPlayerDiscProperties(id);
        if (!props) continue;
        return props;
      }
    }
    return null;
  }

  getBallProperties() {
    return this.room.getDiscProperties(0);
  }

  getBallPosition() {
    return this.room.getBallPosition();
  }

  getRedBluePlayerIdsInTeams(from: PlayerData[]): [number[], number[]] {
    let [redTeam, blueTeam] = this.getRedBluePlayerInTeams(from);
    return [redTeam.map(e => e.id), blueTeam.map(e => e.id)];
  }

  getRedBluePlayerInTeams(from: PlayerData[]): [PlayerData[], PlayerData[]] {
    if (this.auto_mode) return this.getRedBluePLayerInTeamsAutoMode();
    return this.getRedBluePlayerTeamIdsFrom(from);
  }

  getRedBluePLayerInTeamsAutoMode(): [PlayerData[], PlayerData[]] {
    return [this.auto_bot.R(), this.auto_bot.B()];
  }

  getRedBluePlayerTeamIdsFrom(players: PlayerData[]): [PlayerData[], PlayerData[]] {
    let redTeam: PlayerData[] = [];
    let blueTeam: PlayerData[] = [];
    players.forEach(player => {
      if (player.team == 1) redTeam.push(player);
      else if (player.team == 2) blueTeam.push(player);
    });
    return [redTeam, blueTeam];
  }

  async handleGameStop(byPlayer: PlayerObject | null) {
    this.pinger.start();
    this.pl_logger.handleGameStop();
    this.delay_joiner.handleGameStop();
    this.current_match_state.handleGameStop();
    if (byPlayer) this.Pid(byPlayer.id).admin_stat_start_stop();
    const MaxAllowedGameStopTime = 20.0 * 1000; // [ms]
    const now = Date.now();
    this.last_player_team_changed_by_admin_time = now;
    this.gamePauseTimerReset();
    this.gameStopTimerReset();
    this.matchStatsTimerReset();
    this.sendCommandsAfterGameStop();
    this.rejoice_maker.handleGameStop();
    this.gatekeeper.handleGameStop();
    this.ghost_players.handleGameStop();
    const recorded = this.recording.handleGameStop(this.auto_bot.isRanked() || this.tennis.isEnabled() || this.force_recording_enabled);
    const recFilename = recorded ? this.recording.getFilename() : '';
    if (recFilename.length && this.tourney_mode) {
        //TODO XX
        hb_log(`Tourney match: ${recFilename}`);
    }
    for (let p of this.getPlayersExt()) {
      p.activity.game = now;
    }
    let doUpdateState = false;
    let fullTimeMatchPlayed = true;
    let currentMatch = this.auto_bot.M();
    if (this.auto_mode) {
      this.auto_bot.handleGameStop(null);
      this.match_stats.setWinner(currentMatch.winnerTeam as 1|2);
      fullTimeMatchPlayed = this.auto_bot.wasFullTimeMatchPlayed();
      if (currentMatch.matchStatsState == MatchStatsProcessingState.ranked) doUpdateState = true;
    } else {
      doUpdateState = true;
      if (this.scores) {
        if (this.scores.red > this.scores.blue) this.match_stats.setWinner(1);
        else if (this.scores.blue > this.scores.red) this.match_stats.setWinner(2);
      }
    }
    if (doUpdateState) {
      let matchPlayerStats = this.match_stats.updatePlayerStats(this.players_ext_all, fullTimeMatchPlayed);
      if (matchPlayerStats.size) {
        if (this.auto_mode) this.updatePlayerLeftState(matchPlayerStats, currentMatch);
        this.updateAccumulatedPlayerStats(matchPlayerStats, currentMatch, fullTimeMatchPlayed, recFilename);
        if (this.auto_mode) currentMatch.matchStatsState = MatchStatsProcessingState.updated;
      }
    }
    this.scores = null;

    this.game_stopped_timer = setInterval(() => {
      this.current_date_obj = new Date();
      let current_time = this.current_date_obj.getTime();
      this.current_time = current_time; // update time here also
      if (this.auto_mode) return;
      let random_new_admin = false;
      for (let p of this.getPlayersExt()) {
        if (current_time - this.last_player_team_changed_by_admin_time > MaxAllowedGameStopTime) {
          if (!p.afk && p.admin && current_time - p.activity.chat > MaxAllowedGameStopTime) {
            random_new_admin = true;
          }
        }
      }
      if (random_new_admin) {
        this.last_player_team_changed_by_admin_time = current_time;
        this.sendMsgToAll(`Zaden admin nie wystartował jeszcze gry, losowanie nowego admina, nie śpimy!`, Colors.GameState);
        this.addNewAdmin();
      }
    }, 1000);
  }

  sendCommandsAfterGameStop() {
    for (let [playerId, player] of this.players_ext) {
      let cmd = player.command_after_match_ends;
      if (cmd.length) {
        this.handlePlayerChatExt(player, cmd);
        player.command_after_match_ends = '';
      }
    }
  }

  updatePlayerLeftState(matchPlayerStats: Map<number, PlayerMatchStatsData>, currentMatch: Match) {
    for (let [playerId, statInMatch] of currentMatch.getPlayerInMatchStats()) {
      let stat = this.player_stats.get(playerId);
      if (!stat) continue;
      let p = matchPlayerStats.get(playerId);
      if (!p) continue;
      if (statInMatch.leftDueTo === PlayerLeavedDueTo.afk) {
        p.left_afk++;
        stat.counterAfk++;
      } else if (statInMatch.leftDueTo === PlayerLeavedDueTo.leftServer) {
        p.left_server++;
        stat.counterLeftServer++;
      } else if (statInMatch.leftDueTo === PlayerLeavedDueTo.voteKicked) {
        p.left_votekick++;
        stat.counterVoteKicked++;
      }
    }
  }

  getSelectorFromMatch(match: Match): GameModeType {
    const selector = match.matchType;
    if (selector !== 'none') return selector;
    return this.room_config.selector;
  }

  async updateAccumulatedPlayerStats(matchPlayerStats: Map<number, PlayerMatchStatsData>, currentMatch: Match,
    fullTimeMatchPlayed: boolean, recFilename: string) {
    const selector = this.getSelectorFromMatch(currentMatch);
    hb_log(`Aktualizujemy accumulated match stats dla ${matchPlayerStats.size} selector: ${selector}`);
    let updatedAuthIds: Set<string> = new Set<string>();
    for (let playerId of matchPlayerStats.keys()) {
      updatedAuthIds.add(this.players_ext_all.get(playerId)!.auth_id);
    }
    for (let authId of updatedAuthIds) {
      let sId = this.player_stats_auth.get(authId)!;
      if (sId === undefined) continue;
      let stat = this.player_stats.get(sId);
      if (!stat) continue;
      let playerExt = this.Pid(stat.id);
      if (playerExt.trust_level) {
        this.game_state.updateTotalPlayerMatchStats(selector, authId, stat, matchPlayerStats.get(stat.id)!)
          .then(() => {
            this.game_state.loadTotalPlayerMatchStats(selector, authId)
              .then(result => result && this.assignPlayerMatchStats(stat, result))
              .catch((e) => hb_log(`!! loadTotalPlayerMatchStats error: ${e}`));
          }).catch((e) => hb_log(`!! updatePlayerMatchStats error: ${e}`));
      }
    }
    if (this.auto_mode) {
      hb_log(`Aktualizujemy match player stats dla ${matchPlayerStats.size}`);
      this.game_state.insertNewMatch(selector, currentMatch, fullTimeMatchPlayed).then((matchId) => {
        if (matchId >= -1) {
          currentMatch.matchId = matchId;
          this.recording.linkMatch(recFilename, matchId);
        }
        hb_log(`inserted new match with matchId=${matchId}/${currentMatch.matchId} for ${selector}`);
        for (let authId of updatedAuthIds) {
          let sId = this.player_stats_auth.get(authId)!;
          if (sId === undefined) continue;
          let stat = this.player_stats.get(sId)!;
          let teamId: 1 | 2 = currentMatch.redTeam.includes(stat.id) ? 1 : 2;
          this.game_state.insertNewMatchPlayerStats(selector, matchId, authId, teamId, stat.currentMatch)
            .catch((e: any) => e && hb_log(`!! insertNewMatchPlayerStats error: ${e}`));
        }
      }).catch((e) => e && hb_log(`!! insertNewMatch error: ${e}`));
    }
  }

  async handleGamePause(byPlayer: PlayerObject | null) {
    if (byPlayer) this.Pid(byPlayer.id).admin_stat_pause_unpause();
    this.sendMsgToAll('Za chwilę kontynuujemy grę!', Colors.GameState);
    const MaxAllowedGamePauseTime = 10.0 * 1000; // [ms]
    this.game_paused_timer = setTimeout(() => {
      this.gamePauseTimerReset();
      this.room.pauseGame(false);
      let now = Date.now();
      for (let p of this.getPlayersExt()) {
        p.activity.game = now;
      }
      this.sendMsgToAll('Koniec przerwy, gramy dalej!', Colors.GameState);
    }, MaxAllowedGamePauseTime);
    if (this.auto_mode) this.auto_bot.handleGamePause(null);
  }

  async handleGameUnpause(byPlayer: PlayerObject | null) {
    if (byPlayer) this.Pid(byPlayer.id).admin_stat_pause_unpause();
    this.gamePauseTimerReset();
    if (this.auto_mode) this.auto_bot.handleGameUnpause(null);
  }

  gameStopTimerReset() {
    if (this.game_stopped_timer != null) {
      clearInterval(this.game_stopped_timer);
      this.game_stopped_timer = null;
    }
  }

  gamePauseTimerReset() {
    if (this.game_paused_timer != null) {
      clearTimeout(this.game_paused_timer);
      this.game_paused_timer = null;
    }
  }

  matchStatsTimerReset() {
    if (this.matchStatsTimer != null) {
      clearTimeout(this.matchStatsTimer);
      this.matchStatsTimer = null;
    }
  }

  updateAdmins(leaving_player: PlayerObject | null, only_if_all_afk = true) {
    if (this.auto_mode) return;
    let new_admin: PlayerData | null = null;
    let new_admin_trust_level = -1;
    let players: PlayerData[] = this.getPlayersExtList(true);
    if (players.length == 1) {
      if (!players[0].admin) this.giveAdminTo(players[0]);
      return;
    }
    let any_active_admin = false;
    let any_active_trusted_admin = false;
    let non_trusted_admins: PlayerData[] = [];
    for (let i = 0; i < players.length; i++) {
      let player_ext = players[i];
      if (player_ext.admin && player_ext.trust_level == 0) non_trusted_admins.push(player_ext);
      if (leaving_player != null && leaving_player.id == player_ext.id) continue;
      if (player_ext.afk || player_ext.afk_maybe) continue;
      if (!player_ext.admin) {
        if (player_ext.trust_level > new_admin_trust_level) {
          new_admin = player_ext;
          new_admin_trust_level = player_ext.trust_level;
        } else if (player_ext.trust_level == new_admin_trust_level && new_admin && player_ext.join_time < new_admin.join_time) {
          new_admin = player_ext;
        } else if (player_ext.trust_level == new_admin_trust_level && !new_admin) {
          new_admin = player_ext;
        }
      }
      if (player_ext.admin) any_active_admin = true;
      if (player_ext.admin && player_ext.trust_level > 0) any_active_trusted_admin = true;
    }

    if (!new_admin) {
      // handle back from AFK
      if (any_active_trusted_admin) non_trusted_admins.forEach(p => { this.takeAdminFrom(p); });
      return;
    }

    if (!only_if_all_afk) {
      non_trusted_admins.forEach(p => { this.takeAdminFrom(p); });
      this.giveAdminTo(new_admin);
      return;
    }
    if (!any_active_admin) {
      non_trusted_admins.forEach(p => { this.takeAdminFrom(p); });
      this.giveAdminTo(new_admin);
      return;
    }
    if (new_admin.trust_level == 0) return;
    non_trusted_admins.forEach(p => { this.takeAdminFrom(p); });
    if (any_active_trusted_admin) return;
    this.giveAdminTo(new_admin);
  }

  addNewAdmin() {
    this.updateAdmins(null, false);
  }

  giveAdminTo(player: PlayerObject | PlayerData) {
    this.room.setPlayerAdmin(player.id, true);
    let player_ext = this.Pid(player.id);
    if (!player_ext.admin_stats) player_ext.admin_stats = new AdminStats();
    else player_ext.admin_stats.since_now();
    this.sendMsgToPlayer(player, `Wielka władza to równie wielka odpowiedzialność! Jesteś Adminem!`, Colors.Admin, undefined, 2);
    hb_log(`# Admin granted for: ${player_ext.name}`);
  }

  takeAdminFrom(player: PlayerObject | PlayerData) {
    this.room.setPlayerAdmin(player.id, false);
    let p = this.Pid(player.id);
    let s = p.admin_stats;
    hb_log(`# Admin taken for: ${player.name}`);
  }

  giveAdminToPlayerWithName(playerName: string) {
    let cmdPlayer = this.getPlayerDataByName(playerName, null);
    if (cmdPlayer != null) {
      hb_log(`# Giving admin by name to ${playerName}`);
      this.giveAdminTo(cmdPlayer);
    } else {
      hb_log(`Player ${playerName} not found`);
    }
  }

  filterOutHostInfo(player: PlayerObject) {
    // config.hostAuthId
    if ((player.auth && player.auth === config.hostAuthId) || (player.conn && player.conn === config.hostConnId)) {
      player.real_ip = '127.0.0.1';
      player.conn = '3132372E302E302E31';
    }
  }

  async handlePlayerJoin(player: PlayerObject) {
    this.players_num += 1;
    this.filterOutHostInfo(player);
    hb_log(`# (n:${this.players_num}) joined to server: ${player.name} [${player.id}] auth: ${player.auth} conn: ${player.conn} ip: ${player.real_ip}`, true);
    this.players_ext.set(player.id, new PlayerData(player));
    this.players_ext_all.set(player.id, this.players_ext.get(player.id)!);
    let playerExt = this.Pid(player.id);
    if (this.room_config.mapSet === 'handball') playerExt.selected_ball = this.default_selected_ball;
    if (player.country && player.country.length) {
      if (player.country.toLowerCase() === 'pl') playerExt.flag = '🇵🇱';
      else playerExt.flag = '🇪🇺';
    }
    if (player.real_ip && player.real_ip.length) {
      playerExt.real_ip = player.real_ip.toString();
    }

    this.pl_logger.handlePlayerJoin(playerExt);
    this.discord_account.handlePlayerJoin(playerExt);
    await this.discord_account.oneTimePlayerNameSetup(playerExt);

    if (this.checkForDiscordAccountNameValidity(playerExt)) return;
    if (this.players_game_state_manager.checkIfPlayerIsNotTimeKicked(playerExt)) return;
    if (this.checkIfPlayerNameContainsNotAllowedChars(playerExt)) return;
    if (this.checkIfDotPlayerIsHost(playerExt)) return;
    if (this.checkForPlayerDuplicate(playerExt)) return;
    try {
      let result = await this.game_state.getTrustAndAdminLevel(playerExt);
      playerExt.trust_level = result.trust_level;
      playerExt.admin_level = result.admin_level;
      if (this.checkForPlayerNameDuplicate(playerExt)) return; // check here to check also trust level
      if (this.allow_connecting_only_trusted && !playerExt.trust_level) {
        let whitelisted = false;
        this.whitelisted_nontrusted_player_names.forEach(player_name_prefix => {
          if (playerExt.name.startsWith(player_name_prefix)) whitelisted = true;
        });
        if (!whitelisted) {
          this.kickPlayerByServer(playerExt, "I don't trust in You!");
          return;
        }
      }
      if (playerExt.auth_id && playerExt.trust_level == 0) {
        this.captcha.askCaptcha(playerExt);
      }
      if (!playerExt.trust_level && this.auto_temp_trust) {
        playerExt.trust_level = 1;
        this.temporarily_trusted.add(playerExt.id);
      }
      this.player_ids_by_auth.set(playerExt.auth_id, playerExt.id);
      this.player_names_by_auth.set(playerExt.auth_id, playerExt.name);
      this.player_ids_by_normalized_name.set(playerExt.name_normalized, playerExt.id);
      this.game_state.insertPlayerName(playerExt.auth_id, playerExt.name).then(() => {
        this.game_state.getPlayerNameInfo(playerExt.auth_id).then((entry) => {
          if (entry) {
            playerExt.user_id = entry.id;
            playerExt.claimed = entry.claimed;
          }
        }).catch((e) => hb_log(`!! getPlayerNameInfo error: ${e}`));
      }).catch((e) => { hb_log(`!! insertPlayerName error: $${e}`) });
      this.vip_options.handlePlayerJoin(playerExt);
      this.updateAdmins(null);
      await this.loadPlayerStat(playerExt);
      if (this.gatekeeper.handlePlayerJoin(playerExt)) return;
      if (this.auto_mode && !this.tourney_mode) this.delay_joiner.handlePlayerJoin(playerExt);
      this.rejoice_maker.handlePlayerJoin(playerExt);
      this.welcome_message.sendWelcomeMessage(playerExt, this.players_ext);
      this.pl_logger.handlePlayerJoinWithIp(playerExt, this.players_ext);
      if (this.no_x_for_all) this.room.setPlayerNoX(playerExt.id, true);
      const initialMute = playerExt.trust_level < 2;
      this.anti_spam.addPlayer(playerExt, initialMute);
      if (this.anti_spam.enabled && initialMute) {
        this.sendMsgToPlayer(player, `Jesteś wyciszony na 30 sekund; You are muted for 30 seconds`, Colors.Admin, 'bold');
      }
      if (playerExt.trust_level < 2) {
        this.setPlayerAvatarTo(playerExt, `<${playerExt.trust_level}`);
      }
      // this.sendOnlyTo(player, `Mozesz aktywować sterowanie przyciskami (Link: https://tinyurl.com/HaxballKeyBinding): Lewy Shift = Sprint, A = Wślizg`, 0x22FF22);
      this.sendMsgToPlayer(player, `Sprawdź dostępne komendy: !help !wyb !sklep`, Colors.Help);
    } catch (e) {
      hb_log(`!! getTrustAndAdminLevel error: ${e}`);
    }
    this.kickAfkPlayerWhenSomePlayerJoined();
  }

  async loadPlayerStat(playerExt: PlayerData) {
    this.player_stats.set(playerExt.id, playerExt.stat);
    let glickoPlayer: Glicko2.Player|undefined = this.glicko_players.get(playerExt.auth_id);
    if (glickoPlayer) { // get cached data
      hb_log(`#ST# get cached for ${playerExt.name}  ${playerExt.auth_id}`);
      const idx = this.player_stats_auth.get(playerExt.auth_id);
      if (idx !== undefined && idx !== null) {
        let stat = this.player_stats.get(idx);
        if (stat) {
          hb_log(`#ST# get prev stat`);
          stat.id = playerExt.id;
          playerExt.stat = stat;
          this.player_stats.set(playerExt.id, playerExt.stat);
        }
      }
      playerExt.stat.updatePlayer(glickoPlayer);
      return;
    }
    glickoPlayer = this.glicko.makePlayer(PlayerStat.DefaultRating, PlayerStat.DefaultRd, PlayerStat.DefaultVol);
    hb_log(`#ST# create for ${playerExt.name}  ${playerExt.auth_id} ${glickoPlayer}`);
    this.glicko_players.set(playerExt.auth_id, glickoPlayer);
    this.player_stats_auth.set(playerExt.auth_id, playerExt.id);
    playerExt.stat.updatePlayer(glickoPlayer);
    if (playerExt.trust_level) {
      let rating = await this.game_state.loadPlayerRating(this.room_config.selector, playerExt.auth_id);
      if (rating) {
        this.assignPlayerRating(playerExt, rating);
      }
      let stats = await this.game_state.loadTotalPlayerMatchStats(this.room_config.selector, playerExt.auth_id)
      if (stats) {
        this.assignPlayerMatchStats(playerExt.stat, stats);
      }
    }
  }

  assignPlayerRating(playerExt: PlayerData, ratingData: PlayerRatingData|null) {
    if (!ratingData) return;
    let g = playerExt.stat.glickoPlayer!;
    g.setRating(ratingData.mu);
    g.setRd(ratingData.rd);
    g.setVol(ratingData.vol);
  }

  assignPlayerMatchStats(stat: PlayerStat, playerMatchStats: PlayerMatchStatsData|null) {
    if (!playerMatchStats) return;
    stat.games = playerMatchStats.games;
    stat.fullGames = playerMatchStats.full_games;
    stat.wins = playerMatchStats.wins;
    stat.fullWins = playerMatchStats.full_wins;
    stat.goals = playerMatchStats.goals;
    stat.assists = playerMatchStats.assists;
    stat.ownGoals = playerMatchStats.own_goals;
    stat.playtime = playerMatchStats.playtime;
    stat.cleanSheets = playerMatchStats.clean_sheets;
    stat.counterAfk = playerMatchStats.left_afk;
    stat.counterVoteKicked = playerMatchStats.left_votekick;
    stat.counterLeftServer = playerMatchStats.left_server;
  }

  kickAfkPlayerWhenSomePlayerJoined() {
    let playersNum = this.players_ext.size;
    if (playersNum <= this.room_config.playersInTeamLimit * 3) return;
    const now = Date.now();
    let afking = Array.from(this.players_ext.values())
      .filter(e => e.afk || e.afk_maybe)
      .sort((a, b) => a.afk_switch_time - b.afk_switch_time);
    if (afking.length === 0) return;
    if (playersNum === this.room_config.maxPlayers) {
      this.kickPlayerByServer(afking[0], "AFK, full");
    }
  }

  kickTheLongestAfkPlayerOnFullServer() {
    return this.kickSomeAfkPlayers(1);
  }

  kickLongAfkingPlayers() {
    return this.kickSomeAfkPlayers(2);
  }

  kickSomeAfkPlayers(mode: 1|2) {
    let playersNum = this.players_ext.size;
    if (playersNum <= this.room_config.playersInTeamLimit * 3) return;
    const now = Date.now();
    let afking = Array.from(this.players_ext.values())
      .filter(e => e.afk || e.afk_maybe)
      .filter(e => !this.isPlayerIdHost(e.id))
      .sort((a, b) => a.afk_switch_time - b.afk_switch_time);
    if (afking.length === 0) return;
    if (mode === 1) {
      if (playersNum === this.room_config.maxPlayers) {
        this.kickPlayerByServer(afking[0], "AFK, full");
      }
      return;
    }
    for (let player of afking) {
      if (!player.vip_data.afk_mode && now - player.afk_switch_time > this.max_afk_time_minutes * 60 * 1000) {
        this.kickPlayerByServer(player, "AAAAAAFK");
      }
    }
  }

  checkForDiscordAccountNameValidity(player: PlayerData) {
    if (!this.discord_account.checkAccountNameValidity(player)) {
      this.kickPlayerByServer(player, "Fake!");
      return true;
    }
    return false;
  }

  checkIfPlayerNameContainsNotAllowedChars(player: PlayerData) {
    if ('﷽' === player.name) return false; // there is such player with that name so it is olny exception :)
    if (this.containsWideCharacters(player.name)) {
      this.kickPlayerByServer(player, "Zmień nick! ﷽");
      return true;
    }
    if (player.name.startsWith('@')) {
      this.kickPlayerByServer(player, "Change nick! @ na początku?");
      return true;
    }
    if (player.name.startsWith(' ') || player.name.endsWith(' ') || player.name_normalized.replaceAll('_', '').length === 0) {
      this.kickPlayerByServer(player, "Change nick, Mr SpaceBarr!");
      return true;
    }
    return false;
  }

  checkIfDotPlayerIsHost(player: PlayerData) {
    if (player.name.trim() === '.' && !this.isPlayerHost(player)) {
      this.kickPlayerByServer(player, "Kropka Nienawiści!");
      return true;
    }
    return false;
  }

  checkForPlayerDuplicate(player: PlayerData) {
    if (this.player_duplicate_allowed) return false;
    let kicked = false;
    let player_auth = player.auth_id || '';
    for (let p of this.getPlayersExt()) {
      if (p.id != player.id) {
        if (p.auth_id === player_auth) {
          this.kickPlayerByServer(player, "One tab, one brain!");
          kicked = true;
          break;
        }
      }
    }
    return kicked;
  }

  checkForPlayerNameDuplicate(joiningPlayer: PlayerData) {
    let kicked = false;
    for (let p of this.getPlayersExt()) {
      if (p.id != joiningPlayer.id) {
        if (p.name_normalized === joiningPlayer.name_normalized) {
          if (joiningPlayer.trust_level > p.trust_level)
            this.kickPlayerByServer(p, "Nope, not you.");
          else
            this.kickPlayerByServer(joiningPlayer, "Change nick! Duplicated...");
          kicked = true;
          break;
        }
      }
    }
    return kicked;
  }

  async handlePlayerLeave(player: PlayerObject) {
    this.players_num -= 1;
    hb_log(`# (n:${this.players_num}) left server: ${player.name} [${player.id}]`, true);
    this.updateAdmins(player);
    this.handleEmptyRoom(player);
    this.last_command.delete(player.id);
    this.removePlayerMuted(player);
    let playerExt = this.Pid(player.id);
    this.match_stats.handlePlayerLeave(playerExt);
    this.delay_joiner.handlePlayerLeave(playerExt);
    this.pl_logger.handlePlayerLeave(playerExt);
    if (this.auto_mode) this.auto_bot.handlePlayerLeave(playerExt);
    playerExt.ignored_by.forEach(playerId => {
      this.Pid(playerId).ignores.delete(playerExt.id);
    })
    playerExt.mark_disconnected();
    this.players_ext.delete(player.id);
  }

  async handleEmptyRoom(leavingPlayer: PlayerObject) {
    var players = this.getPlayers();
    if (players.length == 0 || players.length == 1 && leavingPlayer.id == players[0].id) {
      this.room.stopGame();
      await sleep(125);
      this.setMapByName(this.default_map_name);
    }
  }

  setDefaultScoreTimeLimit() {
    this.setScoreTimeLimitByMode("2vs2");
  }

  setScoreTimeLimit(score: number, time: number) {
    this.room.setScoreLimit(score);
    this.room.setTimeLimit(time);
  }

  setScoreTimeLimitByMode(gameMode: GameModeType) {
    this.room.setScoreLimit(this.room_config.limits[gameMode].score);
    this.room.setTimeLimit(this.room_config.limits[gameMode].time);
  }

  setDefaultKickRateLimit() {
    const valid_min = 2;
    const valid_rate = 15;
    const valid_burst = 3;
    this.room.setKickRateLimit(valid_min, valid_rate, valid_burst);
  }

  async handleKickRateLimitSet(min: number, rate: number, burst: number, byPlayer: PlayerObject | null) {
    if (byPlayer) {
      this.setDefaultKickRateLimit();
    }
  }

  async handleTeamsLockChange(locked: boolean, byPlayer: PlayerObject | null) {
    if (byPlayer) this.Pid(byPlayer.id).admin_stat_other();
    if (!locked) this.room.setTeamsLock(true);
  }

  async handleStadiumChange(newStadiumName: string, byPlayer: PlayerObject | null) {
    if (byPlayer) {
      this.Pid(byPlayer.id).admin_stat_other();
      this.sendMsgToPlayer(byPlayer, 'Sprawdź komendę !m do zmiany mapy, np 2v2: !m 2, 3v3: !m 3');
    }
    const t = BuyCoffee.buy_coffe_link;
    this.feature_pressure_stadium = true;
    if (`${t} Classic BAR` === newStadiumName) this.last_selected_map_name = 'classic';
    else if (`${t} Big BAR` === newStadiumName) this.last_selected_map_name = 'big';
    else if (`${t} 2 Vehax` === newStadiumName) this.last_selected_map_name = 'futsal';
    else if (`${t} 3 Vehax` === newStadiumName) this.last_selected_map_name = 'futsal_big';
    else if (`${t} 4 Vehax` === newStadiumName) this.last_selected_map_name = 'futsal_huge';
    else if (`${t} 2 Handball` === newStadiumName) this.last_selected_map_name = 'handball';
    else if (`${t} 3 Handball` === newStadiumName) {
      if (this.room_config.playersInTeamLimit === 4 && this.auto_bot.getCurrentLimit() === 4) {
        // stupid fix, but maybe auto update limit while game?!?!
        this.last_selected_map_name = 'handball_huge';
      } else {
        this.last_selected_map_name = 'handball_big';
      }
    } else if (`${t} 4 Handball` === newStadiumName) this.last_selected_map_name = 'handball_huge';
    else {
      this.feature_pressure_stadium = false;
      this.last_selected_map_name = '';
    }
  }

  async handlePlayerAdminChange(changedPlayer: PlayerObject, byPlayer: PlayerObject | null) {
    if (changedPlayer && !changedPlayer.name) return; // room init
    let changedPlayerExt = this.P(changedPlayer);
    let byPlayerExt = byPlayer ? this.P(byPlayer) : null;
    if (byPlayerExt) byPlayerExt.admin_stat_admin();
    if (changedPlayerExt.admin) {
      if (!changedPlayerExt.admin_stats) {
        changedPlayerExt.admin_stats = new AdminStats();
      }
      changedPlayerExt.admin_stats.given_by = byPlayer?.name || 'ROOM';
      changedPlayerExt.admin_stats.since_now();
    } else {
      if (changedPlayerExt.admin_stats) {
        changedPlayerExt.admin_stats.taken_by = byPlayer?.name || 'ROOM';
        changedPlayerExt.admin_stats.active = false;
      }
    }
    if (!byPlayerExt) return;
    if (byPlayerExt.id == changedPlayerExt.id) {
      this.updateAdmins(null); // TODO not tested
      return;
    }
    if (byPlayerExt.trust_level == 0) {
      // untrusted
      this.room.setPlayerAdmin(byPlayerExt.id, false);
      if (!changedPlayerExt.admin) {
        this.room.setPlayerAdmin(changedPlayerExt.id, true);
      }
    } else if (byPlayerExt.trust_level > 0 && changedPlayerExt.trust_level == 0) {
      this.room.setPlayerAdmin(changedPlayerExt.id, false);
    }
  }

  giveAdminSomeRestAfterKicking(player: PlayerData, msg: string, forSeconds: number = 15) {
    this.room.setPlayerAdmin(player.id, false);
    this.sendMsgToPlayer(player, msg, Colors.Warning);
    player.timer_give_back_admin = setTimeout(() => {
      this.room.setPlayerAdmin(player.id, true);
    }, forSeconds * 1000);
  }

  async handlePlayerKicked(kickedPlayer: PlayerObject, reason: string, ban: boolean, byPlayer: PlayerObject | null) {
    let fastKicks = false;
    if (byPlayer) {
      hb_log(`# Kicked(ban:${ban ? "1" : "0"}): ${kickedPlayer.name} by: ${byPlayer.name} for: ${reason}`, true);
      let byPlayerExt = this.P(byPlayer);
      if (byPlayerExt.admin_stats) {
        if (ban) byPlayerExt.admin_stats.banned_users.add(kickedPlayer.name);
        else byPlayerExt.admin_stats.kicked_users.add(kickedPlayer.name);
        byPlayerExt.admin_stats.action_kick += 1;
        fastKicks = byPlayerExt.admin_stats.add_kick_timestamp();
      }
      let kickedPlayerExt = this.P(kickedPlayer);
      if (byPlayerExt.trust_level === 0) {
        this.kickPlayerByServer(byPlayerExt, 'Nie kickuj!');
      } else if (kickedPlayerExt.trust_level > byPlayerExt.trust_level) {
        this.giveAdminSomeRestAfterKicking(byPlayerExt, "Weź głęboki oddech :)");
      } else if (fastKicks) {
        this.giveAdminSomeRestAfterKicking(byPlayerExt, "Weź trzy głębokie oddechy i spójrz w okno :)");
      }
      this.players_game_state_manager.logKicked(kickedPlayerExt, byPlayerExt);
    }
    if (ban) {
      this.room.clearBan(kickedPlayer.id); // TODO idk how to handle that
    }
  }

  async handlePlayerTeamChange(changedPlayer: PlayerObject, byPlayer: PlayerObject | null) {
    if (changedPlayer && !changedPlayer.name) return;
    let changedPlayerExt = this.P(changedPlayer);
    changedPlayerExt.activity.updateGame(this.current_time); // reset timer
    if (changedPlayerExt.team != 0) {
      if (changedPlayerExt.afk) {
        if (byPlayer != null) {
          // TODO block it?
          changedPlayerExt.afk_maybe = true;
          this.setPlayerAvatarTo(changedPlayerExt, Emoji.AfkMaybe);
          this.sendMsgToPlayer(byPlayer, `${changedPlayerExt.name} był AFK! Czy na pewno wrócił?`, Colors.Afk);
        }
      }
    }
    if (byPlayer != null) {
      this.last_player_team_changed_by_admin_time = Date.now();
      let byPlayerExt = this.P(byPlayer);
      byPlayerExt.activity.updateChat(this.current_time);
      byPlayerExt.activity.updateMove(this.current_time);
      byPlayerExt.admin_stat_team();
    }
    if (this.auto_mode) this.auto_bot.handlePlayerTeamChange(changedPlayerExt);
    this.handball.handlePlayerTeamChange(changedPlayerExt);
    let [redTeam, blueTeam] = this.getRedBluePlayerIdsInTeams(this.getPlayersExtList(true));
    this.match_stats.handlePlayerTeamChange(this.P(changedPlayer), redTeam, blueTeam);
  }

  async handlePlayerActivity(player: PlayerObject) {
    let playerExt = this.Pid(player.id);
    playerExt.activity.updateGame(this.current_time);
    playerExt.activity.updateMove(this.current_time);
    if (playerExt.isAfk()) {
      playerExt.afk = false;
      playerExt.afk_maybe = false;
      // TODO AM player is back
    }
    if (playerExt.avatar.length) {
      if (playerExt.trust_level < 2) { // TODO Debug
        this.setPlayerAvatarTo(playerExt, `<${playerExt.trust_level}`);
      } else this.setPlayerAvatarTo(playerExt, ''); // reset here not afk
    }
  }

  async handlePlayerBallKick(player: PlayerObject) {
    const ballPosition = this.getBallPosition();
    this.match_stats.handlePlayerBallKick(this.P(player), ballPosition);
    if (this.volleyball.isEnabled()) {
      let [redTeam, blueTeam] = this.getRedBluePlayerIdsInTeams(this.getPlayersExtList(true));
      this.volleyball.handlePlayerBallKick(this.current_time, this.Pid(player.id), redTeam, blueTeam);
    } else if (this.tennis.isEnabled()) {
      let [redTeam, blueTeam] = this.getRedBluePlayerIdsInTeams(this.getPlayersExtList(true));
      this.tennis.handlePlayerBallKick(this.current_time, this.Pid(player.id), redTeam, blueTeam);
    }
  }

  async handleTeamGoal(team: TeamID) {
    this.current_match_state.handleTeamGoal();
    if (this.tourney_mode) this.fouls.handleTeamGoal(team);
    this.ball_possesion_tracker.onTeamGoal(team);
    if (this.auto_mode) this.auto_bot.handleTeamGoal(team);
    this.volleyball.handleTeamGoal(team);
    this.tennis.handleTeamGoal(team);
    this.handball.handleTeamGoal(team);
    const ballProperties = this.getBallProperties();
    let [redTeam, blueTeam] = this.getRedBluePlayerIdsInTeams(this.getPlayersExtList(true));
    if (team) {
      let [txt, scorer, assister, ownGoal] = this.match_stats.handleTeamGoal(team, ballProperties, this.players_ext_all, redTeam, blueTeam);
      this.rejoice_maker.handleTeamGoal(scorer, assister, ownGoal);
      if (this.volleyball.isEnabled()) txt = this.volleyball.getTeamGoalText(scorer, assister, ownGoal, this.players_ext_all);
      this.sendMsgToAll(txt, Colors.Goal, 'italic');
    }
  }

  async handleTeamVictory(scores: ScoresObject) {
    this.current_match_state.handleTeamVictory();
    if (scores.red > scores.blue) this.last_winner_team = 1;
    else if (scores.blue > scores.red) this.last_winner_team = 2;
    else this.last_winner_team = 0;
    if (this.auto_mode) this.auto_bot.handleTeamVictory(scores);
    // TODO add also (simplified?) ratings for disabled auto_mode
  }

  async updateRatingsAndTop10(inMatch: Match) {
    if (this.auto_mode) {
      if (this.auto_bot.isRanked() || this.ratings_for_all_games) {
        try {
          const selector = this.getSelectorFromMatch(inMatch);
          hb_log(`Aktualizujemy teraz dane w bazie, najpierw czytamy z bazy dla ${selector}`);
          await this.gePlayersRatingWhichPlayedInMatch(inMatch);
          hb_log(`Aktualizujemy teraz dane w bazie, teraz liczymy dla ${selector}`);
          this.ratings.calculateNewPlayersRating(inMatch, this.player_stats);
          let saved = 0;
          let redTeamStr = '';
          let blueTeamStr = '';
          const separator = '🔸';
          const muToStr = (oldMu: number, newMu: number, penalty: number) => {
            let str = `${Math.floor(oldMu)}${newMu - oldMu >= 0 ? '+' : ''}${Math.floor(newMu - oldMu)}`;
            if (penalty > 0) str += `-${penalty}`;
            return str;
          }
          let rankChanges: MatchRankChangesEntry[] = [];
          for (const [playerId, newRd, oldMu, newMu, penalty] of this.ratings.results) {
            let playerExt = this.players_ext_all.get(playerId)!;
            rankChanges.push({
              match_id: -1, auth_id: playerExt.auth_id,
              old_rd: Math.floor(newRd), old_mu: Math.floor(oldMu), new_mu: Math.floor(newMu), penalty: penalty
            });
            if (inMatch.redTeam.includes(playerId))
              redTeamStr += (redTeamStr ? separator : '') + muToStr(oldMu, newMu, penalty);
            else if (inMatch.blueTeam.includes(playerId))
              blueTeamStr += (blueTeamStr ? separator : '') + muToStr(oldMu, newMu, penalty);

            let stat = this.player_stats.get(playerExt.id)!;
            if (!playerExt.trust_level) {
              // this.autoTrustByPlayerGames(playerExt, stat);
              continue;
            }
            let g = stat.glickoPlayer!;
            this.game_state.updatePlayerRating(selector, playerExt.auth_id, newMu, newMu - oldMu, newRd, g.getVol())
              .catch((e: any) => hb_log(`!! updatePlayerRating ${selector} error: ${e}`));
            saved++;
          }
          this.updateRankChanges(inMatch, rankChanges).catch((e) => hb_log(`!! updateRankChanges ${selector} error: ${e}`));
          let predictedWinner = this.ratings.expectedScoreRed >= 50 ? '🔴' : '🔵';
          let predictedP = Math.round(this.ratings.expectedScoreRed);
          if (predictedP < 50) predictedP = 100 - predictedP;
          const txt = `🔴${redTeamStr}⚔️${blueTeamStr}🔵 Przewidywano zwycięstwo ${predictedWinner}${predictedP}%`;
          hb_log(txt);
          this.sendMsgToAll(txt, Colors.GameState, 'italic');
          this.updateTop10();
          hb_log(`Aktualizujemy - zrobione (${saved}/${this.ratings.results.length})!`);
        } catch (e) { hb_log(`!! updateRatingsAndTop10 error: ${e}`) };
        // inc penalty counter
        try {
          this.ratings.penaltySavedFor.forEach(playerId => {
            let playerExt = this.Pid(playerId);
            hb_log(`PenaltyCounter inc ${playerExt.name}`);
            this.game_state.incrementPenaltyCounterFor(playerExt.auth_id)
              .catch((e) => hb_log(`!! incrementPenaltyCounterFor ${playerExt.name} error: ${e}`));
          })
        } catch (e) { hb_log(`!! incrementPenaltyCounterFor error ${e}`) };
      }
    }
  }

  private async gePlayersRatingWhichPlayedInMatch(inMatch: Match) {
    const selector = this.getSelectorFromMatch(inMatch);
    const inMatchPlayerIds = inMatch.redTeam.concat(inMatch.blueScore);
    for (let playerId of inMatchPlayerIds) {
      let playerExt = this.Pid(playerId);
      if (!playerExt.trust_level) continue;
      try {
          let rating = await this.game_state.loadPlayerRating(selector, playerExt.auth_id);
          if (rating) this.assignPlayerRating(playerExt, rating);
          // hb_log(`RATING get ${playerExt.name} (${rating.mu}, ${rating.rd})`);
      } catch (e) { hb_log(`!! loadPlayerRating in match error s: ${selector} (${inMatchPlayerIds.join(', ')}): ${e}`) };
      try {
        playerExt.penalty_counter = await this.game_state.getPenaltyCounterFor(playerExt.auth_id);
      } catch (e) { hb_log(`!! getPenaltyCounterFor error: ${e}`) };
    }
  }

  private autoTrustByPlayerGames(playerExt: PlayerData, stat: PlayerStat) {
    if (stat.fullGames >= 5 && stat.fullWins) {
      this.game_state.setTrustLevel(playerExt, 1, this.getGodPlayer()).then((result) => {
        playerExt.trust_level = 1;
      }).catch((e) => e && hb_log(`!! setTrustLevel by God error: ${e}`));
    }
  }

  private async updateRankChanges(inMatch: Match, rankChanges: MatchRankChangesEntry[]): Promise<void> {
    return new Promise((resolve) => {
      let attempts = 0;
      const maxAttempts = 60;

      const checkInterval = setInterval(() => {
        if (inMatch.matchId !== -1) {
          const selector = this.getSelectorFromMatch(inMatch);
          clearInterval(checkInterval);
          hb_log(`updateRankChanges(${inMatch.matchId})`);
          rankChanges.forEach(m => m.match_id = inMatch.matchId);
          rankChanges.forEach(m => this.game_state.insertNewMatchRankChanges(selector, m));
          if (['3vs3', '4vs4'].includes(this.room_config.selector)) { // it is main part of business
            let link = `${config.webpageLink}/mecz/${selector[0]}/${inMatch.matchId}`;
            this.sendMsgToAll(`Statystyki z ostatniego meczu znajdziesz tutaj: ${link}`, Colors.Stats, 'italic');
          }
          resolve();
        } else if (++attempts >= maxAttempts) {
          clearInterval(checkInterval);
          hb_log("!! updateRankChanges timeout: matchId still -1 after 60s");
          resolve();
        }
      }, 1000);
    });
  }

  private updateTop10Array(top10: PlayerTopRatingDataShort[], results: PlayerTopRatingDataShort[]) {
    top10.length = 0;
    let n = 1;
    for (let result of results) {
      top10.push(result);
      if (n++ >= 10) break;
    }
  }

  async updateTop10(): Promise<void> {
    this.game_state.getTopPlayersShortAuth().then((results) => {
      this.updateTop10Array(this.top10, results);
      let rank = 1;
      for (let result of results) {
        this.global_rank_by_auth.set(result.auth_id, rank);
        rank++;
      }
      hb_log('Total Top 10 zaktualizowane');
    }).catch((e) => { hb_log(`!! updateTop10 error: ${e}`) });
    // here only read daily and weekly top ranking
    this.game_state.getDailyTop10PlayersShort().then((results) => {
      this.updateTop10Array(this.top10_daily, results);
      hb_log('Daily Top 10 zaktualizowane');
    }).catch((e) => e && hb_log(`!! getDailyTop10PlayersShort error: ${e}`));
    this.game_state.getWeeklyTop10PlayersShort().then((results) => {
      this.updateTop10Array(this.top10_weekly, results);
      hb_log('Weekly Top 10 zaktualizowane');
    }).catch((e) => e && hb_log(`!! getWeeklyTop10PlayersShort error: ${e}`));
  }

  async handlePositionsReset() {
    this.current_match_state.handlePositionsReset();
    if (this.auto_mode) {
      this.auto_bot.handlePositionsReset();
      this.volleyball.handlePositionsReset();
      this.tennis.handlePositionsReset();
      let [redTeam, blueTeam] = this.getRedBluePLayerInTeamsAutoMode();
      this.handball.handlePositionsReset(redTeam, blueTeam);
    }
    this.match_stats.handlePositionsReset();
    this.rejoice_maker.handlePositionsReset();
    this.players_ext.forEach(p => {
      if (p.trust_level < 2) {
        this.setPlayerAvatarTo(p, `<${p.trust_level}`);
      }
    })
  }

  handlePlayerChat(player: PlayerObject, message: string): boolean {
    let playerExt = this.P(player);
    this.handlePlayerChatExt(playerExt, message);
    return false;
  }

  private applyReplaceCommand(command: string, targetString: string|undefined) {
    if (!targetString) return '';
    const regex = /^s\/([^\/]+)\/([^\/]+)\/g$/;
    const match = command.match(regex);
    if (match) {
      const oldStr = match[1]; // część 'old'
      const newStr = match[2]; // część 'new'
      // Zwróć zmodyfikowany string
      return targetString.replace(new RegExp(oldStr, 'g'), newStr);
    }
    return targetString; // Jeśli komenda nie pasuje do formatu, zwróć oryginalny string
  }

  async handlePlayerChatExt(playerExt: PlayerData, message: string) {
    message = message.trim();
    if (!message) return; // not interested in empty messages
    const userLogMessage = (for_discord: boolean) => { this.game_state.logMessage(playerExt.name, "chat", message, for_discord); }
    if (!message.startsWith('!kb_')) { // to not spam
      hb_log(`#CHAT# ${playerExt.name} [${playerExt.id}]: ${message}`, true);
    }
    playerExt.activity.updateChat(this.current_time);
    // at first check captcha
    if (this.captcha.hasPendingCaptcha(playerExt)) {
      this.captcha.checkAnswer(playerExt, message);
      return userLogMessage(false); // wait till captcha passed at first
    }
    // only for volley
    if (this.volleyball.isEnabled() && message.length === 1) {
      const serveType = message.toLowerCase();
      if (serveType === 'z') message = '!serve_z';
      else if (serveType === 'a') message = '!serve_a';
      else if (serveType === 'q') message = '!serve_q';
      else if (serveType === 'e') message = '!serve_e';
    } else if (message.startsWith('s/')) {
      message = this.applyReplaceCommand(message, this.last_command.get(playerExt.id));
    } else if (message.startsWith('@wyb ')) {
      message = '!' + message.substring(1);
    } else if (message.startsWith('@@')) {
      message = '!w ' + message.substring(1);
    }
    // then handle commands
    if (message[0] === '!') {
      // Handle last command
      if (message === "!!") {
        let last_command_str = this.last_command.get(playerExt.id);
        if (last_command_str == null) {
          this.sendMsgToPlayer(playerExt, "Brak ostatniej komendy");
          return;
        }
        message = last_command_str;
      }
      this.last_command.set(playerExt.id, message);

      message = message.substring(1);
      let message_split = message.split(" ");
      let command = message_split[0].toLowerCase();
      this.executeCommand(command, playerExt, message_split.slice(1).filter(e => e));
      return; // Returning false will prevent the message from being broadcasted
    }
    // then check for wide characters and if so then block any other action
    if (this.containsWideCharacters(message)) {
      if (!this.isPlayerMuted(playerExt)) {
        this.addPlayerMuted(playerExt);
        this.sendMsgToPlayer(playerExt, "Prosimy nie korzystać z dziwnych znaczków! Zostałeś zmutowany!", Colors.Warning);
      }
      return userLogMessage(false);
    }
    // no check if it time muted
    if (this.players_game_state_manager.isPlayerTimeMuted(playerExt, true)) {
      return userLogMessage(false);
    }
    // then check if only trusted can write
    if (this.allow_chatting_only_trusted && !playerExt.trust_level) {
      return userLogMessage(false); // only trusted can write
    }
    // then if anti spam is enabled - check there
    let anti_spam_muted = !this.anti_spam.canSendMessage(playerExt, message);
    if (this.checkPossibleSpamBot(playerExt)) {
      return userLogMessage(false);
    }
    // OK, we can send message if is not muted nor filtered by anti spam
    if (!this.isPlayerMuted(playerExt) && !anti_spam_muted) {
      // there is team message
      if (message.startsWith("t ") || message.startsWith("T ")) {
        this.sendMessageToSameTeam(playerExt, message.slice(2));
        return userLogMessage(false);
      }
      userLogMessage(this.logs_to_discord && message.length > 2);
      if (playerExt.discord_user && playerExt.discord_user.state) {
        this.sendMessageToAllWithIgnoreList(playerExt, `${playerExt.flag}${Emoji.UserVerified}${playerExt.name}: ${message}`, message, playerExt.discord_user.chat_color, 1);
        return;
      }
      if (playerExt.trust_level < 3) {
        let color = Colors.TrustZero;
        let bell = 0;
        if (playerExt.trust_level === 1) color = Colors.TrustOne; // no bell, broken level
        else if (playerExt.trust_level === 2) { // new base level for people
          color = Colors.TrustTwo;
          bell = 1;
        }
        this.sendMessageToAllWithIgnoreList(playerExt, `${playerExt.flag}${playerExt.name}: ${message}`, message, color, bell);
        return;
      };
      // show as normal for trusted players
      this.sendMessageToAllWithIgnoreList(playerExt, `${playerExt.flag}${playerExt.name}: ${message}`, message, 0xFFFFFF, 1);
    }
  }

  setAvatarForOneSecond(player: PlayerData, avatar: string) {
    const prevAvatar = player.avatar;
    if (player.avatar_until !== null) {
      clearTimeout(player.avatar_until);
      player.avatar_until = null;
    }
    this.setPlayerAvatarTo(player, avatar);
    player.avatar_until = setTimeout(() => {
      player.avatar_until = null;
      this.setPlayerAvatarTo(player, prevAvatar);
    }, 1000);
  }

  sendMessageToAllWithIgnoreList(byPlayer: PlayerData, msg: string, origMsg: string, color: number, sound: number) {
    if (origMsg.length < 3) {
      this.sendMsgToPlayer(byPlayer, msg, color, undefined, sound);
      this.setAvatarForOneSecond(byPlayer, origMsg);
      return;
    }
    if (!byPlayer.ignored_by.size) {
      this.sendMsgToAll(msg, color, undefined, sound);
      return;
    }
    this.players_ext.forEach(player => {
      if (!byPlayer.ignored_by.has(player.id)) {
        this.sendMsgToPlayer(player, msg, color, undefined, sound);
      }
    })
  }

  executeCommand(command: string, player: PlayerData, args: string[] = []) {
    const cmd = this.commander.commands[command];
    if (cmd) {
      cmd.call(this.commander, player, args);
    } else if (player.id != -100) {
      this.sendMsgToPlayer(player, "Nieznana komenda: " + command);
    }
  }

  sendMessageToSameTeam(player: PlayerData, message: string) {
    let text = `T ${player.name}: ${message}`;
    let color = player.team == 0 ? Colors.TeamChatSpec : player.team == 1 ? Colors.TeamChatRed : Colors.TeamChatBlue;
    this.getPlayers().filter(e => e.team == player.team).forEach(e => {
      this.sendMsgToPlayer(e, text, color, 'italic', 1);
    });
  }

  checkPossibleSpamBot(player: PlayerData) {
    if (this.anti_spam.isSpammingSameMessage(player)) {
      if (this.auto_mode) this.players_game_state_manager.setPlayerTimeMuted(player, this.God(), 5 * 60);
      else this.kickPlayerByServer(player, "Nastepnym razem cie pokonam Hautameki");
      return true;
    }
    return false;
  }

  parsePlayerName(player_name: string) {
    // remove leading '@' if any
    return player_name.startsWith('@') ? player_name.slice(1) : player_name;
  }

  updateWinnerTeamBeforeGameStop() {
    if (!this.last_winner_team) {
      let score = this.room.getScores();
      if (score) {
        if (score.red > score.blue) this.last_winner_team = 1;
        else if (score.blue > score.red) this.last_winner_team = 2;
      }
    }
  }

  getPrevWinnerLogTxt() {
    if (this.last_winner_team == 1) return ', Red wygrali';
    else if (this.last_winner_team == 2) return ', Blue wygrali';
    return '';
  }

  async makeRandomAndRestartMatch() {
    this.room.stopGame();
    await sleep(125);

    let players: PlayerData[] = this.getPlayersExtList(true);
    let red: PlayerData[] = [];
    let blue: PlayerData[] = [];
    let spec: PlayerData[] = [];
    let red_winner = this.last_winner_team == 1;
    let blue_winner = this.last_winner_team == 2;

    players.forEach(e => {
      let player_ext = this.Pid(e.id);
      if (player_ext.afk) return;
      if (e.team == 1) red.push(e);
      else if (e.team == 2) blue.push(e);
      else spec.push(e);
    });

    let selected_players: PlayerData[] = [];
    if (red_winner) {
      selected_players = [...red];
    } else if (blue_winner) {
      selected_players = [...blue];
    } else {
      selected_players = [...red, ...blue];
    }

    // Dodajemy graczy ze spectatorów, ale tylko tych, którzy jeszcze nie są wybrani
    while (selected_players.length < this.limit * 2 && spec.length > 0) {
      let next_spec = spec.shift();
      if (next_spec && !selected_players.includes(next_spec)) {
        selected_players.push(next_spec);
      }
    }

    // Dodajemy graczy z przegranej drużyny (red lub blue), jeśli są jeszcze miejsca
    if (selected_players.length < this.limit * 2) {
      let losing_team = red_winner ? blue : red; // Wybieramy drużynę przegraną
      while (selected_players.length < this.limit * 2 && losing_team.length > 0) {
        let next_loser = losing_team.shift();
        if (next_loser && !selected_players.includes(next_loser)) {
          selected_players.push(next_loser);
        }
      }
    }

    this.shuffleAllPlayers(selected_players);
    players.forEach(e => { e.team = 0; this.room.setPlayerTeam(e.id, e.team); });
    for (let i = 0; i < selected_players.length; i++) {
      let e = selected_players[i];
      e.team = i % 2 === 0 ? 1 : 2;
      this.room.setPlayerTeam(e.id, e.team);
    }

    await sleep(125);
    this.selectAppropriateMap(players);
    await sleep(125);
    this.room.startGame();
  }

  async makeWinStayAndRestartMatch() {
    this.room.stopGame();
    await sleep(125);

    let players: PlayerData[] = this.getPlayersExtList(true);
    let red: PlayerData[] = [];
    let blue: PlayerData[] = [];
    let spec: PlayerData[] = [];
    let red_winner = this.last_winner_team == 1;
    let blue_winner = this.last_winner_team == 2;

    players.forEach(e => {
      let player_ext = this.Pid(e.id);
      if (player_ext.afk) return;
      if (e.team == 1) red.push(e);
      else if (e.team == 2) blue.push(e);
      else spec.push(e);
    });

    let selected_players: PlayerData[] = [];

    // Dodajemy graczy ze spectatorów
    while (selected_players.length < this.limit && spec.length > 0) {
      let next_spec = spec.shift();
      if (next_spec && !selected_players.includes(next_spec)) selected_players.push(next_spec);
    }

    // Dodajemy graczy z przegranej drużyny (red lub blue), jeśli są jeszcze miejsca
    if (selected_players.length < this.limit) {
      let losing_team = red_winner ? blue : red; // Wybieramy drużynę przegraną
      while (selected_players.length < this.limit && losing_team.length > 0) {
        let next_loser = losing_team.shift();
        if (next_loser && !selected_players.includes(next_loser)) selected_players.push(next_loser);
      }
    }

    this.shuffleAllPlayers(selected_players);
    players.forEach(e => { e.team = 0; this.room.setPlayerTeam(e.id, e.team); });
    if (red_winner) {
      red.forEach(e => {
        e.team = 1;
        this.room.setPlayerTeam(e.id, e.team);
      });
      selected_players.forEach(e => {
        e.team = 2;
        this.room.setPlayerTeam(e.id, e.team);
      });
    } else {
      blue.forEach(e => {
        e.team = 2;
        this.room.setPlayerTeam(e.id, e.team);
      });
      selected_players.forEach(e => {
        e.team = 1;
        this.room.setPlayerTeam(e.id, e.team);
      });
    }
    await sleep(125);

    this.room.startGame();
  }

  swapTeams() {
    this.getPlayers().filter(e => e.team > 0).forEach(e => {
      this.room.setPlayerTeam(e.id, this.getOpponentTeam(e.team));
    });
  }

  kickPlayer(player: PlayerData, byPlayer: PlayerData, reason: string, ban = false, log = false) {
    hb_log(`#KICK# ${player.name} [${player.id}] kicked(ban:${ban}) by ${byPlayer.name} [${byPlayer.id}]: ${reason}`);
    this.room.kickPlayer(player.id, reason, ban);
    if (log) this.players_game_state_manager.logKicked(player, byPlayer);
  }

  kickPlayerByServer(player: PlayerData, reason: string, ban: boolean = false) {
    return this.kickPlayer(player, this.God(), reason, ban);
  }

  kickAllTeamExceptTrusted(player: PlayerData, team_id: number) {
    for (let p of this.getPlayersExt()) {
      if (player.id != p.id && p.team == team_id && !p.trust_level) this.kickPlayerByServer(p, '');
    }
  }

  movePlayerBetweenTeams(from_team: number, to_team: number) {
    this.getPlayers().forEach(player => {
      if (player.team == from_team) {
        this.room.setPlayerTeam(player.id, to_team);
      }
    });
  }

  addPlayerMuted(player: PlayerObject | PlayerData) {
    this.muted_players.add(player.id);
  }

  removePlayerMuted(player: PlayerObject | PlayerData) {
    this.muted_players.delete(player.id);
    this.anti_spam.clearMute(player.id);
  }

  isPlayerMuted(player: PlayerObject | PlayerData) {
    return this.muted_players.has(player.id);
  }

  sendMsgToPlayer(player: PlayerObject | PlayerData, message: string, color: number | undefined = undefined, style: string | undefined = undefined, sound: number = 0) {
    // If sound is set to 0 the announcement will produce no sound.
    // If sound is set to 1 the announcement will produce a normal chat sound.
    // If set to 2 it will produce a notification sound.
    this.room.sendAnnouncement(message, player.id, color, style, sound);
  }

  sendMsgToAll(message: string, color: number | undefined = undefined, style: string | undefined = undefined, sound: number = 0) {
    this.room.sendAnnouncement(message, undefined, color, style, sound);
  }

  getPlayers() {
    return this.room.getPlayerList();
  }

  getPlayersExt(updateExt = false) {
    // call it if you only need to iterate over all players
    if (updateExt) {
      this.getPlayers().forEach(e => {
        let p = this.players_ext_all.get(e.id);
        if (p) p.update(e);
      });
    }
    return this.players_ext.values();
  }

  getPlayersExtList(updateExt = false): PlayerData[] {
    // call it when you need sorted list
    let result = new Array<PlayerData>;
    this.getPlayers().forEach(e => {
      let p = this.players_ext_all.get(e.id);
      if (p) {
        if (updateExt) p.update(e);
        result.push(p);
      }
    });

    return result;
  }

  getPlayerDataByName(playerName: string | string[], byPlayer: PlayerData | null, byPlayerIfNameNotSpecified = false, allPlayers = false): PlayerData | null {
    // TODO for now it checks all players, added parameter allPlayers, not yet impelmented
    if (!playerName.length) {
      if (byPlayerIfNameNotSpecified && byPlayer) return byPlayer; // command refers to caller player
      return null; // no name specified, then cannot find player
    }

    let name = Array.isArray(playerName) ? playerName.join(" ") : playerName;
    if (name.startsWith('#')) {
      let cmdPlayerId = Number.parseInt(name.slice(1));
      if (!isNaN(cmdPlayerId)) {
        let cmdPlayer = this.players_ext_all.get(cmdPlayerId);
        if (cmdPlayer) return cmdPlayer;
      }
    }
    if (name.startsWith('@')) name = name.slice(1);
    let nameNormalized = normalizeNameString(name);
    let cmdPlayerId = this.player_ids_by_normalized_name.get(nameNormalized);
    if (cmdPlayerId === undefined) return null;
    let cmdPlayer = this.players_ext_all.get(cmdPlayerId);
    if (!cmdPlayer) {
      if (byPlayer)
        this.sendMsgToPlayer(byPlayer, `Nie mogę znaleźć gracza o nicku ${name}`, Colors.PlayerNotFound, 'bold');
      return null;
    }
    return cmdPlayer;
  }

  isGameInProgress() {
    return this.room.getScores() != null;
  }

  getOpponentTeam(t: number) {
    if (t == 1) return 2;
    if (t == 2) return 1;
    return 0;
  }

  containsWideCharacters(text: string): boolean {
    const wideCharacterRegex = /[\uFDF0-\uFDFD\uA9C0-\uA9CF\u1200-\u123F]/u;
    return wideCharacterRegex.test(text);
  }

  isPlayerHost(player: PlayerData) {
    return this.isPlayerIdHost(player.id);
  }

  isPlayerIdHost(playerId: number) {
    let p = this.Pid(playerId);
    if (p.auth_id == '' || p.auth_id == config.hostAuthId)
      return true;
    return false;
  }

  isGodPlayer(player: PlayerData) {
    return player.id === this.god_player.id;
  }

  getSselector() {
    return `${this.room_config.selector}_${this.room_config.subselector}`;
  }
}

let hb_room: HaxballRoom | null = null;
let chat_logger: ChatLogger | null = null;
let db_handler: DBHandler | null = null;
let game_state: GameState | null = null;

export const hb_room_main = (room: RoomObject, roomConfig: config.RoomServerConfig): HaxballRoom => {
  db_handler = new DBHandler(roomConfig.selector, roomConfig.playersDbFile, roomConfig.otherDbFiles, roomConfig.vipDbFile);
  chat_logger = new ChatLogger(roomConfig.chatLogDbFile);
  game_state = new GameState(db_handler, chat_logger);
  hb_room = new HaxballRoom(room, roomConfig, game_state);
  return hb_room;
};
