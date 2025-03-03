// https://pastebin.com/f4PSNz7C
// https://pastebin.com/2nHXPbvS

// haxball logging
import { generateVerificationLink } from './verification';
import { tokenDatabase, ServerData } from './token_database';
import * as config from './config';
import ChatLogger from './chat_logger';
import { toBoolean, sleep, normalizeNameString, getTimestampHMS, getTimestampHM } from './utils';
import { Emoji } from './emoji';
import { ScoreCaptcha } from './captcha';
import { BallPossessionTracker } from './possesion_tracker';
import { AntiSpam } from './anti_spam';
import { PlayerAccelerator } from './player_accelerator';
import { AdminStats, PlayerData } from './structs';
import { Colors } from './colors';
import all_maps from './maps';
import { BuyCoffee } from './buy_coffee';
import { DBHandler, GameState } from './game_state';

class HaxballRoom {
  room: RoomObject;
  room_config: config.RoomServerConfig;
  server_start_time: number;
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
  whitelisted_nontrusted_player_names: Set<string>;
  last_command: Map<number, string>;
  muted_players: Set<number>;
  game_state: GameState;
  acceleration_tasks: PlayerAccelerator;
  ball_possesion_tracker: BallPossessionTracker;
  game_stopped_timer: any | null;
  game_paused_timer: any | null;
  last_player_team_changed_by_admin_time: number;
  last_winner_team: number;
  auto_mode: boolean;
  limit: number;
  commands: Record<string, Function>;
  default_map_name: string;
  last_selected_map_name: string | null;
  time_limit_reached: boolean;
  players_num: number;
  room_link: string;
  room_data_sync_timer: any | null;

  constructor(room: RoomObject, roomConfig: config.RoomServerConfig, gameState: GameState) {
    this.room = room;
    this.room_config = roomConfig;

    this.server_start_time = Date.now();
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
    this.auto_mode = false;
    this.limit = 3;
    this.room_link = '';
    this.room_data_sync_timer = null;

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
    this.room.onStadiumChange = this.handleStadiumChange.bind(this);
    this.room.onKickRateLimitSet = this.handleKickRateLimitSet.bind(this);
    this.room.onTeamsLockChange = this.handleTeamsLockChange.bind(this); // TODO edited by hand onTeamLockChange

    this.commands = {
      send: this.commandSendMessage,
      w: this.commandSendMessage,
      pm: this.commandSendMessage,
      pw: this.commandSendMessage,
      pressure: this.commandPressure,
      presja: this.commandPressure,
      restart: this.commandRestartMatch,
      r: this.commandRestartMatch,
      rand_and_restart: this.commandRandomAndRestartMatch,
      rr: this.commandRandomAndRestartMatch,
      win_stay: this.commandWinStayNextMatch,
      ws: this.commandWinStayNextMatch,
      start: this.commandStartMatch,
      stop: this.commandStopMatch,
      s: this.commandStartOrStopMatch,
      swap: this.commandSwapTeams,
      swap_and_restart: this.commandSwapAndRestart,
      sr: this.commandSwapAndRestart,
      a: this.commandAddPlayersToTeam,
      add: this.commandAddPlayersToTeam,
      dodaj: this.commandAddPlayersToTeam,
      map: this.commandChangeMap,
      m: this.commandChangeMap,
      ping: (player: PlayerObject) => this.sendMsgToPlayer(player, "Pong!"),
      mute: this.commandMute,
      muted: this.commandMuted,
      unmute: this.commandUnmute,
      muteall: this.commandMuteAll,
      mute_all: this.commandMuteAll,
      unmute_all: this.commandUnmuteAll,
      unmuteall: this.commandUnmuteAll,
      afk: this.commandSwitchAfk,
      back: this.commandClearAfk,
      jj: this.commandClearAfk,
      afks: this.commandPrintAfkList,
      afklist: this.commandPrintAfkList,
      afk_list: this.commandPrintAfkList,
      afk_set: this.commandSetAfkOther,
      set_afk: this.commandSetAfkOther,
      afk_clear: this.commandClearAfkOther,
      clear_afk: this.commandClearAfkOther,
      bb: this.commandByeBye,
      byebye: this.commandByeBye,
      bye_bye: this.commandByeBye,
      bye: this.commandByeBye,
      kick: this.commandKick,
      kick_not_trusted: this.commandKickAllExceptVerified,
      kk: this.commandKickAllExceptVerified,
      kkr: this.commandKickAllRed,
      kkb: this.commandKickAllBlue,
      kks: this.commandKickAllSpec,
      auto: this.commandAuto,
      limit: this.commandLimit,
      emoji: this.commandEmoji,

      admin: this.commandClaimAdmin,
      aaa: this.commandSelectOneAdmin,
      admin_stat: this.commandAdminStats,
      admin_stats: this.commandAdminStats,

      spec_move_red: this.commandSpecMoveRed,
      spec_move_blue: this.commandSpecMoveBlue,
      red_move_spec: this.commandRedMoveSpec,
      blue_move_spec: this.commandBlueMoveSpec,

      kb_lshift_down: this.keyboardLShiftDown,
      kb_lshift_up: this.keyboardLShiftUp,
      kb_a_down: this.keyboardADown,

      spam_disable: this.commandSpamCheckDisable,
      sd: this.commandSpamCheckDisable,
      other_names: this.commandPlayerOtherNames,

      report: this.commandReport,
      me: this.commandMe,
      stat: this.commandStat,
      stats: this.commandStat,
      auth: this.commandPrintAuth,
      vote: this.commandVote,
      voteup: this.commandVoteUp,
      vote_up: this.commandVoteUp,
      votedown: this.commandVoteDown,
      vote_down: this.commandVoteDown,
      voteremove: this.commandVoteRemove,
      vote_remove: this.commandVoteRemove,
      trust: this.commandTrust,
      verify: this.commandVerify,
      t: this.commandTrust,
      tt: this.commandAutoTrust,

      u: this.commandUnlockWriting,
      sefin: this.commandSefin,
      server_restart: this.commandServerRestart,
      uptime: this.commandUptime,
      dump_players: this.commandDumpPlayers,
      anti_spam: this.commandAntiSpam,
      captcha: this.commandTriggerCaptcha,
      only_trusted_join: this.commandOnlyTrustedJoin,
      only_trusted_chat: this.commandOnlyTrustedChat,
      trust_nick: this.commandWhitelistNonTrustedNick,

      pasek: this.commandPasek,
      kebab: this.commandBuyCoffeeLink,
      coffee: this.commandBuyCoffeeLink,
      cofe: this.commandBuyCoffeeLink,
      coffe: this.commandBuyCoffeeLink,
      kawa: this.commandBuyCoffeeLink,
      buy: this.commandBuyCoffeeLink,
      wsparcie: this.commandBuyCoffeeLink,
      piwo: this.commandBuyCoffeeLink,

      dc: this.commandShowDiscordAndWebpage,
      discord: this.commandShowDiscordAndWebpage,
      link: this.commandShowDiscordAndWebpage,
      www: this.commandShowDiscordAndWebpage,
      web: this.commandShowDiscordAndWebpage,
      website: this.commandShowDiscordAndWebpage,
      info: this.commandShowDiscordAndWebpage,
      site: this.commandShowDiscordAndWebpage,
      home: this.commandShowDiscordAndWebpage,
      url: this.commandShowDiscordAndWebpage,

      h: this.commandHelp,
      "?": this.commandHelp,
      help: this.commandHelp,
      pomoc: this.commandHelp,
      komendy: this.commandHelp
    };

    this.default_map_name = 'futsal';
    this.last_selected_map_name = null;
    this.time_limit_reached = false;
    this.players_num = 0;
    this.limit = roomConfig.playersInTeamLimit;
    this.room.setDefaultStadium("Classic");
    this.setMapByName(this.default_map_name);
    this.room.setTeamsLock(true);
    this.setDefaultKickRateLimit();
    this.setDefaultScoreTimeLimit();
  }

