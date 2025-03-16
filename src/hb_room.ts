// https://pastebin.com/f4PSNz7C
// https://pastebin.com/2nHXPbvS

// haxball logging
import { tokenDatabase, ServerData } from './token_database';
import * as config from './config';
import ChatLogger from './chat_logger';
import { sleep, normalizeNameString, getTimestampHMS, getTimestampHM } from './utils';
import { Emoji } from './emoji';
import { ScoreCaptcha } from './captcha';
import { BallPossessionTracker } from './possesion_tracker';
import { AntiSpam } from './anti_spam';
import { PlayerAccelerator } from './player_accelerator';
import { PPP, AdminStats, PlayerData, PlayerStat, MatchStatsProcessingState, TransactionByPlayerInfo, PlayerTopRatingDataShort, PlayerMatchStatsData, Match, PlayerLeavedDueTo, PlayerRatingData } from './structs';
import { Colors } from './colors';
import all_maps from './maps';
import { BuyCoffee } from './buy_coffee';
import { DBHandler, GameState } from './game_state';
import Commander from './commands';
import { AutoBot } from './auto_mode';
import { Ratings } from './rating';
import Glicko2 from 'glicko2';
import { PlayersGameStateManager } from './pg_manager';
import { hb_log, hb_log_to_console } from './log';
import { MatchStats } from './stats';
import { RejoiceMaker } from './rejoice_maker';
import WelcomeMessage from './welcome_message';
import Pinger from './pinger';
import { MatchRankChangesEntry } from './db/match_rank_changes';
import GodCommander from './god_commander';


export class HaxballRoom {
  room: RoomObject;
  room_config: config.RoomServerConfig;
  server_start_time: number;
  scores: ScoresObject|null;
  pressure_left: number;
  pressure_right: number;
  pressure_total: number;
  last_tick: number;
  pressure_bar_length: number;
  last_discs_update_time: number;
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
  game_stopped_timer: any | null;
  game_paused_timer: any | null;
  last_player_team_changed_by_admin_time: number;
  last_winner_team: 0|1|2;
  auto_mode: boolean;
  auto_afk: boolean;
  limit: number;
  commander: Commander;
  default_map_name: string;
  last_selected_map_name: string | null;
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
  rejoice_prices: Map<string, { for_days: number, price: number }[]>;
  welcome_message: WelcomeMessage;
  pinger: Pinger;
  god_commander: GodCommander;

  constructor(room: RoomObject, roomConfig: config.RoomServerConfig, gameState: GameState) {
    this.room = room;
    this.room_config = roomConfig;

    this.server_start_time = Date.now();
    this.scores = null;
    this.pressure_left = 0.0;
    this.pressure_right = 0.0;
    this.pressure_total = 0.0;
    this.last_tick = 0.0;
    this.pressure_bar_length = 300;
    this.last_discs_update_time = 0;
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
    this.ball_possesion_tracker = new BallPossessionTracker(this.room);
    this.game_stopped_timer = null;
    this.game_paused_timer = null;
    this.last_player_team_changed_by_admin_time = Date.now();
    this.last_winner_team = 0;
    this.limit = roomConfig.playersInTeamLimit;
    this.auto_bot = new AutoBot(this);
    this.player_stats = new Map<number, PlayerStat>();
    this.player_stats_auth = new Map<string, number>();
    // this.glicko_settings = null;
    this.glicko = new Glicko2.Glicko2();
    this.glicko_players = new Map<string, Glicko2.Player>();
    this.ratings = new Ratings(this.glicko, { scoreLimit: roomConfig.scoreLimit, timeLimit: roomConfig.timeLimit });
    this.ratings_for_all_games = false;
    this.match_stats = new MatchStats();
    this.auto_mode = roomConfig.autoModeEnabled;
    this.auto_afk = true;
    this.room_link = '';
    this.room_data_sync_timer = null;
    this.god_player = this.createGodPlayer();
    this.top10 = [];
    this.top10_daily = [];
    this.top10_weekly = [];
    this.global_rank_by_auth = new Map<string, number>();
    this.player_names_by_auth = new Map<string, string>();
    this.player_ids_by_auth = new Map<string, number>();
    this.player_ids_by_normalized_name = new Map<string, number>();
    this.players_game_state_manager = new PlayersGameStateManager(this);
    this.rejoice_maker = new RejoiceMaker(this);
    this.rejoice_prices = new Map<string, { for_days: number, price: number }[]>();
    this.welcome_message = new WelcomeMessage((player: PlayerData, msg: string) => { this.sendMsgToPlayer(player, msg, Colors.OrangeTangelo) });
    this.pinger = new Pinger(this.getSselector(), () => this.players_ext.size);
    this.god_commander = new GodCommander(this.god_player, (player: PlayerObject, command: string) => this.handlePlayerChat(player, command),
      roomConfig.selector, roomConfig.subselector);
    this.welcome_message.setMessage('Sprawdź ranking globalny: !ttop, sprawdź również ranking tygodnia: !wtop, wesprzyj twórcę: !sklep');

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
    this.last_selected_map_name = null;
    this.time_limit_reached = false;
    this.players_num = 0;
    this.room.setDefaultStadium("Classic");
    this.setMapByName(this.default_map_name);
    this.room.setTeamsLock(true);
    this.setDefaultKickRateLimit();
    this.setDefaultScoreTimeLimit();
    this.initData();
  }