  async handleRoomLink(link: string) {
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
    let serverData = new ServerData(this.room_config.token, this.room_link, this.room_config.roomName, this.players_num, this.room_config.maxPlayersOverride, true, true);
    tokenDatabase.saveServer(serverData);
  }

  P(player: PlayerObject): PlayerData {
    let p = this.players_ext.get(player.id);
    if (!p) throw new Error("P() is null, should be prevented");
    p.update(player);
    return p;
  }

  Pid(player_id: number): PlayerData {
    let p = this.players_ext.get(player_id);
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
    // Current time in ms
    let scores = this.room.getScores();
    let players = this.getPlayersExtList(true);
    let current_tick = scores.time;
    let delta_time = current_tick - this.last_tick;
    this.last_tick = current_tick;

    if (this.feature_pressure) {

      if (delta_time > 0) {
        var ball_position = this.room.getDiscProperties(0);

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

    // check for AFK
    const MaxAllowedNoMoveTime = 15.0 * 1000; // [ms]
    let current_time = Date.now();
    let afk_players_num = 0;
    players.forEach(player_ext => {
      if (player_ext.team && current_time - player_ext.activity.game > MaxAllowedNoMoveTime) {
        if (!player_ext.afk) this.commandSetAfkExt(player_ext);
        else if (player_ext.afk_maybe) this.moveAfkMaybeToSpec(player_ext);
      }
      if (player_ext.afk) afk_players_num++;
    });

    if (afk_players_num == players.length) {
      this.allPlayersAfking(players);
    }
    this.acceleration_tasks.update();
    this.ball_possesion_tracker.trackPossession();
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
  }

  async handleGameStop(byPlayer: PlayerObject | null) {
    if (byPlayer) this.Pid(byPlayer.id).admin_stat_start_stop();
    const MaxAllowedGameStopTime = 20.0 * 1000; // [ms]
    const now = Date.now();
    this.last_player_team_changed_by_admin_time = now;
    this.gamePauseTimerReset();
    this.gameStopTimerReset();
    for (let p of this.getPlayersExt()) {
      p.activity.game = now;
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

  async handleGamePause(byPlayer: PlayerObject | null) {
    if (byPlayer) this.Pid(byPlayer.id).admin_stat_pause_unpause();
    this.sendMsgToAll('Za chwilę kontynuujemy grę!', Colors.GameState);
    const MaxAllowedGamePauseTime = 10.0 * 1000; // [ms]
    this.game_paused_timer = setInterval(() => {
      this.gamePauseTimerReset();
      this.room.pauseGame(false);
      let now = Date.now();
      for (let p of this.getPlayersExt()) {
        p.activity.game = now;
      }
      this.sendMsgToAll('Koniec przerwy, gramy dalej!', Colors.GameState);
    }, MaxAllowedGamePauseTime);
  }

  async handleGameUnpause(byPlayer: PlayerObject | null) {
    if (byPlayer) this.Pid(byPlayer.id).admin_stat_pause_unpause();
    this.gamePauseTimerReset();
  }

  gameStopTimerReset() {
    if (this.game_stopped_timer != null) {
      clearInterval(this.game_stopped_timer);
      this.game_stopped_timer = null;
    }
  }

  gamePauseTimerReset() {
    if (this.game_paused_timer != null) {
      clearInterval(this.game_paused_timer);
      this.game_paused_timer = null;
    }
  }

  updateAdmins(leaving_player: PlayerObject | null, only_if_all_afk = true) {
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
    if (this.checkIfPlayerNameContainsNotAllowedChars(player)) return;
    if (this.checkIfDotPlayerIsHost(player)) return;
    if (this.checkForPlayerDuplicate(player)) return;
    let playerExt = this.P(player);
    this.game_state.getTrustAndAdminLevel(playerExt).then(result => {
      let kicked = false;
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
          kicked = true;
        }
      }
      if (playerExt.auth_id && playerExt.trust_level == 0) {
        this.captcha.askCaptcha(player);
      }
      if (!kicked) {
        this.game_state.insertPlayerName(playerExt.auth_id, playerExt.name);
        this.updateAdmins(null);
      }
    });
    this.anti_spam.addPlayer(player);
    if (this.anti_spam.enabled) {
      this.sendMsgToPlayer(player, `Jesteś wyciszony na 30 sekund; You are muted for 30 seconds`, Colors.Admin, 'bold');
    }
    // this.sendOnlyTo(player, `Mozesz aktywować sterowanie przyciskami (Link: https://tinyurl.com/HaxballKeyBinding): Lewy Shift = Sprint, A = Wślizg`, 0x22FF22);
    this.sendMsgToPlayer(player, `Sprawdź dostępne komendy: !help`, Colors.Help);
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
    let kicked = false;
    let player_auth = player.auth || '';
    for (let p of this.getPlayersExt()) {
      if (p.id != player.id) {
        if (p.auth_id == player_auth && p.conn_id == player.conn) {
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
    let player_ext = this.Pid(player.id);
    player_ext.mark_disconnected();
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
  }

  async handlePlayerActivity(player: PlayerObject) {
    let p = this.Pid(player.id);
    p.activity.updateGame();
    p.activity.updateMove();
    if (p.afk || p.afk_maybe) {
      p.afk = false;
      p.afk_maybe = false;
      this.room.setPlayerAvatar(p.id, null);
    }
  }

  async handlePlayerBallKick(player: PlayerObject) {
    this.ball_possesion_tracker.registerBallKick(player);
  }

  async handleTeamGoal(team: number) {
    this.ball_possesion_tracker.onTeamGoal(team);
  }

  async handleTeamVictory(scores: ScoresObject) {
    if (scores.red > scores.blue) this.last_winner_team = 1;
    else if (scores.blue > scores.red) this.last_winner_team = 2;
    else this.last_winner_team = 0;
  }

  handlePlayerChat(player: PlayerObject, message: string): boolean {
    message = message.trim();
    if (!message) return false; // not interested in empty messages
    const userLogMessage = (for_discord: boolean) => { this.game_state.logMessage(player.name, "chat", message, for_discord); return for_discord; }
    let for_discord = false;
    if (!message.startsWith('!kb_')) { // to not spam
      hb_log_to_console(player, message)
    }
    if (this.containsWideCharacters(message)) {
      if (!this.isPlayerMuted(player)) {
        this.addPlayerMuted(player);
        this.sendMsgToPlayer(player, "Prosimy nie korzystać z dziwnych znaczków! Zostałeś zmutowany!", Colors.Warning);
      }
      return userLogMessage(false);
    }
    let playerExt = this.P(player);
    playerExt.activity.updateChat();
    if (this.captcha.hasPendingCaptcha(player)) {
      this.captcha.checkAnswer(player, message);
      return userLogMessage(false); // wait till captcha passed at first
    }
    if (this.allow_chatting_only_trusted && !playerExt.trust_level) {
      return userLogMessage(false); // only trusted can write
    }
    let anti_spam_muted = !this.anti_spam.canSendMessage(player, message);
    if (this.checkPossibleSpamBot(player)) {
      return userLogMessage(false);
    }
    if (message[0] != "!") {
      if (!this.isPlayerMuted(player) && !anti_spam_muted) {
        if (message.startsWith("t ") || message.startsWith("T ")) {
          this.sendMessageToSameTeam(player, message.slice(2));
          return userLogMessage(false);
        }
        userLogMessage(true);
        if (playerExt.trust_level > 0) return true;
        this.sendMsgToAll(`${player.name}: ${message}`, Colors.TrustZero, undefined, 0);
        return false;
      }
      return false;
    }

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

  async executeCommand(command: string, player: PlayerObject, args: string[] = []) {
    const cmd = this.commands[command];

    if (cmd) {
      cmd.call(this, player, args);
    } else {
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
      this.room.kickPlayer(player.id, "Nastepnym razem cie pokonam Hautameki", false);
      return true;
    }
    return false;
  }

  async commandSendMessage(player: PlayerObject, cmds: string[]) {
    if (cmds.length < 2) {
      this.sendMsgToPlayer(player, 'Uzycie:!pm/!pw/!w <@player_name> <message...>')
      return;
    }
    let cmdPlayer = this.getPlayerObjectByName(cmds[0], player);
    if (!cmdPlayer) return;
    if (cmdPlayer.id == player.id) return;
    let msg = cmds.slice(1).join(" ");
    this.sendMsgToPlayer(player, `PM>> ${cmdPlayer.name}: ${msg}`, 0xFFBF00, 'italic');
    this.sendMsgToPlayer(cmdPlayer, `PM<< ${player.name}: ${msg}`, 0xFFBF00, 'italic', 1);
  }

  parsePlayerName(player_name: string) {
    // remove leading '@' if any
    return player_name.startsWith('@') ? player_name.slice(1) : player_name;
  }

  async commandPressure(player: PlayerObject) {
    this.room.sendAnnouncement(
      `Pressure: Red ${this.pressure_right.toFixed(2)}s, Blue ${this.pressure_left.toFixed(2)}s`
    );
  }

  async commandRestartMatch(player: PlayerObject) {
    if (this.warnIfPlayerIsNotAdmin(player)) return;
    this.updateWinnerTeamBeforeGameStop();
    this.room.stopGame();
    await sleep(125);
    this.room.startGame();
    this.sendMsgToAll(`(!r) ${player.name} zrobił restart meczu, limit: ${this.limit} (!limit), zmiana mapy: !m 2, !m 3, !m 4`, Colors.GameState);
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

  async commandRandomAndRestartMatch(player: PlayerObject) {
    if (this.warnIfPlayerIsNotAdmin(player)) return;
    this.updateWinnerTeamBeforeGameStop();
    this.makeRandomAndRestartMatch();
    this.sendMsgToAll(`(!rr) ${player.name} zrobił losowanie drużyn${this.getPrevWinnerLogTxt()}, limit: ${this.limit} (!limit), zmiana mapy: !m 2, !m 3, !m 4`, Colors.GameState);
  }

  async commandWinStayNextMatch(player: PlayerObject) {
    if (this.warnIfPlayerIsNotAdmin(player)) return;
    this.updateWinnerTeamBeforeGameStop();
    if (!this.last_winner_team) this.makeRandomAndRestartMatch();
    else this.makeWinStayAndRestartMatch();
    this.sendMsgToAll(`(!ws) ${player.name} zostawił zwycięską druzynę${this.getPrevWinnerLogTxt()}, limit: ${this.limit} (!limit), zmiana mapy: !m 2, !m 3, !m 4`, Colors.GameState);
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

    let players: PlayerData[] = this.getPlayersExtList();
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

  async commandStartMatch(player: PlayerObject) {
    if (this.warnIfPlayerIsNotAdmin(player)) return;
    this.room.startGame();
  }

  async commandStopMatch(player: PlayerObject) {
    if (this.warnIfPlayerIsNotAdmin(player)) return;
    this.updateWinnerTeamBeforeGameStop();
    this.room.stopGame();
  }

  async commandStartOrStopMatch(player: PlayerObject) {
    if (this.warnIfPlayerIsNotAdmin(player)) return;
    let d = this.room.getScores();
    if (d) {
      this.updateWinnerTeamBeforeGameStop();
      this.room.stopGame();
    } else {
      this.room.startGame();
    }
  }

  async commandSwapTeams(player: PlayerObject) {
    if (this.warnIfPlayerIsNotAdmin(player)) return;
    if (this.isGameInProgress()) {
      this.sendMsgToPlayer(player, 'Nie mozna zmieniać zespołów podczas meczu!')
      return;
    }
    this.swapTeams();
  }

  async commandSwapAndRestart(player: PlayerObject) {
    if (this.warnIfPlayerIsNotAdmin(player)) return;
    this.updateWinnerTeamBeforeGameStop();
    this.room.stopGame();
    await sleep(125);
    this.swapTeams();
    await sleep(125);
    this.room.startGame();
    this.sendMsgToAll(`(!sr) ${player.name} zmienił strony druzyn, limit: ${this.limit} (!limit), zmiana mapy: !m 2, !m 3, !m 4`, Colors.GameState);
  }

  async commandAddPlayersToTeam(player: PlayerObject) {
    if (this.warnIfPlayerIsNotAdmin(player)) return;
    let players = this.getPlayersExtList(true);
    this.shuffleAllPlayers(players);
    let red = this.limit;
    let blue = this.limit;

    players.forEach(e => {
      if (e.team == 1) red--;
      else if (e.team == 2) blue--;
    });
    let any_added = false;

    for (let i = 0; i < players.length && (red > 0 || blue > 0); i++) {
      let player_ext = players[i];
      if (player_ext.afk || player_ext.team != 0) continue;

      let team;
      if (red > blue) team = 1;
      else team = 2
      if (team == 1) red--;
      else blue--;

      this.room.setPlayerTeam(player_ext.id, team);
      any_added = true;
    }
    if (any_added) this.sendMsgToAll(`(!a) ${player.name} uzupełnił druzyny`, Colors.GameState);
  }

  swapTeams() {
    this.getPlayers().filter(e => e.team > 0).forEach(e => {
      this.room.setPlayerTeam(e.id, this.getOpponentTeam(e.team));
    });
  }

  async commandHelp(player: PlayerObject) {
    this.sendMsgToPlayer(player, "Komendy: !pm/w !bb !ping !afk !back/jj !afks !stat !discord !pasek !kebab", Colors.Help);
    if (player.admin) {
      this.sendMsgToPlayer(player, "Dla Admina: !mute !unmute !restart/r !start/stop/s !swap !swap_and_restart/sr !rand_and_restart/rr !win_stay/ws !add/a !map/m", Colors.Help);
    }
    let playerExt = this.Pid(player.id);
    if (playerExt.trust_level > 0) {
      this.sendMsgToPlayer(player, ": !vote !voteup !votedown !voteremove !report !verify", Colors.Help);
    }
    this.sendMsgToPlayer(player, "By wywołać ostatnią komendę, uzyj !!", Colors.Help);
  }

  async commandChangeMap(player: PlayerObject, cmds: string[]) {
    if (this.warnIfPlayerIsNotAdmin(player)) return;
    if (cmds.length == 0) {
      this.sendMsgToPlayer(player, 'Napisz jaką mapę chcesz, dostępne: classic/c, big/b, futsal/f, futsal_big/fb');
      return;
    }
    let map_name = cmds[0].toLowerCase();
    if (all_maps.has(map_name)) {
      if (!this.isGameInProgress()) {
        this.setMapByName(map_name);
        this.sendMsgToAll(`${player.name} zmienił mapę na ${map_name}`, Colors.GameState);
      }
    } else {
      this.sendMsgToPlayer(player, 'Nie ma takiej mapy', Colors.Warning);
    }
  }

  async commandMute(player: PlayerObject, cmds: string[]) {
    if (this.warnIfPlayerIsNotAdminNorHost(player)) return;
    let cmdPlayer = this.getPlayerObjectByName(cmds, player);
    if (!cmdPlayer) return;
    if (cmdPlayer.id == player.id) return;
    this.addPlayerMuted(cmdPlayer);
    this.sendMsgToPlayer(cmdPlayer, "Zostałeś wyciszony!", Colors.Warning, undefined, 2);
    this.sendMsgToPlayer(player, `Muted: ${cmdPlayer.name}`);
  }

  async commandMuted(player: PlayerObject) {
    let muted: string[] = [];
    for (let p of this.getPlayersExt()) {
      if (this.isPlayerMuted(p)) muted.push(p.name);
    }
    this.sendMsgToPlayer(player, `Muted: ${muted.join(" ")}`);
  }

  async commandMuteAll(player: PlayerObject) {
    if (this.warnIfPlayerIsNotAdminNorHost(player)) return;
    for (let p of this.getPlayersExt()) {
      this.addPlayerMuted(p);
    }
    this.sendMsgToPlayer(player, "Muted all Players", Colors.GameState);
  }

  async commandUnmute(player: PlayerObject, cmds: string[]) {
    if (this.warnIfPlayerIsNotAdminNorHost(player)) return;
    let cmdPlayer = this.getPlayerObjectByName(cmds, player);
    if (!cmdPlayer) return;
    if (player.id == cmdPlayer.id) return;
    if (!this.isPlayerMuted(cmdPlayer)) return;
    this.removePlayerMuted(cmdPlayer);
    this.anti_spam.removePlayer(cmdPlayer);
    this.sendMsgToPlayer(cmdPlayer, "Ju mozesz pisać!", Colors.Warning, undefined, 2);
    this.sendMsgToPlayer(player, `Unmuted: ${cmdPlayer.name}`);
  }

  async commandUnmuteAll(player: PlayerObject) {
    if (this.warnIfPlayerIsNotAdminNorHost(player)) return;
    this.muted_players.clear();
    this.sendMsgToPlayer(player, "Unmuted all Players", Colors.GameState);
  }

  async commandSwitchAfk(player: PlayerObject) {
    // switch on/off afk
    let player_ext = this.Pid(player.id);
    if (!player_ext.afk) {
      this.commandSetAfkExt(player_ext);
    } else {
      // clear AFK status
      this.commandClearAfkExt(player_ext);
    }
  }

  async commandSetAfk(player: PlayerObject) {
    this.commandSetAfkExt(this.Pid(player.id));
  }

  commandSetAfkExt(player_ext: PlayerData) {
    // set on afk
    if (player_ext.afk) return;
    player_ext.afk = true;
    this.room.setPlayerAvatar(player_ext.id, '💤');
    this.sendMsgToAll(`${player_ext.name} poszedł AFK (!afk !back !jj)`, Colors.Afk);
    if (player_ext.team != 0) {
      this.room.setPlayerTeam(player_ext.id, 0);
    }
    if (player_ext.admin) this.updateAdmins(null);
  }

  async commandClearAfk(player: PlayerObject) {
    this.commandClearAfkExt(this.Pid(player.id));
  }

  commandClearAfkExt(player_ext: PlayerData) {
    if (player_ext.afk) {
      player_ext.afk = false;
      this.room.setPlayerAvatar(player_ext.id, null);
      this.sendMsgToAll(`${player_ext.name} wrócił z AFK (!afk !back !jj)`, Colors.Afk);
      player_ext.activity.updateGame();
    }
    this.updateAdmins(null);
  }

  async commandPrintAfkList(player: PlayerObject) {
    var log_str = "AFK list: "
    for (let player_ext of this.getPlayersExt()) {
      if (player_ext.afk || player_ext.afk_maybe) log_str += `${player.name}[${player.id}] `;
    }
    this.sendMsgToPlayer(player, log_str);
  }

  async commandSetAfkOther(player: PlayerObject, cmds: string[]) {
    if (this.warnIfPlayerIsNotAdminNorHost(player)) return;
    let cmdPlayer = this.getPlayerObjectByName(cmds, player);
    if (!cmdPlayer) return;
    let cmdPlayerExt = this.Pid(cmdPlayer.id);
    if (!cmdPlayerExt.afk) this.commandSetAfkExt(cmdPlayerExt);
  }

  async commandClearAfkOther(player: PlayerObject, cmds: string[]) {
    if (this.warnIfPlayerIsNotAdminNorHost(player)) return;
    let cmdPlayer = this.getPlayerObjectByName(cmds, player);
    if (!cmdPlayer) return;
    let cmdPlayerExt = this.Pid(cmdPlayer.id);
    this.commandClearAfkExt(cmdPlayerExt);
  }

  async commandByeBye(player: PlayerObject) {
    this.room.kickPlayer(player.id, "Bye bye!", false);
  }

  async commandKick(player: PlayerObject, cmds: string[]) {
    if (this.warnIfPlayerIsNotAdminNorHost(player)) return;
    let cmdPlayer = this.getPlayerObjectByName(cmds, player);
    if (!cmdPlayer) return;
    if (cmdPlayer.id == player.id) return;
    this.room.kickPlayer(cmdPlayer.id, "", false);
  }

  async commandKickAllExceptVerified(player: PlayerObject) {
    if (this.warnIfPlayerIsNotAdminNorHost(player)) return;
    for (let p of this.getPlayersExt()) {
      if (player.id != p.id && !p.trust_level) this.room.kickPlayer(p.id, "", false);
    }
  }

  async commandKickAllRed(player: PlayerObject) {
    if (this.warnIfPlayerIsNotAdminNorHost(player)) return;
    this.kickAllTeamExceptTrusted(player, 1);
  }

  async commandKickAllBlue(player: PlayerObject) {
    if (this.warnIfPlayerIsNotAdminNorHost(player)) return;
    this.kickAllTeamExceptTrusted(player, 2);
  }

  async commandKickAllSpec(player: PlayerObject) {
    if (this.warnIfPlayerIsNotAdminNorHost(player)) return;
    this.kickAllTeamExceptTrusted(player, 0);
  }

  async kickAllTeamExceptTrusted(player: PlayerObject, team_id: number) {
    for (let p of this.getPlayersExt()) {
      if (player.id != p.id && p.team == team_id && !p.trust_level) this.room.kickPlayer(p.id, "", false);
    }
  }

  async commandAuto(player: PlayerObject, values: string[]) {
    if (this.warnIfPlayerIsNotApprovedAdmin(this.Pid(player.id))) return;
    if (values.length == 0) return;
    if (values[0] == "on") {
      this.auto_mode = true;
      this.sendMsgToAll("Włączono tryb automatyczny!")
    } else if (values[0] == "off") {
      this.auto_mode = false;
      this.sendMsgToAll("Wyłączono tryb automatyczny!")
    } else {
      this.sendMsgToPlayer(player, "Poprawne wartosci: [on, off]");
    }
  }

  async commandLimit(player: PlayerObject, values: string[]) {
    if (this.warnIfPlayerIsNotAdmin(player)) return;
    if (values.length == 0) return;
    try {
      const limit = parseInt(values[0], 10);
      if (limit < 1 || limit > 6) {
        this.sendMsgToPlayer(player, "Poprawne wartosci to zakres <1, 6>")
      } else {
        this.limit = limit;
        this.sendMsgToAll(`Zmieniono limit max graczy w druzynie na ${limit}`);
      }
    } catch (e) { }
  }

  async commandEmoji(player: PlayerObject) {
    if (this.warnIfPlayerIsNotAdmin(player)) return;
    this.emoji.turnOnOff();
    this.sendMsgToPlayer(player, "Losowe Emoji, by włączyć/wyłączyć - odpal jeszcze raz komendę")
  }

  async commandClaimAdmin(player: PlayerObject) {
    let playerExt = this.Pid(player.id);
    if (playerExt.trust_level == 0) return;
    if (playerExt.admin_level > 0) {
      this.giveAdminTo(playerExt); // approved admin
      return;
    }
  }

  async commandSelectOneAdmin(player: PlayerObject) {
    let playerExt = this.Pid(player.id);
    if (playerExt.trust_level == 0) return;
    let currentAdmins: PlayerData[] = [];
    let bestAdmin: PlayerData | null = null;
    if (playerExt.admin_level > 0) {
      this.giveAdminTo(playerExt); // approved admin
      bestAdmin = playerExt;
    }
    let players = this.getPlayersExtList(true);
    if (!bestAdmin) { // if calling player is not approved admin then find best from others
      players.forEach(p => {
        if (p.admin) currentAdmins.push(p);
        if (p.trust_level > 0) {
          if (bestAdmin == null) bestAdmin = p;
          else if (p.trust_level > bestAdmin.trust_level || (p.trust_level == bestAdmin.trust_level && p.join_time < bestAdmin.join_time)) {
            bestAdmin = p;
          }
        }
      });
    }
    if (bestAdmin == null) return;
    const chosenAdmin: PlayerData = bestAdmin;
    if (currentAdmins.length == 1 && currentAdmins[0].id == chosenAdmin.id) return;
    currentAdmins.push(chosenAdmin);
    players.forEach(e => {
      if (e.id == chosenAdmin.id && !chosenAdmin.admin) this.giveAdminTo(chosenAdmin);
      if (e.id != chosenAdmin.id) this.takeAdminFrom(e);
    });
    this.sendMsgToAll(`${chosenAdmin.name} jako gracz z najwyzszym zaufaniem i najdłuzej afczący zostaje wybrany na jedynego admina by zarządzać sytuacją kryzysową!`, 0xEE3333, 'bold', 2);
  }

  async commandAdminStats(player: PlayerObject, cmds: string[]) {
    if (this.warnIfPlayerIsNotAdminNorHost(player)) return;
    let cmdPlayer = this.getPlayerObjectByName(cmds, player, true);
    if (!cmdPlayer) return;
    let p = this.Pid(cmdPlayer.id);
    let s = p.admin_stats;
    let txt = `${p.name}: admin(${s != null})`;
    if (s) {
      txt += ` od(${s.since})`;
      if (s.given_by) txt += ` przez(${s.given_by})`;
      if (s.kicked_users.size) txt += ` kick(${[...s.kicked_users].join(', ')})`;
      if (s.banned_users.size) txt += ` ban(${[...s.banned_users].join(', ')})`;
      txt += ` s(${s.action_start_stop}/${s.action_pause_unpause}/${s.action_admin}/${s.action_team}/${s.action_kick}/${s.action_other})`;
    }
    this.sendMsgToPlayer(player, txt);
  }

  async commandSpecMoveRed(player: PlayerObject) {
    if (this.warnIfPlayerIsNotAdmin(player)) return;
    this.movePlayerBetweenTeams(0, 1);
  }

  async commandSpecMoveBlue(player: PlayerObject) {
    if (this.warnIfPlayerIsNotAdmin(player)) return;
    this.movePlayerBetweenTeams(0, 2);
  }

  async commandRedMoveSpec(player: PlayerObject) {
    if (this.warnIfPlayerIsNotAdmin(player)) return;
    this.movePlayerBetweenTeams(1, 0);
  }

  async commandBlueMoveSpec(player: PlayerObject) {
    if (this.warnIfPlayerIsNotAdmin(player)) return;
    this.movePlayerBetweenTeams(2, 0);
  }

  movePlayerBetweenTeams(from_team: number, to_team: number) {
    this.getPlayers().forEach(player => {
      if (player.team == from_team) {
        this.room.setPlayerTeam(player.id, to_team);
      }
    });
  }

  async keyboardLShiftDown(player: PlayerObject) {
    this.acceleration_tasks.startSprint(player.id);
  }

  async keyboardLShiftUp(player: PlayerObject) {
    this.acceleration_tasks.stopSprint(player.id);
  }

  async keyboardADown(player: PlayerObject) {
    this.acceleration_tasks.slide(player.id);
  }

  async commandSefin(player: PlayerObject) {
    if (!this.isPlayerHost(player)) {
      this.sendMsgToPlayer(player, "Nieznana komenda: sefin");
      return;
    }
    this.sendMsgToPlayer(player, "Sprawdzamy czy jest Sefinek na serwerze");
    const sefik_auth_id = 'nV4o2rl_sZDXAfXY7rYHl1PDr-qz56V03uz20npdtzw';
    const sefik_conn_id = '38372E3230352E3133392E313339';
    for (let p of this.getPlayersExt()) {
      if (p.auth_id == sefik_auth_id) {
        this.sendMsgToPlayer(player, `${p.name} [${p.id}] zgadza się auth`);
      } else if (p.conn_id == sefik_conn_id) {
        this.sendMsgToPlayer(player, `${p.name} [${p.id}] zgadza się conn`);
      }
    }
    let disconnected: string[] = [];
    this.players_ext_all.forEach((p, player_id) => {
      if (!p.connected && (p.auth_id == sefik_auth_id || p.conn_id == sefik_conn_id)) {
        disconnected.push(p.name);
      }
    });
    if (disconnected.length > 0) {
      this.sendMsgToPlayer(player, `Był jako: ${disconnected.join(", ")}`);
    }
  }

  async commandSpamCheckDisable(player: PlayerObject, cmds: string[]) {
    if (this.warnIfPlayerIsNotAdmin(player)) return;
    cmds.forEach(player_name => {
      let cmdPlayer = this.getPlayerObjectByName(player_name, null);
      if (cmdPlayer) {
        this.anti_spam.setSpamDisabled(cmdPlayer);
      }
    });
  }

  async commandPlayerOtherNames(player: PlayerObject, cmds: string[]) {
    let playerExt = this.Pid(player.id);
    if (this.warnIfPlayerIsNotApprovedAdmin(playerExt)) return;
    if (cmds.length == 0) {
      this.sendMsgToPlayer(player, "Wpisz nazwę gracza");
      return;
    }
    let cmdPlayer = this.getPlayerObjectByName(cmds, player);
    if (!cmdPlayer) return;
    let cmdPlayerExt = this.P(cmdPlayer);
    let lastPlayerNames = this.game_state.getPlayerNames(cmdPlayerExt.auth_id);
    this.sendMsgToPlayer(player, `Ostatnie 5 nazw: ${(await lastPlayerNames).join(', ')}`);
  }

  async commandReport(player: PlayerObject, cmds: string[]) {
    let playerExt = this.Pid(player.id);
    if (playerExt.trust_level == 0) return;
    let report = cmds.join(" ").trim();
    if (!report) return;
    this.game_state.addReport(playerExt.name, playerExt.auth_id, report);
    this.sendMsgToPlayer(player, 'Twoje zazalenie zostanie rozpatrzone oraz zignorowane juz wkrótce!');
  }

  async commandMe(player: PlayerObject, cmds: string[]) {
    let cmdPlayer = this.getPlayerObjectByName(cmds, player, true);
    if (!cmdPlayer) return;
    let cmdPlayerExt = this.P(cmdPlayer);
    let playerExt = this.Pid(player.id);
    let adminStr = playerExt.admin_level ? ` a:${cmdPlayerExt.admin_level}` : '';
    let dateStr = getTimestampHM();
    this.sendMsgToPlayer(player, `${cmdPlayerExt.name} t:${cmdPlayerExt.trust_level}${adminStr} od:${dateStr}`);
  }

  async commandStat(player: PlayerObject, cmds: string[]) {
    this.sendMsgToPlayer(player, 'Niedługo statsy się pojawią!');
  }

  async commandPrintAuth(player: PlayerObject) {
    this.sendMsgToPlayer(player, `Twój auth ID to: ${this.Pid(player.id).auth_id}`);
  }

  async commandVote(player: PlayerObject) {
    let playerExt = this.Pid(player.id);
    if (playerExt.trust_level == 0) return;
    this.game_state.getPlayerVotes(playerExt.auth_id).then(({ upvotes, downvotes }) => {
      this.sendMsgToPlayer(player, `Masz ${upvotes} 👍 oraz ${downvotes} 👎, daj komuś kciuka w górę: !voteup @kebab`, Colors.Help);
    }).catch((error) => {
      console.error('Błąd przy pobieraniu reputacji:', error);
    });
  }

  async commandVoteUp(player: PlayerObject, cmds: string[]) {
    let playerExt = this.Pid(player.id);
    if (playerExt.trust_level == 0) return;
    if (cmds.length == 0) {
      this.sendMsgToPlayer(player, "Wpisz nazwę gracza któremu chcesz dać kciuka w górę!");
      return;
    }
    let cmdPlayer = this.getPlayerObjectByName(cmds, player);
    if (!cmdPlayer) return;
    if (player.id == cmdPlayer.id) return;
    let cmdPlayerExt = this.Pid(cmdPlayer.id);
    this.game_state.voteUp(playerExt.auth_id, cmdPlayerExt.auth_id);
    this.sendMsgToPlayer(player, `Dałeś ${cmdPlayerExt.name} kciuka w górę!`);
  }

  async commandVoteDown(player: PlayerObject, cmds: string[]) {
    let playerExt = this.Pid(player.id);
    if (playerExt.trust_level == 0) return;
    if (cmds.length == 0) {
      this.sendMsgToPlayer(player, "Wpisz nazwę gracza któremu chcesz dać kciuka w dół!");
      return;
    }
    let cmdPlayer = this.getPlayerObjectByName(cmds, player);
    if (!cmdPlayer) return;
    if (player.id == cmdPlayer.id) return;
    let cmdPlayerExt = this.Pid(cmdPlayer.id);
    this.game_state.voteDown(playerExt.auth_id, cmdPlayerExt.auth_id);
    this.sendMsgToPlayer(player, `Dałeś ${cmdPlayerExt.name} kciuka w dół!`);
  }

  async commandVoteRemove(player: PlayerObject, cmds: string[]) {
    let playerExt = this.Pid(player.id);
    if (playerExt.trust_level == 0) return;
    if (cmds.length == 0) {
      this.sendMsgToPlayer(player, "Wpisz nazwę gracza któremu chcesz zabrać swojego kciuka!");
      return;
    }
    let cmdPlayer = this.getPlayerObjectByName(cmds, player);
    if (!cmdPlayer) return;
    if (player.id == cmdPlayer.id) return;
    let cmdPlayerExt = this.Pid(cmdPlayer.id);
    this.game_state.removeVote(playerExt.auth_id, cmdPlayerExt.auth_id);
    this.sendMsgToPlayer(player, `Zabrałeś ${cmdPlayerExt.name} kciuka!`);
  }

  async commandVerify(player: PlayerObject) {
    let playerExt = this.Pid(player.id);
    if (playerExt.trust_level == 0 || playerExt.verify_link_requested) return;
    const link = generateVerificationLink(player.name);
    playerExt.verify_link_requested = true;
    this.sendMsgToPlayer(player, `Twój link: ${link}`);
  }

  async commandTrust(player: PlayerObject, cmds: string[]) {
    if (this.warnIfPlayerIsNotAdminNorHost(player)) return;
    if (cmds.length == 0) {
      this.sendMsgToPlayer(player, "Uzycie: !t <@nick> <trust_level>");
      return;
    }
    let cmdPlayer = this.getPlayerObjectByName(cmds[0], player);
    if (!cmdPlayer) return;
    let cmd_player_ext = this.Pid(cmdPlayer.id);
    if (cmdPlayer.id == player.id) {
      this.sendMsgToPlayer(player, `Nie mozesz sobie samemu zmieniać poziomu!`);
      return;
    }
    let caller_ext = this.Pid(player.id);
    if (caller_ext.trust_level < 2) {
      this.sendMsgToPlayer(player, `Musisz mieć co najmniej drugi poziom by móc nadawać poziom zaufania!`);
      return;
    }
    let trust_level = parseInt(cmds[1] ?? 1, 10);
    trust_level = isNaN(trust_level) ? 0 : trust_level;
    if (trust_level <= 0) {
      this.sendMsgToPlayer(player, `Wartość nie moze być mniejsza ani równa zero: ${trust_level}`);
      return;
    } else if (trust_level >= caller_ext.trust_level) {
      this.sendMsgToPlayer(player, `Nie możesz nadać poziomu ${trust_level}, ponieważ Twój własny poziom to ${caller_ext.trust_level}. Możesz przyznać jedynie poziomy niższe od swojego.`);
      return;
    } else if (caller_ext.trust_level < 10 && trust_level < cmd_player_ext.trust_level) {
      this.sendMsgToPlayer(player, `Nie możesz obnizyc poziomu, mozesz jedynie podwyzszyc poziom innych graczy.`);
      return;
    }
    cmd_player_ext.trust_level = trust_level;
    this.game_state.setTrustLevel(cmd_player_ext, trust_level, caller_ext);
    this.sendMsgToPlayer(player, `Ustawiłeś trust level ${cmd_player_ext.name} na ${trust_level}`);
  }

  async commandAutoTrust(player: PlayerObject, cmds: string[]) {
    if (this.warnIfPlayerIsNotAdminNorHost(player)) return;
    if (cmds.length == 0) {
      this.sendMsgToPlayer(player, `podkomendy: red/r blue/b spec/s all/a by dodać wszystkich z danego teamu do kolejki`);
      this.sendMsgToPlayer(player, `+ by nadać wszystkim wartość zaufania 1; - by usunąć wszystkich z kolejki; a+ dodaj wszystkich`);
      return;
    }
    let caller_ext = this.Pid(player.id);
    if (caller_ext.trust_level < 2) {
      this.sendMsgToPlayer(player, `Musisz mieć co najmniej drugi poziom by móc nadawać poziom zaufania!`);
      return;
    }
    let red = false;
    let spec = false;
    let blue = false;
    let c = cmds[0];
    if (c == 'red' || c == 'r') red = true;
    else if (c == 'spec' || c == 's') spec = true;
    else if (c == 'blue' || c == 'b') blue = true;
    else if (c == 'all' || c == 'a') {
      red = spec = blue = true;
    } else if (c == '+') {
      this.sendMsgToPlayer(player, `Ustawiłeś zaufanie dla: ${this.to_be_trusted.size} graczy!`)
      this.to_be_trusted.forEach(player_id => {
        let p = this.Pid(player_id);
        p.trust_level = 1;
        this.game_state.setTrustLevel(p, 1, caller_ext);
      });
      this.to_be_trusted.clear();
      return;
    } else if (c == '-') {
      this.to_be_trusted.clear();
      return;
    } else if (c == 'a+') {
      this.commandAutoTrust(player, ['a', ...cmds.slice(1)]);
      this.commandAutoTrust(player, ['+', ...cmds.slice(1)]);
      return;
    } else {
      return;
    }
    let to_be_trusted_names = new Set();
    this.getPlayersExtList(true).forEach(p => {
      let add = false;
      if (player.id != p.id) {
        if (p.trust_level == 0) {
          if (p.team == 0 && spec) add = true;
          else if (p.team == 1 && red) add = true;
          else if (p.team == 2 && blue) add = true;
        }
      }
      if (add) {
        this.to_be_trusted.add(p.id);
        to_be_trusted_names.add(p.name);
      } else if (this.to_be_trusted.has(p.id)) {
        to_be_trusted_names.add(p.name);
      }
    });
    this.sendMsgToPlayer(player, `W kolejce do dodania czekają: ${[...to_be_trusted_names].join(" ")}`);
  }

  async commandUnlockWriting(player: PlayerObject, cmds: string[]) {
    if (this.hostOnlyCommand(player, 'u')) return;
    if (cmds.length == 0) {
      this.anti_spam.clearMute(player);
      this.captcha.clearCaptcha(player);
      this.giveAdminTo(player);
    } else {
      let cmdPlayer = this.getPlayerObjectByName(cmds, player);
      if (!cmdPlayer) return;
      this.anti_spam.clearMute(cmdPlayer);
      this.captcha.clearCaptcha(cmdPlayer);
      this.sendMsgToPlayer(player, `Usunąłem blokady dla gracza: ${cmdPlayer.name}`);
    }
  }

  hostOnlyCommand(player: PlayerObject, cmd_name: string) {
    if (!this.isPlayerHost(player)) {
      this.sendMsgToPlayer(player, `Nieznana komenda:${cmd_name} `);
      return true;
    }
    return false
  }

  async commandServerRestart(player: PlayerObject) {
    if (this.hostOnlyCommand(player, 'server_restart')) return;
    for (let p of this.getPlayersExt()) {
      this.room.kickPlayer(p.id, "Server is restarted!", false);
    }
  }

  formatUptime(ms: number) {
    const total_seconds = Math.floor(ms / 1000);
    const hours = String(Math.floor(total_seconds / 3600)).padStart(2, '0');
    const minutes = String(Math.floor((total_seconds % 3600) / 60)).padStart(2, '0');
    const seconds = String(total_seconds % 60).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  }

  async commandUptime(player: PlayerObject) {
    let txt = this.formatUptime(Date.now() - this.server_start_time);
    this.sendMsgToPlayer(player, `Server uptime: ${txt}`);
  }

  async commandPasek(player: PlayerObject) {
    this.sendMsgToPlayer(player, 'Mniejsza kulka wskazuje presję na połowie przeciwnika, większa kulka określa posiadanie piłki');
  }

  async commandBuyCoffeeLink(player: PlayerObject) {
    let link = 'https://' + BuyCoffee.buy_coffe_link;
    let random_text = BuyCoffee.buy_coffee_link_texts[Math.floor(Math.random() * BuyCoffee.buy_coffee_link_texts.length)];
    this.sendMsgToPlayer(player, `${random_text} ${link}`, 0xFF4444, 'bold', 2);
  }

  async commandShowDiscordAndWebpage(player: PlayerObject) {
    this.sendMsgToPlayer(player, `Chcesz pogadać? 💬 ${config.discordLink} 💬 Strona serwera: 🌐 ${config.webpageLink} 🌐`);
  }

  async commandDumpPlayers(player: PlayerObject) {
    let playerExt = this.Pid(player.id);
    if (this.warnIfPlayerIsNotApprovedAdmin(playerExt)) return;
    for (let p of this.getPlayersExt()) {
      this.sendMsgToPlayer(player, `${p.name} [${p.id}] auth: ${p.auth_id.substring(0, 16)} conn: ${p.conn_id}`);
    }
  }

  async commandAntiSpam(player: PlayerObject, cmds: string[]) {
    if (this.hostOnlyCommand(player, 'anti_spam')) return;
    if (cmds.length == 0) return;
    let new_state = toBoolean(cmds[0]);
    this.anti_spam.setEnabled(new_state);
    this.sendMsgToPlayer(player, `anti_spam = ${new_state}`);
    if (new_state) {
      this.getPlayers().filter(e => e.admin).forEach(player => {
        this.sendMsgToPlayer(player, `Anty Spam został włączony, mozesz wyłączyć dla niego sprawdzanie spamu: !spam_disable/sd <nick>, bez tego przy pisaniu podobnych wiadomości mógłby dostać kicka!`);
      });
    }
  }

  async commandTriggerCaptcha(player: PlayerObject, cmds: string[]) {
    if (this.hostOnlyCommand(player, 'captcha')) return;
    if (cmds.length == 0) {
      this.sendMsgToPlayer(player, "Podkomendy: gen, clear, gen_me, set [0/1]");
    }
    if (cmds[0] == "gen_me") {
      this.captcha.askCaptcha(player);
      return;
    } else if (cmds[0] == "set" && cmds.length > 1) {
      let new_state = toBoolean(cmds[1]);
      this.captcha.setEnabled(new_state);
      this.sendMsgToPlayer(player, `Stan captcha = ${new_state}`);
      return;
    }

    this.getPlayers().forEach(p => {
      if (p.id != player.id) {
        if (cmds[0] == "gen") this.captcha.askCaptcha(p);
        else if (cmds[0] == "clear") this.captcha.clearCaptcha(p);
      }
    });
  }

  async commandOnlyTrustedJoin(player: PlayerObject, cmds: string[]) {
    if (this.hostOnlyCommand(player, 'only_trusted_join')) return;
    if (cmds.length == 0) {
      this.sendMsgToPlayer(player, "wołaj z on/off");
      return;
    }
    let new_state = toBoolean(cmds[0]);
    this.allow_connecting_only_trusted = new_state;
    this.sendMsgToPlayer(player, `Tylko trusted connecting: ${new_state}`);
  }

  async commandOnlyTrustedChat(player: PlayerObject, cmds: string[]) {
    if (this.hostOnlyCommand(player, 'only_trusted_chat')) return;
    if (cmds.length == 0) {
      this.sendMsgToPlayer(player, "wołaj z on/off");
      return;
    }
    let new_state = toBoolean(cmds[0]);
    this.allow_chatting_only_trusted = new_state;
    this.sendMsgToPlayer(player, `Tylko trusted chatting: ${new_state}`);
  }

  async commandWhitelistNonTrustedNick(player: PlayerObject, cmds: string[]) {
    if (this.warnIfPlayerIsNotAdmin(player)) return;
    cmds.forEach(player_name => {
      this.whitelisted_nontrusted_player_names.add(player_name);
    });
  }

  addPlayerMuted(player: PlayerObject|PlayerData) {
    this.muted_players.add(player.id);
  }

  removePlayerMuted(player: PlayerObject|PlayerData) {
    this.muted_players.delete(player.id);
  }

  isPlayerMuted(player: PlayerObject|PlayerData) {
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

  warnIfPlayerIsNotAdminNorHost(player: PlayerObject) {
    if (this.isPlayerHost(player)) return false;
    return this.warnIfPlayerIsNotAdmin(player);
  }

  warnIfPlayerIsNotAdmin(player: PlayerObject) {
    if (!player.admin) {
      this.sendMsgToPlayer(player, "Tylko dla Admina!");
      return true;
    }
    return false;
  }

  warnIfPlayerIsNotApprovedAdmin(player: PlayerData) {
    return player.admin_level <= 0;
  }

  getPlayers() {
    return this.room.getPlayerList();
  }

  getPlayersExt(updateExt = false) {
    if (updateExt) {
      this.getPlayers().forEach(e => {
        let p = this.players_ext.get(e.id);
        if (p) p.update(e);
      });
    }
    return this.players_ext.values();
  }

  getPlayersExtList(updateExt = false): PlayerData[] {
    let playersExt = this.getPlayersExt(updateExt);
    return Array.from(playersExt);
  }

  getPlayerObjectByName(playerName: string|string[], byPlayer: PlayerObject|null, byPlayerIfNameNotSpecified = false): PlayerObject|null {
    if (!playerName.length) {
      if (byPlayerIfNameNotSpecified) return byPlayer; // command refers to caller player
      return null; // no name specified, then cannot find player
    }

    let name = Array.isArray(playerName) ? playerName.join(" ") : playerName;
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

function hb_log_to_console(player: PlayerObject | PlayerData, msg: string) {
  if (!hb_log_chat_to_console_enabled) return;
  console.debug(`[${getTimestampHMS()} ${player.name}][${player.id}] ${msg}`);
}

function hb_log(msg: string, timestamp: boolean = false) {
  if (!hb_debug_enabled) return;
  let txt = msg;
  if (timestamp) txt = `[${getTimestampHMS()}] ${txt}`;
  console.debug(txt);
}

let hb_room: HaxballRoom | null = null;
let chat_logger: ChatLogger | null = null;
let db_handler: DBHandler | null = null;
let game_state: GameState | null = null;
let hb_log_chat_to_console_enabled = true;
let hb_debug_enabled = true;

export const hb_room_main = (room: RoomObject, roomConfig: config.RoomServerConfig): HaxballRoom => {
  db_handler = new DBHandler(roomConfig.playersDbFile, roomConfig.otherDbFile);
  chat_logger = new ChatLogger(roomConfig.chatLogDbFile);
  game_state = new GameState(db_handler, chat_logger);
  hb_room = new HaxballRoom(room, roomConfig, game_state);
  return hb_room;
};

// let some_ban = setInterval(() => {
//     room.getPlayers().forEach(player => {
//         // ten cały montuisy debil
//         if (room.Pid(player.id).conn_id == '38332E32382E3235322E3833') {
//             room.room.kickPlayer(player.id, 'Rock n\' Roll!');
//         }
//     }) 
// }, 1000);

// Sefinek z tego:
// Player joined the room, auth: 7qFPZNXfNVFhHZKWUwnJc8FaB0NrHhDlaiIQw18eKIg conn: 3133382E3139392E33342E313334
// 2025-02-18T18:19:39.786Z
// IP: 138.199.34.134