  private initData() {
    this.initPlayerNames();
    this.players_game_state_manager.initAllGameState();
    if (this.auto_mode) {
      this.auto_bot.resetAndStart();
      this.anti_spam.setEnabled(true); // enable anti spam there
      // on spam set timed mute for 5 mintues
      this.anti_spam.setOnMute((playerId: number) => {
        this.players_game_state_manager.setPlayerTimeMuted(this.Pid(playerId), 5 * 60);
        this.anti_spam.clearMute(playerId);
      });
    }

    this.game_state.getRejoicePrices().then((results) => {
      for (let result of results) {
        if (!this.rejoice_prices.has(result.rejoice_id)) this.rejoice_prices.set(result.rejoice_id, []);
        this.rejoice_prices.get(result.rejoice_id)!.push({for_days: result.for_days, price: result.price});
      }
    }).catch((error) => {hb_log(`!! getRejoicePrices error: ${error}`)});

    this.game_state.setPaymentsLinkCallbackAndStart((authId: string, paymentTransactionId: number) => {
      this.game_state.getPaymentLink(authId, paymentTransactionId).then((result) => {
        let playerId = this.player_ids_by_auth.get(authId)!;
        let player = this.Pid(playerId);
        if (!player) return;
        let link = result ?? 'INVALID';
        player.pendingTransaction = new TransactionByPlayerInfo(paymentTransactionId);
        player.pendingTransaction.link = link;
        let txt = `Link ⇒  ${link}  ⇐ Zakup przez Stripe! Następnie wyjdź i wejdź!`;
        this.sendMsgToPlayer(player, txt, Colors.OrangeTangelo, 'bold');
        hb_log(`Gracz ${player.name} otrzymał link: ${txt}`);
      }).catch((error) => { hb_log(`!! getPaymentLink error: ${error}`) });
    }, this.getSselector());
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
      id: -100,
      team: team,
      admin: true,
      position: { "x": 0.0, "y": 0.0 },
      auth: 'QxkI4PJuA0LOT0krfPdtAgPojFw_nCXWP8qL0Aw0dGc',
      conn: 'CONN'
    };
    let p = new PlayerData(ppp);
    p.mark_disconnected();
    p.admin_level = 40;
    p.trust_level = 40;
    this.players_ext_all.set(p.id, p);
    return ppp;
  }

  private getGodPlayer() {
    return this.Pid(this.god_player.id);
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
    let playersMax = this.room_config.maxPlayersOverride;
    let playersCur = this.players_num > playersMax ? playersMax : this.players_num;
    let serverData = new ServerData(this.getSselector(),
      this.room_config.token, this.room_link, this.room_config.roomName, playersCur, playersMax, true, true);
    tokenDatabase.saveServer(serverData);
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
    this.last_tick = 0.0;
  }

  async handleGameTick() {
    this.pinger.sendKeepAlive();
    // Current time in ms
    let scores = this.room.getScores();
    this.scores = scores;
    let players = this.getPlayersExtList(true);
    let current_tick = scores.time;
    let delta_time = current_tick - this.last_tick;
    this.last_tick = current_tick;
    const ball_position = this.room.getDiscProperties(0);

    if (this.feature_pressure) {

      if (delta_time > 0) {

        // Calc pressure
        if (ball_position.x < 0) {
          this.pressure_left += delta_time;
        } else if (ball_position.x > 0) {
          this.pressure_right += delta_time;
        } else {
          this.pressure_left += delta_time;
          this.pressure_right += delta_time;
        }
        this.pressure_total += delta_time;

        if (this.feature_pressure_stadium && current_tick - this.last_discs_update_time > 1) {
          this.last_discs_update_time += 1; // update every second

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
          let pressure_dist_prop: any = this.room.getDiscProperties(6)
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
          let possesion_disc_prop: any = this.room.getDiscProperties(5);
          this.room.setDiscProperties(5, { // Possesion disc properties (id: 5)
            xspeed: (possesion_disc_pos_x - possesion_disc_prop.x) / 60,
            color: possesion_disc_color,
          });
        }
      }
    }

    let current_time = Date.now();
    let afk_players_num = 0;
    // check for AFK
    if (this.auto_afk && (!this.auto_mode || (this.auto_mode && !this.auto_bot.isLobbyTime()))) {
      const MaxAllowedNoMoveTime = 15.0 * 1000; // [ms]
      players.forEach(player_ext => {
        if (player_ext.team) {
          const afkTime = current_time - player_ext.activity.game; // [ms]
          if (afkTime > MaxAllowedNoMoveTime) {
            if (!player_ext.afk) { this.commander.commandSetAfkExt(player_ext); player_ext.afk_switch_time -= 15_000; } // do not block auto detected
            else if (player_ext.afk_maybe) this.moveAfkMaybeToSpec(player_ext);
          } else if (afkTime > MaxAllowedNoMoveTime - 9 * 1000) {
            let idx = Math.min(8 - Math.floor((MaxAllowedNoMoveTime - afkTime) / 1000), 8);
            player_ext.afk_avatar = Emoji.CountdownEmojis[idx];
            this.room.setPlayerAvatar(player_ext.id, player_ext.afk_avatar);
          }
          if (player_ext.afk) afk_players_num++;
        }
      });
    }

    if (!this.auto_mode) {
      if (afk_players_num == players.length) {
        this.allPlayersAfking(players);
      }
    }
    this.acceleration_tasks.update();
    this.ball_possesion_tracker.trackPossession();
    if (this.auto_mode) this.auto_bot.handleGameTick(scores);
    let [redTeam, blueTeam] = this.getRedBluePlayerIdsInTeams(players);
    this.match_stats.handleGameTick(scores, ball_position, this.players_ext_all, redTeam, blueTeam);
    this.rejoice_maker.handleGameTick();
  }

  moveAfkMaybeToSpec(player: PlayerData) {
    this.room.setPlayerAvatar(player.id, Emoji.Afk);
    this.room.setPlayerTeam(player.id, 0);
  }

  async allPlayersAfking(players: PlayerData[]) {
    this.sendMsgToAll(`Wszyscy afczą… Wszyscy na boisko! Ruszać się!`, Colors.GameState, 'bold');
    let current_time = Date.now();
    players.forEach(player => {
      let player_ext = this.Pid(player.id);
      if (player_ext.afk || !player_ext.afk_maybe) {
        this.room.setPlayerAvatar(player_ext.id, Emoji.AfkMaybe);
        player_ext.afk_maybe = true;
      } else {
        this.room.setPlayerAvatar(player_ext.id, null);
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

  setMapByName(map_name: string) {
    if (!all_maps.has(map_name)) return;
    if (['1', '2', 'f'].includes(map_name)) map_name = 'futsal';
    else if (['3', 'fb'].includes(map_name)) map_name = 'futsal_big';
    else if (['4', 'fh'].includes(map_name)) map_name = 'futsal_huge';
    if (this.last_selected_map_name != map_name) {
      let next_map = all_maps.get(map_name);
      if (next_map) {
        this.room.setCustomStadium(next_map);
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
    if ((red >= 2 && blue >= 3) || (red >= 3 && blue >= 2)) {
      this.setMapByName("futsal_big");
    } else {
      this.setMapByName("futsal");
    }
  }

  async handleGameStart(byPlayer: PlayerObject | null) {
    this.pinger.stop();
    this.last_winner_team = 0;
    this.last_discs_update_time = 0;
    this.time_limit_reached = false;
    this.resetPressureStats();
    if (byPlayer) this.Pid(byPlayer.id).admin_stat_start_stop();
    this.acceleration_tasks.reset();
    const now = Date.now();
    for (let p of this.getPlayersExt()) {
      p.activity.game = now;
    }
    this.gameStopTimerReset();
    this.ball_possesion_tracker.resetPossession();
    if (this.auto_mode) this.auto_bot.handleGameStart(null);
    let [redTeam, blueTeam] = this.getRedBluePlayerIdsInTeams(this.getPlayersExtList(true));
    let anyPlayerProperties = this.getAnyPlayerDiscProperties();
    let ballProperties = this.getBallProperties();
    if (anyPlayerProperties === null || ballProperties === null) {
      hb_log(`ST coś jest null: ${anyPlayerProperties}, ${ballProperties} ${anyPlayerProperties?.radius} ${anyPlayerProperties?.damping} ${ballProperties?.radius} ${ballProperties?.damping}`);
    }
    this.match_stats.handleGameStart(anyPlayerProperties, ballProperties, redTeam, blueTeam, this.players_ext);
  }

  getAnyPlayerDiscProperties() {
    for (let [id, player] of this.players_ext) {
      return this.room.getPlayerDiscProperties(id);
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
    if (this.auto_mode) return [this.auto_bot.redTeam, this.auto_bot.blueTeam];
    return this.getRedBluePlayerTeamIdsFrom(from);
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
    if (byPlayer) this.Pid(byPlayer.id).admin_stat_start_stop();
    const MaxAllowedGameStopTime = 20.0 * 1000; // [ms]
    const now = Date.now();
    this.last_player_team_changed_by_admin_time = now;
    this.gamePauseTimerReset();
    this.gameStopTimerReset();
    this.rejoice_maker.handleGameStop();
    for (let p of this.getPlayersExt()) {
      p.activity.game = now;
    }
    let doUpdateState = false;
    let fullTimeMatchPlayed = true;
    if (this.auto_mode) {
      this.auto_bot.handleGameStop(null);
      this.match_stats.setWinner(this.auto_bot.currentMatch.winnerTeam as 1|2);
      fullTimeMatchPlayed = this.auto_bot.wasFullTimeMatchPlayed();
      if (this.auto_bot.currentMatch.matchStatsState == MatchStatsProcessingState.ranked) doUpdateState = true;
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
        if (this.auto_mode) this.updatePlayerLeftState(matchPlayerStats, this.auto_bot.currentMatch);
        this.updateAccumulatedPlayerStats(matchPlayerStats, this.auto_bot.currentMatch, fullTimeMatchPlayed);
        if (this.auto_mode) this.auto_bot.currentMatch.matchStatsState = MatchStatsProcessingState.updated;
      }
    }
    this.scores = null;
    if (this.auto_mode) {
      return; // do not start below timer
    }

    this.game_stopped_timer = setInterval(() => {
      let current_time = Date.now();
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

  updatePlayerLeftState(matchPlayerStats: Map<number, PlayerMatchStatsData>, currentMatch: Match) {
    for (let [playerId, statInMatch] of currentMatch.playerStats) {
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

  async updateAccumulatedPlayerStats(matchPlayerStats: Map<number, PlayerMatchStatsData>, currentMatch: Match, fullTimeMatchPlayed: boolean) {
    hb_log(`Aktualizujemy accumulated match stats dla ${matchPlayerStats.size}`);
    let updatedAuthIds: Set<string> = new Set<string>();
    for (let playerId of matchPlayerStats.keys()) {
      updatedAuthIds.add(this.players_ext_all.get(playerId)!.auth_id);
    }
    for (let authId of updatedAuthIds) {
      let sId = this.player_stats_auth.get(authId)!;
      if (sId === undefined) continue;
      let stat = this.player_stats.get(sId);
      if (!stat) continue;
      this.game_state.updateTotalPlayerMatchStats(authId, stat, matchPlayerStats.get(stat.id)!)
        .then(async () => {
          this.game_state.loadTotalPlayerMatchStats(authId)
            .then(result => this.assignPlayerMatchStats(stat, result))
            .catch((e) => hb_log(`!! loadPlayerMatchStats error: ${e}`));
        })
        .catch((e) => hb_log(`!! updatePlayerMatchStats error: ${e}`));
    }
    if (this.auto_mode) {
      hb_log(`Aktualizujemy match player stats dla ${matchPlayerStats.size}`);
      this.game_state.insertNewMatch(currentMatch, fullTimeMatchPlayed).then((matchId) => {
        if (matchId >= -1) currentMatch.matchId = matchId;
        for (let authId of updatedAuthIds) {
          let sId = this.player_stats_auth.get(authId)!;
          if (sId === undefined) continue;
          let stat = this.player_stats.get(sId)!;
          let teamId: 1|2 = currentMatch.redTeam.includes(stat.id) ? 1 : 2;
          this.game_state.insertNewMatchPlayerStats(matchId, authId, teamId, stat.currentMatch).catch((e) => e && hb_log(`!! insertNewMatchPlayerStats error: ${e}`));
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
    let cmdPlayer = this.getPlayerObjectByName(playerName, null);
    if (!cmdPlayer) return;
    if (cmdPlayer != null) {
      hb_log(`# Giving admin by name to ${playerName}`);
      this.giveAdminTo(cmdPlayer);
      this.game_state.logMessage(playerName, "players", `Admin granted to ${playerName}`, false);
    } else {
      hb_log(`Player ${playerName} not found`);
    }
  }

  async handlePlayerJoin(player: PlayerObject) {
    // TODO change storing info about when new player joins server
    this.game_state.logMessage(player.name, "players", `Player joined the room, auth: ${player.auth} conn: ${player.conn}`, false);
    this.players_num += 1;
    hb_log(`# (n:${this.players_num}) joined to server: ${player.name} [${player.id}]`);
    this.players_ext.set(player.id, new PlayerData(player));
    this.players_ext_all.set(player.id, this.players_ext.get(player.id)!);
    if (this.players_game_state_manager.checkIfPlayerIsNotTimeKicked(player)) return;
    if (this.checkIfPlayerNameContainsNotAllowedChars(player)) return;
    if (this.checkIfDotPlayerIsHost(player)) return;
    if (this.checkForPlayerDuplicate(player)) return;
    try {
      let playerExt = this.P(player);
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
          this.room.kickPlayer(player.id, "I don't trust in You!", false);
          return;
        }
      }
      if (playerExt.auth_id && playerExt.trust_level == 0) {
        this.captcha.askCaptcha(player);
      }
      this.player_ids_by_auth.set(playerExt.auth_id, playerExt.id);
      this.player_names_by_auth.set(playerExt.auth_id, playerExt.name);
      this.player_ids_by_normalized_name.set(playerExt.name_normalized, playerExt.id);
      this.game_state.insertPlayerName(playerExt.auth_id, playerExt.name);
      this.updateAdmins(null);
      this.loadPlayerStat(playerExt);
      if (this.auto_mode) this.auto_bot.handlePlayerJoin(playerExt);
      this.rejoice_maker.handlePlayerJoin(playerExt);
      this.welcome_message.sendWelcomeMessage(playerExt);
      const initialMute = playerExt.trust_level < 2;
      this.anti_spam.addPlayer(player, initialMute);
      if (this.anti_spam.enabled && initialMute) {
        this.sendMsgToPlayer(player, `Jesteś wyciszony na 30 sekund; You are muted for 30 seconds`, Colors.Admin, 'bold');
      }
      // this.sendOnlyTo(player, `Mozesz aktywować sterowanie przyciskami (Link: https://tinyurl.com/HaxballKeyBinding): Lewy Shift = Sprint, A = Wślizg`, 0x22FF22);
      this.sendMsgToPlayer(player, `Sprawdź dostępne komendy: !help !wyb !sklep`, Colors.Help);
    } catch (e) {
      hb_log(`!! getTrustAndAdminLevel error: ${e}`);
    }
  }

  loadPlayerStat(playerExt: PlayerData) {
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
      this.game_state.loadPlayerRating(playerExt.auth_id).then(result => { // load stats
        this.assignPlayerRating(playerExt, result);
      }).catch((e) => hb_log(`!! loadPlayerRating: ${e}`));
      this.game_state.loadTotalPlayerMatchStats(playerExt.auth_id).then(result => {
        this.assignPlayerMatchStats(playerExt.stat, result);
      }).catch((e) => hb_log(`!! loadPlayerMatchStats error ${e}`));
    }
  }

  assignPlayerRating(playerExt: PlayerData, ratingData: PlayerRatingData|undefined|null) {
    if (ratingData === undefined || ratingData === null) return;
    let g = playerExt.stat.glickoPlayer!;
    g.setRating(ratingData.rating.mu);
    g.setRd(ratingData.rating.rd);
    g.setVol(ratingData.rating.vol);
  }

  assignPlayerMatchStats(stat: PlayerStat, playerMatchStats: PlayerMatchStatsData|undefined|null) {
    if (playerMatchStats === undefined || playerMatchStats === null) return;
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

  checkIfPlayerNameContainsNotAllowedChars(player: PlayerObject) {
    if ('﷽' == player.name) return false; // there is such player with that name so it is olny exception :)
    if (this.containsWideCharacters(player.name)) {
      this.room.kickPlayer(player.id, "Zmień nick! ﷽", false);
      return true;
    }
    if (player.name.startsWith('@')) {
      this.room.kickPlayer(player.id, "Change nick! @ na początku?", false);
      return true;
    }
    return false;
  }

  checkIfDotPlayerIsHost(player: PlayerObject) {
    if (player.name.trim() == '.' && !this.isPlayerHost(player)) {
      this.room.kickPlayer(player.id, "Kropka Nienawiści!", false);
      return true;
    }
    return false;
  }

  checkForPlayerDuplicate(player: PlayerObject) {
    if (this.player_duplicate_allowed) return false;
    let kicked = false;
    let player_auth = player.auth || '';
    for (let p of this.getPlayersExt()) {
      if (p.id != player.id) {
        if (p.auth_id == player_auth) {
          this.room.kickPlayer(player.id, "One tab, one brain!", false);
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
            this.room.kickPlayer(p.id, "Nope, not you.", false);
          else
            this.room.kickPlayer(joiningPlayer.id, "Change nick! Duplicated...", false);
          kicked = true;
          break;
        }
      }
    }
    return kicked;
  }

  async handlePlayerLeave(player: PlayerObject) {
    this.game_state.logMessage(player.name, "players", "Player left the room", false);
    this.players_num -= 1;
    hb_log(`# (n:${this.players_num}) left server: ${player.name} [${player.id}]`);
    this.updateAdmins(player);
    this.handleEmptyRoom(player);
    this.last_command.delete(player.id);
    this.removePlayerMuted(player);
    let playerExt = this.Pid(player.id);
    this.match_stats.handlePlayerLeave(playerExt);
    if (this.auto_mode) this.auto_bot.handlePlayerLeave(playerExt);
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
    this.room.setScoreLimit(3);
    this.room.setTimeLimit(this.limit == 1 ? 2 : 3);
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
    if (`${t} Classic BAR` == newStadiumName) this.last_selected_map_name = 'classic';
    else if (`${t} Big BAR` == newStadiumName) this.last_selected_map_name = 'big';
    else if (`${t} Winky's Medium Futsal BAR` == newStadiumName) this.last_selected_map_name = 'futsal';
    else if (`${t} Winky's Futsal BAR` == newStadiumName) this.last_selected_map_name = 'futsal_big';
    else if (`${t} Winky's Huge Futsal BAR` == newStadiumName) this.last_selected_map_name = 'futsal_huge';
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
      hb_log(`# Kicked(ban:${ban ? "1" : "0"}): ${kickedPlayer.name} by: ${byPlayer.name} for: ${reason}`);
      let byPlayerExt = this.P(byPlayer);
      if (byPlayerExt.admin_stats) {
        if (ban) byPlayerExt.admin_stats.banned_users.add(kickedPlayer.name);
        else byPlayerExt.admin_stats.kicked_users.add(kickedPlayer.name);
        byPlayerExt.admin_stats.action_kick += 1;
        fastKicks = byPlayerExt.admin_stats.add_kick_timestamp();
      }
      let kickedPlayerExt = this.P(kickedPlayer);
      if (byPlayerExt.trust_level == 0) {
        this.room.kickPlayer(byPlayerExt.id, 'Nie kickuj!', false);
      } else if (kickedPlayerExt.trust_level > byPlayerExt.trust_level) {
        this.giveAdminSomeRestAfterKicking(byPlayerExt, "Weź głęboki oddech :)");
      } else if (fastKicks) {
        this.giveAdminSomeRestAfterKicking(byPlayerExt, "Weź trzy głębokie oddechy i spójrz w okno :)");
      }
    }
    if (ban) {
      this.room.clearBan(kickedPlayer.id); // TODO idk how to handle that
    }
  }

  async handlePlayerTeamChange(changedPlayer: PlayerObject, byPlayer: PlayerObject | null) {
    if (changedPlayer && !changedPlayer.name) return;
    let changed_player_ext = this.P(changedPlayer);
    changed_player_ext.activity.updateGame(); // reset timer
    if (changed_player_ext.team != 0) {
      if (changed_player_ext.afk) {
        if (byPlayer != null) {
          // TODO block it?
          changed_player_ext.afk_maybe = true;
          this.room.setPlayerAvatar(changed_player_ext.id, Emoji.AfkMaybe);
          this.sendMsgToPlayer(byPlayer, `${changed_player_ext.name} był AFK! Czy na pewno wrócił?`, Colors.Afk);
        }
      }
    }
    if (byPlayer != null) {
      this.last_player_team_changed_by_admin_time = Date.now();
      let p = this.P(byPlayer);
      p.activity.updateChat();
      p.activity.updateMove();
      p.admin_stat_team();
    }
    if (this.auto_mode) this.auto_bot.handlePlayerTeamChange(changed_player_ext);
    let [redTeam, blueTeam] = this.getRedBluePlayerIdsInTeams(this.getPlayersExtList(true));
    this.match_stats.handlePlayerTeamChange(this.P(changedPlayer), redTeam, blueTeam);
  }

  async handlePlayerActivity(player: PlayerObject) {
    let p = this.Pid(player.id);
    p.activity.updateGame();
    p.activity.updateMove();
    if (p.afk || p.afk_maybe) {
      p.afk = false;
      p.afk_maybe = false;
      // TODO AM player is back
    }
    if (p.afk_avatar) {
      this.room.setPlayerAvatar(p.id, null);
      p.afk_avatar = null;
    }
  }

  async handlePlayerBallKick(player: PlayerObject) {
    const ballPosition = this.getBallPosition();
    this.ball_possesion_tracker.registerBallKick(player);
    this.match_stats.handlePlayerBallKick(this.P(player), ballPosition);
  }

  async handleTeamGoal(team: TeamID) {
    this.ball_possesion_tracker.onTeamGoal(team);
    if (this.auto_mode) this.auto_bot.handleTeamGoal(team);
    const ballProperties = this.getBallProperties();
    let [redTeam, blueTeam] = this.getRedBluePlayerIdsInTeams(this.getPlayersExtList(true));
    if (team) {
      let [txt, scorer, assister, ownGoal] = this.match_stats.handleTeamGoal(team, ballProperties, this.players_ext_all, redTeam, blueTeam);
      this.rejoice_maker.handleTeamGoal(scorer, assister, ownGoal);
      this.sendMsgToAll(txt, Colors.Goal, 'italic');
    }
  }

  async handleTeamVictory(scores: ScoresObject) {
    if (scores.red > scores.blue) this.last_winner_team = 1;
    else if (scores.blue > scores.red) this.last_winner_team = 2;
    else this.last_winner_team = 0;
    if (this.auto_mode) this.auto_bot.handleTeamVictory(scores);
    // TODO add also (simplified?) ratings for disabled auto_mode
  }

  async updateRatingsAndTop10(inMatch: Match) {
    if (this.auto_mode) {
      if (this.auto_bot.ranked || this.ratings_for_all_games) {
        hb_log("Aktualizujemy teraz dane w bazie, najpierw czytamy z bazy");
        await this.gePlayersRatingWhichPlayedInMatch(inMatch);
        hb_log("Aktualizujemy teraz dane w bazie, teraz liczymy");
        this.ratings.calculateNewPlayersRating(inMatch, this.player_stats);
        let saved = 0;
        let redTeamStr = '';
        let blueTeamStr = '';
        const separator = '🔸';
        const muToStr = (oldMu: number, newMu: number, penalty: number) => {
          let str = `${oldMu}${newMu - oldMu >= 0 ? '+' : ''}${newMu - oldMu}`;
          if (penalty) str += `-${penalty}`;
          return str;
        }
        let rankChanges: MatchRankChangesEntry[] = [];
        for (const [playerId, oldRd, oldMu, newMu, penalty] of this.ratings.results) {
          let playerExt = this.players_ext_all.get(playerId)!;
          rankChanges.push({ match_id: -1, auth_id: playerExt.auth_id, old_rd: oldRd, old_mu: oldMu, new_mu: newMu, penalty: penalty });
          if (inMatch.redTeam.includes(playerId))
            redTeamStr += (redTeamStr ? separator : '') + muToStr(oldMu, newMu, penalty);
          else if (inMatch.blueTeam.includes(playerId))
            blueTeamStr += (blueTeamStr ? separator : '') + muToStr(oldMu, newMu, penalty);

          let stat = this.player_stats.get(playerExt.id)!;
          if (!playerExt.trust_level) {
            this.autoTrustByPlayerGames(playerExt, stat);
            continue;
          }
          let g = stat.glickoPlayer!;
          this.game_state.updatePlayerRating(playerExt.auth_id, newMu, newMu - oldMu, g.getRd(), g.getVol()).catch((e) => hb_log(`!! updatePlayerRating error: ${e}`));
          saved++;
        }
        this.updateRankChanges(inMatch, rankChanges).catch((e) => hb_log(`!! updateRankChanges error: ${e}`));
        let predictedWinner = this.ratings.expectedScoreRed >= 50 ? '🔴' : '🔵';
        let predictedP = Math.round(this.ratings.expectedScoreRed);
        if (predictedP < 50) predictedP = 100 - predictedP;
        const txt = `🔴${redTeamStr}⚔️${blueTeamStr}🔵 Przewidywano zwycięstwo ${predictedWinner}${predictedP}%`;
        hb_log(txt);
        this.sendMsgToAll(txt, Colors.GameState, 'italic');
        this.updateTop10();
        hb_log(`Aktualizujemy - zrobione (${saved}/${this.ratings.results.length})!`);
      }
    }
  }

  private async gePlayersRatingWhichPlayedInMatch(inMatch: Match) {
    await inMatch.redTeam.concat(inMatch.blueTeam).forEach(async playerId => {
      let playerExt = this.Pid(playerId);
      let rating = await this.game_state.loadPlayerRating(playerExt.auth_id);
      this.assignPlayerRating(playerExt, rating);
      // hb_log(`RATING ${playerExt.name} (${rating.rating.mu, rating.rating.rd})`);
    });
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
      const checkInterval = setInterval(() => {
        if (inMatch.matchId !== -1) {
          clearInterval(checkInterval);
          hb_log(`updateRankChanges(${inMatch.matchId})`);
          rankChanges.forEach(m => m.match_id = inMatch.matchId);
          rankChanges.forEach(m => this.game_state.insertNewMatchRankChanges(m));
          if (this.room_config.selector === '3vs3') // it is main part of business
            this.sendMsgToAll(`Statystyki z ostatniego meczu znajdziesz tutaj: ${config.webpageLink}/mecz/${inMatch.matchId}`, Colors.Stats, 'italic');
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
    if (this.auto_mode) this.auto_bot.handlePositionsReset();
    this.match_stats.handlePositionsReset();
    this.rejoice_maker.handlePositionsReset();
  }


  handlePlayerChat(player: PlayerObject, message: string): boolean {
    message = message.trim();
    if (!message) return false; // not interested in empty messages
    const userLogMessage = (for_discord: boolean) => { this.game_state.logMessage(player.name, "chat", message, for_discord); return for_discord; }
    if (!message.startsWith('!kb_')) { // to not spam
      hb_log_to_console(player, message)
    }
    let playerExt = this.P(player);
    playerExt.activity.updateChat();
    // at first check captcha
    if (this.captcha.hasPendingCaptcha(player)) {
      this.captcha.checkAnswer(player, message);
      return userLogMessage(false); // wait till captcha passed at first
    }
    // then handle commands
    if (message[0] == '!') {
      // Handle last command
      if (message == "!!") {
        let last_command_str = this.last_command.get(player.id);
        if (last_command_str == null) {
          this.sendMsgToPlayer(player, "Brak ostatniej komendy");
          return false;
        }
        message = last_command_str;
      }
      this.last_command.set(player.id, message);

      message = message.substring(1);
      let message_split = message.split(" ");
      let command = message_split[0];
      this.executeCommand(command, player, message_split.slice(1).filter(e => e));
      return false; // Returning false will prevent the message from being broadcasted
    }
    // then check for wide characters and if so then block any other action
    if (this.containsWideCharacters(message)) {
      if (!this.isPlayerMuted(player)) {
        this.addPlayerMuted(player);
        this.sendMsgToPlayer(player, "Prosimy nie korzystać z dziwnych znaczków! Zostałeś zmutowany!", Colors.Warning);
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
    let anti_spam_muted = !this.anti_spam.canSendMessage(player, message);
    if (this.checkPossibleSpamBot(player)) {
      return userLogMessage(false);
    }
    // OK, we can send message if is not muted nor filtered by anti spam
    if (!this.isPlayerMuted(player) && !anti_spam_muted) {
      // there is team message
      if (message.startsWith("t ") || message.startsWith("T ")) {
        this.sendMessageToSameTeam(player, message.slice(2));
        return userLogMessage(false);
      }
      userLogMessage(true);
      // show as normal for trusted players
      if (playerExt.trust_level > 0) return true;
      // show as grey
      this.sendMsgToAll(`${player.name}: ${message}`, Colors.TrustZero, undefined, 0);
      return false;
    }
    return false;
  }

  async executeCommand(command: string, player: PlayerObject, args: string[] = []) {
    const cmd = this.commander.commands[command];

    if (cmd) {
      cmd.call(this.commander, player, args);
    } else if (player.id != -100) {
      this.sendMsgToPlayer(player, "Nieznana komenda: " + command);
    }
  }

  async sendMessageToSameTeam(player: PlayerObject, message: string) {
    let text = `T ${player.name}: ${message}`;
    let color = player.team == 0 ? Colors.TeamChatSpec : player.team == 1 ? Colors.TeamChatRed : Colors.TeamChatBlue;
    this.getPlayers().filter(e => e.team == player.team).forEach(e => {
      this.sendMsgToPlayer(e, text, color, 'italic', 1);
    });
  }

  checkPossibleSpamBot(player: PlayerObject) {
    if (this.anti_spam.isSpammingSameMessage(player)) {
      if (this.auto_mode) this.players_game_state_manager.setPlayerTimeMuted(this.Pid(player.id), 5 * 60);
      else this.room.kickPlayer(player.id, "Nastepnym razem cie pokonam Hautameki", false);
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

  async kickAllTeamExceptTrusted(player: PlayerObject, team_id: number) {
    for (let p of this.getPlayersExt()) {
      if (player.id != p.id && p.team == team_id && !p.trust_level) this.room.kickPlayer(p.id, "", false);
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

  getPlayerDataByName(playerName: string | string[], byPlayer: PlayerObject | null, byPlayerIfNameNotSpecified = false, allPlayers = false): PlayerData | null {
    // TODO for now it checks all players, added parameter allPlayers, not yet impelmented
    if (!playerName.length) {
      if (byPlayerIfNameNotSpecified && byPlayer) return this.Pid(byPlayer.id); // command refers to caller player
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

  getPlayerObjectByName(playerName: string | string[], byPlayer: PlayerObject | null, byPlayerIfNameNotSpecified = false): PlayerObject | null {
    if (!playerName.length) {
      if (byPlayerIfNameNotSpecified) return byPlayer; // command refers to caller player
      return null; // no name specified, then cannot find player
    }

    let name = Array.isArray(playerName) ? playerName.join(" ") : playerName;
    if (name.startsWith('#')) {
      let cmdPlayerId = Number.parseInt(name.slice(1));
      if (!isNaN(cmdPlayerId)) {
        let cmdPlayer = this.getPlayers().find(e => e.id === cmdPlayerId);
        if (cmdPlayer) return cmdPlayer;
      }
    }
    if (name.startsWith('@')) name = name.slice(1);
    let nameNormalized = normalizeNameString(name);
    let cmdPlayer = this.getPlayers().find(e => this.Pid(e.id).name_normalized === nameNormalized) || null;
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

  isPlayerHost(player: PlayerObject) {
    let p = this.Pid(player.id);
    if (p.auth_id == '' || p.auth_id == config.hostAuthId)
      return true;
    return false;
  }

  isGodPlayer(player: PlayerObject) {
    return player.id === this.god_player.id;
  }

  getSselector() {
    return `${this.room_config.selector}_${this.room_config.subselector}`;
  }
}

/////// helper functions
function giveAdminToPlayerWithName(player_name: string) {
  if (!hb_room) { console.warn('hb_room==null'); return; }
  hb_room.giveAdminToPlayerWithName(player_name);
}

function banPlayersByPrefix(prefix: string) {
  if (!hb_room) { console.warn('hb_room==null'); return; }
  let players = hb_room.room.getPlayerList();
  players.forEach(player => {
    if (hb_room && player.name.startsWith(prefix)) {
      hb_room.room.kickPlayer(player.id, "xD", true);
    }
  });
}

function consoleDumpPlayers() {
  if (!hb_room) { console.warn('hb_room==null'); return; }
  let players = hb_room.room.getPlayerList();
  players.forEach(player => {
    console.log(`Player(${player.id}): ${player.name}`);
  });
}

function giveAdminOnlyTo(player_name: string) {
  if (!hb_room) { console.warn('hb_room==null'); return; }
  let players = hb_room.room.getPlayerList();
  players.forEach(player => {
    if (hb_room) {
      if (player.name == player_name) {
        hb_room.giveAdminTo(player);
      } else {
        hb_room.takeAdminFrom(player);
      }
    }
  });
}

function kickAllExceptMe() {
  if (!hb_room) { console.warn('hb_room==null'); return; }
  let players = hb_room.room.getPlayerList();
  players.forEach(player => {
    if (hb_room && player.name != '.') {
      hb_room.room.kickPlayer(player.id, "Bye bye!", false);
    }
  });
}

function setPlayerAvatarTo(player_name: string, avatar: string) {
  if (!hb_room) { console.warn('hb_room==null'); return; }
  let players = hb_room.room.getPlayerList();
  players.forEach(player => {
    if (hb_room && player.name == player_name) {
      hb_room.room.setPlayerAvatar(player.id, avatar);
      return;
    }
  });
}

function clearPlayerAvatar(player_name: string) {
  if (!hb_room) { console.warn('hb_room==null'); return; }
  let players = hb_room.room.getPlayerList();
  players.forEach(player => {
    if (hb_room && player.name == player_name) {
      hb_room.room.setPlayerAvatar(player.id, null);
      return;
    }
  });
}

let hb_room: HaxballRoom | null = null;
let chat_logger: ChatLogger | null = null;
let db_handler: DBHandler | null = null;
let game_state: GameState | null = null;

export const hb_room_main = (room: RoomObject, roomConfig: config.RoomServerConfig): HaxballRoom => {
  db_handler = new DBHandler(roomConfig.playersDbFile, roomConfig.otherDbFile, roomConfig.vipDbFile);
  chat_logger = new ChatLogger(roomConfig.chatLogDbFile);
  game_state = new GameState(db_handler, chat_logger);
  hb_room = new HaxballRoom(room, roomConfig, game_state);
  return hb_room;
};
