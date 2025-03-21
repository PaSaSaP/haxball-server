import { BuyCoffee } from "./buy_coffee";
import { HaxballRoom } from "./hb_room";
import all_maps from "./maps";
import { PlayerData, PlayerTopRatingDataShort, TransactionByPlayerInfo } from "./structs";
import { sleep, getTimestampHM, toBoolean } from "./utils";
import { generateVerificationLink } from "./verification";
import { Colors } from "./colors";
import * as config from './config';
import { hb_log } from "./log";
import e from "express";

class Commander {
  hb_room: HaxballRoom;
  commands: Record<string, Function>;

  constructor(hb_room: HaxballRoom) {
    this.hb_room = hb_room;

    this.commands = {
      send: this.commandSendMessage,
      w: this.commandSendMessage,
      pm: this.commandSendMessage,
      pw: this.commandSendMessage,
      pressure: this.commandPressure,
      presja: this.commandPressure,
      p: this.commandPauseRequested,
      wyb: this.commandChoosingPlayers,
      ch: this.commandChoosingPlayers,
      choose: this.commandChoosingPlayers,
      "wyb-": this.commandUnchoosingPlayers,
      "ch-": this.commandUnchoosingPlayers,
      "choose-": this.commandUnchoosingPlayers,
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
      ping: (player: PlayerObject) => this.hb_room.sendMsgToPlayer(player, "Pong!"),
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

      tkick_5m: this.commandTimeKickPlayer5m,
      tkick5m: this.commandTimeKickPlayer5m,
      tkick: this.commandTimeKickPlayer1h,
      tkick_1h: this.commandTimeKickPlayer1h,
      tkick1h: this.commandTimeKickPlayer1h,
      tkick_1d: this.commandTimeKickPlayer1d,
      tkick1d: this.commandTimeKickPlayer1d,
      tkick_24h: this.commandTimeKickPlayer1d,
      tkick24h: this.commandTimeKickPlayer1d,
      "tkick-": this.commandTimeKickPlayerReset,
      tmute_5m: this.commandTimeMutePlayer5m,
      tmute5m: this.commandTimeMutePlayer5m,
      tm: this.commandTimeMutePlayer1h,
      tmute: this.commandTimeMutePlayer1h,
      tmute_1h: this.commandTimeMutePlayer1h,
      tmute1h: this.commandTimeMutePlayer1h,
      tmute_1d: this.commandTimeMutePlayer1d,
      tmute1d: this.commandTimeMutePlayer1d,
      tmute_24h: this.commandTimeMutePlayer1d,
      tmute24h: this.commandTimeMutePlayer1d,
      "tmute-": this.commandTimeMutePlayerReset,

      nkick_5m: this.commandTimeKickNetwork5m,
      nkick5m: this.commandTimeKickNetwork5m,
      nkick: this.commandTimeKickNetwork1h,
      nkick_1h: this.commandTimeKickNetwork1h,
      nkick1h: this.commandTimeKickNetwork1h,
      nkick_1d: this.commandTimeKickNetwork1d,
      nkick1d: this.commandTimeKickNetwork1d,
      nkick_24h: this.commandTimeKickNetwork1d,
      nkick24h: this.commandTimeKickNetwork1d,
      "nkick-": this.commandTimeKickNetworkReset,
      nmute_5m: this.commandTimeMuteNetwork5m,
      nmute5m: this.commandTimeMuteNetwork5m,
      nm: this.commandTimeMuteNetwork1h,
      nmute: this.commandTimeMuteNetwork1h,
      nmute_1h: this.commandTimeMuteNetwork1h,
      nmute1h: this.commandTimeMuteNetwork1h,
      nmute_1d: this.commandTimeMuteNetwork1d,
      nmute1d: this.commandTimeMuteNetwork1d,
      nmute_24h: this.commandTimeMuteNetwork1d,
      nmute24h: this.commandTimeMuteNetwork1d,
      "nmute-": this.commandTimeMuteNetworkReset,

      auto_mode: this.commandAutoMode,
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

      votekick: this.commandVoteKick,
      votemute: this.commandVoteMute,
      votebot: this.commandVoteBotKick,
      votev4: this.commandVoteV4,
      "4": this.commandVoteV4,
      votereset: this.commandVoteReset,
      yes: this.commandVoteYes,
      tak: this.commandVoteYes,
      no: this.commandVoteNo,
      nie: this.commandVoteNo,
      report: this.commandReport,
      me: this.commandMe,
      rank: this.commandStat,
      stat: this.commandStat,
      stats: this.commandStat,
      top: this.commandTop10Daily,
      top10: this.commandTop10Daily,
      ttop: this.commandTop10All,
      ttop10: this.commandTop10All,
      wtop: this.commandTop10Weekly,
      wtop10: this.commandTop10Weekly,
      topext: this.commandTop10Ext,
      update_top10: this.commandUpdateTop10,
      auth: this.commandPrintAuth,
      thumb: this.commandThumbVote,
      thumbup: this.commandThumbVoteUp,
      thumb_up: this.commandThumbVoteUp,
      thumbdown: this.commandThumbVoteDown,
      thumb_down: this.commandThumbVoteDown,
      thumbremove: this.commandThumbVoteRemove,
      thumb_remove: this.commandThumbVoteRemove,
      cieszynki: this.commandPrintAvailableRejoices,
      cieszynka: this.commandRejoice,
      kup: this.commandBuyRejoice,
      buy: this.commandBuyRejoice,
      sklep: this.commandBuyRejoice,
      shop: this.commandBuyRejoice,
      vip: this.commandVip,
      trust: this.commandTrust,
      verify: this.commandVerify,
      t: this.commandTrust,
      tt: this.commandAutoTrust,
      ttt: this.commandShowTrust,

      check_transaction: this.commandCheckPlayerTransaction,
      check_tr: this.commandCheckPlayerTransaction,
      update_rejoice: this.commandUpdateRejoiceForPlayer,
      set_rejoice: this.commandSetRejoiceForPlayer,
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
      auto_debug: this.commandAutoDebug,
      set_delay: this.commandSetDelayOnJoin,
      set_welcome: this.commandSetWelcomeMsg,
      anno: this.commandSendAnnoToAllPlayers,

      pasek: this.commandPasek,
      kebab: this.commandBuyCoffeeLink,
      coffee: this.commandBuyCoffeeLink,
      cofe: this.commandBuyCoffeeLink,
      coffe: this.commandBuyCoffeeLink,
      kawa: this.commandBuyCoffeeLink,
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

      not_bots: this.commandWhoIsNotBot,
      bots: this.commandCheckBots,
      bot: this.commandMarkBot,
      "bot-": this.commandUnmarkBot,
      kick_bots: this.commandKickBots,
      tkick_bots: this.commandTKickBots,
      nkick_bots: this.commandNKickBots,
      ban_reload: this.commandBanReload,
      bot_info: this.commandPrintShortInfo,
      botradius: this.commandBotSetRadius,
      botstop: this.commandSwitchBotStoppingFlag,

      god: this.commandGodTest,

      h: this.commandHelp,
      "?": this.commandHelp,
      help: this.commandHelp,
      pomoc: this.commandHelp,
      komendy: this.commandHelp
    };
  }

  r() {
    return this.hb_room.room;
  }

  P(player: PlayerObject): PlayerData {
    return this.hb_room.P(player);
  }

  Pid(playerId: number): PlayerData {
    return this.hb_room.Pid(playerId);
  }

  sendMsgToPlayer(player: PlayerObject | PlayerData, message: string, color: number | undefined = undefined, style: string | undefined = undefined, sound: number = 0) {
    this.hb_room.sendMsgToPlayer(player, message, color, style, sound);
  }

  sendMsgToAll(message: string, color: number | undefined = undefined, style: string | undefined = undefined, sound: number = 0) {
    this.hb_room.sendMsgToAll(message, color, style, sound);
  }

  getPlayerDataByName(playerName: string | string[], byPlayer: PlayerObject | null, byPlayerIfNameNotSpecified = false, allPlayers = false): PlayerData | null {
    return this.hb_room.getPlayerDataByName(playerName, byPlayer, byPlayerIfNameNotSpecified, allPlayers);
  }

  getPlayerObjectByName(playerName: string | string[], byPlayer: PlayerObject | null, byPlayerIfNameNotSpecified = false): PlayerObject | null {
    return this.hb_room.getPlayerObjectByName(playerName, byPlayer, byPlayerIfNameNotSpecified);
  }

  getPlayers() {
    return this.hb_room.getPlayers();
  }

  getPlayersExt(updateExt = false) {
    return this.hb_room.getPlayersExt(updateExt);
  }

  getPlayersExtList(updateExt = false): PlayerData[] {
    return this.hb_room.getPlayersExtList(updateExt);
  }

  // commands below
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

  async commandPressure(player: PlayerObject) {
    this.sendMsgToPlayer(player, `Pressure: Red ${this.hb_room.pressure_right.toFixed(2)}s, Blue ${this.hb_room.pressure_left.toFixed(2)}s`);
  }

  async commandChoosingPlayers(player: PlayerObject, cmds: string[]) {
    let playerExt = this.Pid(player.id);
    if (!cmds.length) {
      this.sendMsgToPlayer(player, "W trakcie meczu wybierz sobie graczy! Dostaniesz dostępnych! np: !wyb @player1 @player2... !wyb #5 #8 #13 #21...", Colors.Help, 'italic');
      this.sendMsgToPlayer(player, "Nie będzie przerwy na wybieranie. Lista przetrwa do restartu, by ją wyczyścić, uzyj !wyb-", Colors.Help, 'italic');
      if (playerExt.chosen_player_names.length) this.sendMsgToPlayer(player, `Twoja obecna lista: ${playerExt.chosen_player_names.join(', ')}`, Colors.GameState, 'italic');
      return;
    }
    cmds.reverse().forEach(playerName => {
      let e = this.getPlayerObjectByName(playerName, player);
      if (e) {
        let p = this.Pid(e.id);
        let newName = p.name_normalized;
        const prevIdx = playerExt.chosen_player_names.indexOf(newName);
        if (prevIdx !== -1) {
          playerExt.chosen_player_names.splice(prevIdx, 1);
        }
        playerExt.chosen_player_names.unshift(newName); // add always at the beginning, given player list is in reverse order so it it as expected
      }
    });
    this.sendMsgToPlayer(player, `Twoja obecna lista: ${playerExt.chosen_player_names.join(', ')}`, Colors.GameState, 'italic');
  }

  async commandUnchoosingPlayers(player: PlayerObject, cmds: string[]) {
    let playerExt = this.Pid(player.id);
    if (!cmds.length) {
      this.sendMsgToPlayer(player, "Wyczyściłeś listę!", Colors.GameState, 'italic');
      playerExt.chosen_player_names = [];
    } else {
      const cmdsSet = new Set(); // O(1), list.includes has O(n)
      // TODO below to function?
      cmds.forEach(playerName => {
        let e = this.getPlayerObjectByName(playerName, player);
        if (e) {
          let p = this.Pid(e.id);
          cmdsSet.add(p.name_normalized);
        }
      })
      playerExt.chosen_player_names = playerExt.chosen_player_names.filter(e => !cmdsSet.has(e));
      this.sendMsgToPlayer(player, `Twoja obecna lista: ${playerExt.chosen_player_names.join(', ')}`, Colors.GameState, 'italic');
    }
  }

  async commandPauseRequested(player: PlayerObject) {
    if (!player.team) return;
    if (this.hb_room.auto_mode) this.hb_room.auto_bot.handlePauseRequest(this.Pid(player.id));
  }

  async commandRestartMatch(player: PlayerObject) {
    if (this.hb_room.auto_mode) {
      this.hb_room.auto_bot.handleRestartRequested(this.Pid(player.id));
      return;
    }
    if (this.warnIfPlayerIsNotAdmin(player)) return;
    this.hb_room.updateWinnerTeamBeforeGameStop();
    this.r().stopGame();
    await sleep(125);
    this.r().startGame();
    this.sendMsgToAll(`(!r) ${player.name} zrobił restart meczu, limit: ${this.hb_room.limit} (!limit), zmiana mapy: !m 2, !m 3, !m 4`, Colors.GameState);
  }

  async commandRandomAndRestartMatch(player: PlayerObject) {
    if (this.warnIfPlayerIsNotAdmin(player)) return;
    this.hb_room.updateWinnerTeamBeforeGameStop();
    this.hb_room.makeRandomAndRestartMatch();
    this.sendMsgToAll(`(!rr) ${player.name} zrobił losowanie drużyn${this.hb_room.getPrevWinnerLogTxt()}, limit: ${this.hb_room.limit} (!limit), zmiana mapy: !m 2, !m 3, !m 4`, Colors.GameState);
  }

  async commandWinStayNextMatch(player: PlayerObject) {
    if (this.warnIfPlayerIsNotAdmin(player)) return;
    this.hb_room.updateWinnerTeamBeforeGameStop();
    if (!this.hb_room.last_winner_team) this.hb_room.makeRandomAndRestartMatch();
    else this.hb_room.makeWinStayAndRestartMatch();
    this.sendMsgToAll(`(!ws) ${player.name} zostawił zwycięską druzynę${this.hb_room.getPrevWinnerLogTxt()}, limit: ${this.hb_room.limit} (!limit), zmiana mapy: !m 2, !m 3, !m 4`, Colors.GameState);
  }

  async commandStartMatch(player: PlayerObject) {
    if (this.warnIfPlayerIsNotAdmin(player)) return;
    this.r().startGame();
  }

  async commandStopMatch(player: PlayerObject) {
    if (this.warnIfPlayerIsNotAdmin(player)) return;
    this.hb_room.updateWinnerTeamBeforeGameStop();
    this.r().stopGame();
  }

  async commandStartOrStopMatch(player: PlayerObject) {
    if (this.warnIfPlayerIsNotAdmin(player)) return;
    let d = this.r().getScores();
    if (d) {
      this.hb_room.updateWinnerTeamBeforeGameStop();
      this.r().stopGame();
    } else {
      this.r().startGame();
    }
  }

  async commandSwapTeams(player: PlayerObject) {
    if (this.warnIfPlayerIsNotAdmin(player)) return;
    if (this.hb_room.isGameInProgress()) {
      this.sendMsgToPlayer(player, 'Nie mozna zmieniać zespołów podczas meczu!')
      return;
    }
    this.hb_room.swapTeams();
  }

  async commandSwapAndRestart(player: PlayerObject) {
    if (this.warnIfPlayerIsNotAdmin(player)) return;
    this.hb_room.updateWinnerTeamBeforeGameStop();
    this.r().stopGame();
    await sleep(125);
    this.hb_room.swapTeams();
    await sleep(125);
    this.r().startGame();
    this.sendMsgToAll(`(!sr) ${player.name} zmienił strony druzyn, limit: ${this.hb_room.limit} (!limit), zmiana mapy: !m 2, !m 3, !m 4`, Colors.GameState);
  }

  async commandAddPlayersToTeam(player: PlayerObject) {
    if (this.warnIfPlayerIsNotAdmin(player)) return;
    let players = this.getPlayersExtList(true);
    this.hb_room.shuffleAllPlayers(players);
    let red = this.hb_room.limit;
    let blue = this.hb_room.limit;

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

      this.r().setPlayerTeam(player_ext.id, team);
      any_added = true;
    }
    if (any_added) this.sendMsgToAll(`(!a) ${player.name} uzupełnił druzyny`, Colors.GameState);
  }

  async commandHelp(player: PlayerObject) {
    this.sendMsgToPlayer(player, "Komendy: !wyb !p !pm/w !bb !ping !afk !back !afks !stat !top !ttop !wtop !pasek !discord !kebab !cieszynka !sklep", Colors.Help);
    let playerExt = this.Pid(player.id);
    if (playerExt.admin_level) {
      this.sendMsgToPlayer(player, "Dla Admina: !mute !unmute !r !s !swap !sr !rr !ws !a !map/m", Colors.Help);
      this.sendMsgToPlayer(player, "Dla Admina: !kick (auth) !tkick_5m/1h/1d, !tmute_5m/1h/1d (network) !nkick_5m/1h/1d !nmute_5m/1h/1d", Colors.Help);
    }
    if (playerExt.trust_level > 0) {
      this.sendMsgToPlayer(player, ": !thumb !thumb_up !thump_down !thumb_remove !report !verify", Colors.Help);
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
      if (!this.hb_room.isGameInProgress()) {
        this.hb_room.setMapByName(map_name);
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
    this.hb_room.addPlayerMuted(cmdPlayer);
    this.sendMsgToPlayer(cmdPlayer, "Zostałeś wyciszony!", Colors.Warning, undefined, 2);
    this.sendMsgToPlayer(player, `Muted: ${cmdPlayer.name}`);
  }

  async commandMuted(player: PlayerObject) {
    let muted: string[] = [];
    for (let p of this.getPlayersExt()) {
      if (this.hb_room.isPlayerMuted(p)) muted.push(p.name);
    }
    this.sendMsgToPlayer(player, `Muted: ${muted.join(" ")}`);
  }

  async commandMuteAll(player: PlayerObject) {
    if (this.warnIfPlayerIsNotAdminNorHost(player)) return;
    for (let p of this.getPlayersExt()) {
      this.hb_room.addPlayerMuted(p);
    }
    this.sendMsgToPlayer(player, "Muted all Players", Colors.GameState);
  }

  async commandUnmute(player: PlayerObject, cmds: string[]) {
    if (this.warnIfPlayerIsNotAdminNorHost(player)) return;
    let cmdPlayer = this.getPlayerObjectByName(cmds, player);
    if (!cmdPlayer) return;
    if (player.id == cmdPlayer.id) return;
    if (!this.hb_room.isPlayerMuted(cmdPlayer)) return;
    this.hb_room.removePlayerMuted(cmdPlayer);
    this.hb_room.anti_spam.removePlayer(cmdPlayer);
    this.sendMsgToPlayer(cmdPlayer, "Ju mozesz pisać!", Colors.Warning, undefined, 2);
    this.sendMsgToPlayer(player, `Unmuted: ${cmdPlayer.name}`);
  }

  async commandUnmuteAll(player: PlayerObject) {
    if (this.warnIfPlayerIsNotAdminNorHost(player)) return;
    this.hb_room.muted_players.clear();
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
    player_ext.afk_switch_time = Date.now();
    player_ext.afk = true;
    this.r().setPlayerAvatar(player_ext.id, '💤');
    this.sendMsgToAll(`${player_ext.name} poszedł AFK (!afk !back !jj)`, Colors.Afk);
    if (player_ext.team != 0) {
      this.r().setPlayerTeam(player_ext.id, 0);
    }
    if (player_ext.admin) this.hb_room.updateAdmins(null);
  }

  async commandClearAfk(player: PlayerObject) {
    this.commandClearAfkExt(this.Pid(player.id));
  }

  commandClearAfkExt(player_ext: PlayerData) {
    if (player_ext.afk) {
      const now = Date.now();
      if (now - player_ext.afk_switch_time < 15_000) {
        this.sendMsgToPlayer(player_ext, "Nie da się tak szybko wstać z krzesła i usiąść!", Colors.Afk);
        return;
      }
      player_ext.afk = false;
      this.r().setPlayerAvatar(player_ext.id, null);
      this.sendMsgToAll(`${player_ext.name} wrócił z AFK (!afk !back !jj)`, Colors.Afk);
      player_ext.activity.updateGame();
      if (this.hb_room.auto_mode) this.hb_room.auto_bot.handlePlayerBackFromAfk(player_ext);
    }
    this.hb_room.updateAdmins(null);
  }

  async commandPrintAfkList(player: PlayerObject) {
    var log_str = "AFK list: "
    for (let p of this.getPlayersExt()) {
      if (p.afk || p.afk_maybe) log_str += `${p.name}[${p.id}] `;
    }
    this.sendMsgToPlayer(player, log_str);
  }

  async commandSetAfkOther(player: PlayerObject, cmds: string[]) {
    if (this.warnIfPlayerIsNotApprovedAdmin(player)) return;
    let cmdPlayer = this.getPlayerObjectByName(cmds, player);
    if (!cmdPlayer) return;
    let cmdPlayerExt = this.Pid(cmdPlayer.id);
    if (!cmdPlayerExt.afk) this.commandSetAfkExt(cmdPlayerExt);
  }

  async commandClearAfkOther(player: PlayerObject, cmds: string[]) {
    if (this.warnIfPlayerIsNotApprovedAdmin(player)) return;
    let cmdPlayer = this.getPlayerObjectByName(cmds, player);
    if (!cmdPlayer) return;
    let cmdPlayerExt = this.Pid(cmdPlayer.id);
    this.commandClearAfkExt(cmdPlayerExt);
  }

  async commandByeBye(player: PlayerObject) {
    this.r().kickPlayer(player.id, "Bye bye!", false);
  }

  async commandKick(player: PlayerObject, cmds: string[]) {
    if (this.warnIfPlayerIsNotApprovedAdmin(player)) return;
    let cmdPlayer = this.getPlayerObjectByName(cmds, player);
    if (!cmdPlayer) return;
    if (cmdPlayer.id == player.id) return;
    this.r().kickPlayer(cmdPlayer.id, "", false);
  }

  async commandKickAllExceptVerified(player: PlayerObject) {
    if (this.warnIfPlayerIsNotApprovedAdmin(player)) return;
    for (let p of this.getPlayersExt()) {
      if (player.id != p.id && !p.trust_level) this.r().kickPlayer(p.id, "", false);
    }
  }

  async commandKickAllRed(player: PlayerObject) {
    if (this.warnIfPlayerIsNotApprovedAdmin(player)) return;
    this.hb_room.kickAllTeamExceptTrusted(player, 1);
  }

  async commandKickAllBlue(player: PlayerObject) {
    if (this.warnIfPlayerIsNotApprovedAdmin(player)) return;
    this.hb_room.kickAllTeamExceptTrusted(player, 2);
  }

  async commandKickAllSpec(player: PlayerObject) {
    if (this.warnIfPlayerIsNotApprovedAdmin(player)) return;
    this.hb_room.kickAllTeamExceptTrusted(player, 0);
  }

  commandTimeKickPlayer5m(player: PlayerObject, cmds: string[]) {
    this.execCommandTimeKickPlayer(player, cmds, 5 * 60, true);
  }
  commandTimeKickPlayer1h(player: PlayerObject, cmds: string[]) {
    this.execCommandTimeKickPlayer(player, cmds, 60 * 60, true);
  }
  commandTimeKickPlayer1d(player: PlayerObject, cmds: string[]) {
    this.execCommandTimeKickPlayer(player, cmds, 24 * 60 * 60, true);
  }
  commandTimeKickPlayerReset(player: PlayerObject, cmds: string[]) {
    this.execCommandTimeKickPlayer(player, cmds, -1, false);
  }
  async execCommandTimeKickPlayer(player: PlayerObject, cmds: string[], seconds: number, kick: boolean) {
    if (this.warnIfPlayerIsNotApprovedAdmin(player)) return;
    let cmdPlayer = this.getPlayerDataByName(cmds, player);
    if (!cmdPlayer) return;
    if (player.id == cmdPlayer.id) return;
    this.hb_room.players_game_state_manager.setPlayerTimeKicked(cmdPlayer, seconds, kick);
    if (seconds < 0) this.hb_room.sendMsgToPlayer(player, `Wyczyściłeś Player_kick dla ${cmdPlayer.name}`);
  }

  commandTimeMutePlayer5m(player: PlayerObject, cmds: string[]) {
    return this.execCommandTimeMutePlayer(player, cmds, 5 * 60);
  }
  commandTimeMutePlayer1h(player: PlayerObject, cmds: string[]) {
    return this.execCommandTimeMutePlayer(player, cmds, 60 * 60);
  }
  commandTimeMutePlayer1d(player: PlayerObject, cmds: string[]) {
    return this.execCommandTimeMutePlayer(player, cmds, 24 * 60 * 60);
  }
  commandTimeMutePlayerReset(player: PlayerObject, cmds: string[]) {
    return this.execCommandTimeMutePlayer(player, cmds, -1);
  }

  async execCommandTimeMutePlayer(player: PlayerObject, cmds: string[], seconds: number) {
    if (this.warnIfPlayerIsNotApprovedAdmin(player)) return;
    let cmdPlayer = this.getPlayerDataByName(cmds, player);
    if (!cmdPlayer) return;
    if (player.id == cmdPlayer.id) return;
    this.hb_room.players_game_state_manager.setPlayerTimeMuted(cmdPlayer, seconds);
    this.hb_room.sendMsgToPlayer(player, `Ustawiłeś Player_mute dla ${cmdPlayer.name} na ${seconds} sekund`);
  }

  commandTimeKickNetwork5m(player: PlayerObject, cmds: string[]) {
    this.execCommandTimeKickNetwork(player, cmds, 5 * 60, true);
  }
  commandTimeKickNetwork1h(player: PlayerObject, cmds: string[]) {
    this.execCommandTimeKickNetwork(player, cmds, 60 * 60, true);
  }
  commandTimeKickNetwork1d(player: PlayerObject, cmds: string[]) {
    this.execCommandTimeKickNetwork(player, cmds, 24 * 60 * 60, true);
  }
  commandTimeKickNetworkReset(player: PlayerObject, cmds: string[]) {
    this.execCommandTimeKickNetwork(player, cmds, -1, false);
  }

  async execCommandTimeKickNetwork(player: PlayerObject, cmds: string[], seconds: number, kick: boolean) {
    if (this.warnIfPlayerIsNotApprovedAdmin(player)) return;
    let cmdPlayer = this.getPlayerDataByName(cmds, player);
    if (!cmdPlayer) return;
    if (player.id == cmdPlayer.id) return;
    this.hb_room.players_game_state_manager.setNetworkTimeKicked(cmdPlayer, seconds, kick);
    if (seconds < 0) this.hb_room.sendMsgToPlayer(player, `Wyczyściłeś Network_kick dla ${cmdPlayer.name}`);
  }

  commandTimeMuteNetwork5m(player: PlayerObject, cmds: string[]) {
    return this.execCommandTimeMuteNetwork(player, cmds, 5 * 60);
  }
  commandTimeMuteNetwork1h(player: PlayerObject, cmds: string[]) {
    return this.execCommandTimeMuteNetwork(player, cmds, 60 * 60);
  }
  commandTimeMuteNetwork1d(player: PlayerObject, cmds: string[]) {
    return this.execCommandTimeMuteNetwork(player, cmds, 24 * 60 * 60);
  }
  commandTimeMuteNetworkReset(player: PlayerObject, cmds: string[]) {
    this.execCommandTimeMuteNetwork(player, cmds, -1);
  }

  async execCommandTimeMuteNetwork(player: PlayerObject, cmds: string[], seconds: number) {
    if (this.warnIfPlayerIsNotApprovedAdmin(player)) return;
    let cmdPlayer = this.getPlayerDataByName(cmds, player);
    if (!cmdPlayer) return;
    if (player.id == cmdPlayer.id) return;
    this.hb_room.players_game_state_manager.setNetworkTimeMuted(cmdPlayer, seconds);
    this.hb_room.sendMsgToPlayer(player, `Ustawiłeś Network_mute dla ${cmdPlayer.name} na ${seconds} sekund`);
  }

  async commandAutoMode(player: PlayerObject, values: string[]) {
    if (this.warnIfPlayerIsNotHost(player, "auto_mode")) return;
    if (values.length == 0) return;
    const arg = values[0].toLowerCase();
    if (arg == "on") {
      for (let p of this.getPlayersExt()) {
        if (p.admin && !p.admin_level) this.hb_room.takeAdminFrom(p);
      }
      this.hb_room.auto_mode = true;
      this.hb_room.auto_bot.resetAndStart();
      this.sendMsgToAll("Włączono tryb automatyczny!")
    } else if (arg == "off") {
      this.hb_room.auto_mode = false;
      this.hb_room.auto_bot.reset();
      this.sendMsgToAll("Wyłączono tryb automatyczny!")
    } else {
      this.sendMsgToPlayer(player, "Poprawne wartosci: [on, off]");
    }
  }

  async commandLimit(player: PlayerObject, values: string[]) {
    if (this.warnIfPlayerIsNotHost(player, 'limit')) return;
    if (values.length == 0) return;
    try {
      const limit = parseInt(values[0], 10);
      if (limit < 1 || limit > 6) {
        this.sendMsgToPlayer(player, "Poprawne wartosci to zakres <1, 6>")
      } else {
        this.hb_room.limit = limit;
        this.sendMsgToAll(`Zmieniono limit max graczy w druzynie na ${limit}`);
      }
    } catch (e) { }
  }

  async commandEmoji(player: PlayerObject) {
    if (this.warnIfPlayerIsNotAdmin(player)) return;
    this.hb_room.emoji.turnOnOff();
    this.sendMsgToPlayer(player, "Losowe Emoji, by włączyć/wyłączyć - odpal jeszcze raz komendę")
  }

  async commandClaimAdmin(player: PlayerObject) {
    if (this.hb_room.auto_mode) return; // no admin in auto mode
    let playerExt = this.Pid(player.id);
    if (playerExt.trust_level == 0) return;
    if (playerExt.admin_level > 0) {
      this.hb_room.giveAdminTo(playerExt); // approved admin
      return;
    }
  }

  async commandSelectOneAdmin(player: PlayerObject) {
    if (this.hb_room.auto_mode) return; // no admin in auto mode
    let playerExt = this.Pid(player.id);
    if (playerExt.trust_level == 0) return;
    let currentAdmins: PlayerData[] = [];
    let bestAdmin: PlayerData | null = null;
    if (playerExt.admin_level > 0) {
      this.hb_room.giveAdminTo(playerExt); // approved admin
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
      if (e.id == chosenAdmin.id && !chosenAdmin.admin) this.hb_room.giveAdminTo(chosenAdmin);
      if (e.id != chosenAdmin.id) this.hb_room.takeAdminFrom(e);
    });
    this.sendMsgToAll(`${chosenAdmin.name} jako gracz z najwyzszym zaufaniem i najdłuzej afczący zostaje wybrany na jedynego admina by zarządzać sytuacją kryzysową!`, 0xEE3333, 'bold', 2);
  }

  async commandAdminStats(player: PlayerObject, cmds: string[]) {
    if (this.warnIfPlayerIsNotAdminNorHost(player)) return;
    let cmdPlayer = this.getPlayerDataByName(cmds, player, true);
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
    this.hb_room.movePlayerBetweenTeams(0, 1);
  }

  async commandSpecMoveBlue(player: PlayerObject) {
    if (this.warnIfPlayerIsNotAdmin(player)) return;
    this.hb_room.movePlayerBetweenTeams(0, 2);
  }

  async commandRedMoveSpec(player: PlayerObject) {
    if (this.warnIfPlayerIsNotAdmin(player)) return;
    this.hb_room.movePlayerBetweenTeams(1, 0);
  }

  async commandBlueMoveSpec(player: PlayerObject) {
    if (this.warnIfPlayerIsNotAdmin(player)) return;
    this.hb_room.movePlayerBetweenTeams(2, 0);
  }

  async commandSefin(player: PlayerObject) {
    if (!this.hb_room.isPlayerHost(player)) {
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
    this.hb_room.players_ext_all.forEach((p, player_id) => {
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
        this.hb_room.anti_spam.setSpamDisabled(cmdPlayer);
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
    let cmdPlayerExt = this.getPlayerDataByName(cmds, player);
    if (!cmdPlayerExt) return;
    let lastPlayerNames = this.hb_room.game_state.getPlayerNames(cmdPlayerExt.auth_id);
    this.sendMsgToPlayer(player, `Ostatnie 5 nazw: ${(await lastPlayerNames).join(', ')}`);
  }

  async commandVoteKick(player: PlayerObject, cmds: string[]) {
    if (!cmds.length) return this.commandVoteYes(player, cmds); // no param means vote yes
    let cmdPlayer = this.getPlayerObjectByName(cmds, player);
    if (!cmdPlayer || cmdPlayer.id == player.id) return;
    let cmdPlayerExt = this.Pid(cmdPlayer.id);
    let byPlayerExt = this.Pid(player.id);
    this.hb_room.auto_bot.autoVoter.requestVoteKick(cmdPlayerExt, byPlayerExt);
  }

  async commandVoteMute(player: PlayerObject, cmds: string[]) {
    if (!cmds.length) return this.commandVoteYes(player, cmds); // no param means vote yes
    let cmdPlayer = this.getPlayerObjectByName(cmds, player);
    if (!cmdPlayer || cmdPlayer.id == player.id) return;
    let cmdPlayerExt = this.Pid(cmdPlayer.id);
    let byPlayerExt = this.Pid(player.id);
    this.hb_room.auto_bot.autoVoter.requestVoteMute(cmdPlayerExt, byPlayerExt);
  }

  async commandVoteBotKick(player: PlayerObject, cmds: string[]) {
    if (!cmds.length) return this.commandVoteYes(player, cmds); // no param means vote yes
    let cmdPlayer = this.getPlayerObjectByName(cmds, player);
    if (!cmdPlayer || cmdPlayer.id == player.id) return;
    let cmdPlayerExt = this.Pid(cmdPlayer.id);
    let byPlayerExt = this.Pid(player.id);
    this.hb_room.auto_bot.autoVoter.requestVoteBotKick(cmdPlayerExt, byPlayerExt);
  }

  async commandVoteV4(player: PlayerObject, cmds: string[]) {
    let byPlayerExt = this.Pid(player.id);
    if (byPlayerExt.afk || byPlayerExt.afk_maybe) {
      this.sendMsgToPlayer(byPlayerExt, "Jesteś AFK, najpierw wyjdź z AFKa!", Colors.White);
      return;
    }
    this.hb_room.auto_bot.autoVoter.requestVote4(null, byPlayerExt);
  }

  async commandVoteReset(player: PlayerObject, cmds: string[]) {
    let playerExt = this.Pid(player.id);
    if (this.warnIfPlayerIsNotApprovedAdmin(playerExt)) return;
    this.hb_room.auto_bot.autoVoter.reset();
    this.sendMsgToPlayer(player, 'Głosowanie zresetowane');
  }

  async commandVoteYes(player: PlayerObject, cmds: string[]) {
    let byPlayerExt = this.Pid(player.id);
    this.hb_room.auto_bot.autoVoter.handleYes(byPlayerExt);
  }

  async commandVoteNo(player: PlayerObject, cmds: string[]) {
    let byPlayerExt = this.Pid(player.id);
    this.hb_room.auto_bot.autoVoter.handleNo(byPlayerExt);
  }

  async commandReport(player: PlayerObject, cmds: string[]) {
    let playerExt = this.Pid(player.id);
    if (playerExt.trust_level == 0) return;
    let report = cmds.join(" ").trim();
    if (!report) return;
    this.hb_room.game_state.addReport(playerExt.name, playerExt.auth_id, report);
    this.sendMsgToPlayer(player, 'Twoje zazalenie zostanie rozpatrzone oraz zignorowane juz wkrótce!');
  }

  async commandMe(player: PlayerObject, cmds: string[]) {
    let cmdPlayerExt = this.getPlayerDataByName(cmds, player, true);
    if (!cmdPlayerExt) return;
    let playerExt = this.Pid(player.id);
    let adminStr = playerExt.admin_level ? ` a:${cmdPlayerExt.admin_level}` : '';
    let stat = cmdPlayerExt.stat;
    let shameStr = playerExt.admin_level ? ` A:${stat.counterAfk},L:${stat.counterLeftServer},V:${stat.counterVoteKicked}` : '';
    let afkStr = playerExt.admin_level ? ` AFK:${getTimestampHM(playerExt.afk_switch_time)}` : '';
    let dateStr = getTimestampHM(cmdPlayerExt.join_time);
    let penaltyStr = playerExt.penalty_counter > 0 ? ` P:${playerExt.penalty_counter}` : '';
    this.sendMsgToPlayer(player, `${cmdPlayerExt.name} t:${cmdPlayerExt.trust_level}${adminStr}${shameStr}${penaltyStr} od:${dateStr}${afkStr}`);
  }

  async commandStat(player: PlayerObject, cmds: string[]) {
    let cmdPlayerExt = this.getPlayerDataByName(cmds, player, true);
    if (!cmdPlayerExt) return;
    let stat = cmdPlayerExt.stat;
    let rank = this.hb_room.global_rank_by_auth.get(cmdPlayerExt.auth_id) ?? 0;
    let rating = Math.round(stat.glickoPlayer!.getRating());
    let rd = Math.round(stat.glickoPlayer!.getRd());
    let playtimeMin = Math.floor(stat.playtime / 60);
    let winRate = stat.fullGames > 0 ? ((stat.fullWins / stat.fullGames) * 100).toFixed(1) : 0;
    let msg = `${cmdPlayerExt.name}➡️ 🔝${rank} ⭐${rating} ±${rd} ⚽${stat.goals} 🤝${stat.assists} ❌${stat.ownGoals} 🧤${stat.cleanSheets} ⏱️${playtimeMin}m`
      + ` 🎮Pełne: ${stat.fullWins}/${stat.fullGames} 🔲Wszystkie: ${stat.wins}/${stat.games} (WR: ${winRate}%)`;
    if (player.id === cmdPlayerExt.id && cmdPlayerExt.user_id !== -1)
      this.sendMsgToPlayer(player, `🎮 Hej! Sprawdź swój profil na stronie: ${config.webpageLink}/i/${cmdPlayerExt.user_id} 📊`, Colors.Stats, 'small-italic');
    this.sendMsgToPlayer(player, msg, Colors.Stats);
  }

  commandTop10Daily(player: PlayerObject, cmds: string[]) {
    return this.execCommandTop10(player, cmds, 'daily');
  }
  commandTop10Weekly(player: PlayerObject, cmds: string[]) {
    return this.execCommandTop10(player, cmds, 'weekly');
  }
  commandTop10All(player: PlayerObject, cmds: string[]) {
    return this.execCommandTop10(player, cmds, 'all');
  }
  async execCommandTop10(player: PlayerObject, cmds: string[], type: "daily" | "weekly" | "all") {
    const rankings = {
      daily: { selector: 'top', data: this.hb_room.top10_daily,   prefix: ["TODAY",           "\u2007TOP\u2007"] },
      weekly: { selector: 'wtop', data: this.hb_room.top10_weekly, prefix: ["\u2007WEEK",      "\u2007TOP\u2007"] },
      all: { selector: 'ttop', data: this.hb_room.top10,           prefix: ["\u2007ALL\u2007", "\u2007TOP\u2007"] }
    };

    const ranking = rankings[type];
    if (!ranking || ranking.data.length === 0) {
      this.sendMsgToPlayer(player, "🏆 Brak danych o najlepszych graczach.", Colors.Stats);
      return;
    }

    const link = `${config.webpageLink}/${ranking.selector}/${this.hb_room.room_config.playersInTeamLimit}`;
    this.sendMsgToPlayer(player, `🏆 Pełny ranking dostępny pod linkiem: ${link}`, Colors.BrightBlue);
    const rankEmojis = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];
    const formatEntry = (e: PlayerTopRatingDataShort, index: number, shift: number) =>
        `${rankEmojis[shift+index]} ${e.player_name.length > 10 ? e.player_name.slice(0, 9) + "…" : e.player_name}⭐${e.rating}`;
    const formatEntry1 = (e: PlayerTopRatingDataShort, index: number) => formatEntry(e, index, 0);
    const formatEntry2 = (e: PlayerTopRatingDataShort, index: number) => formatEntry(e, index, 5);
    
    const firstHalf = ranking.data.slice(0, 5).map(formatEntry1).join(" ");
    this.sendMsgToPlayer(player, `🏆 ${ranking.prefix[0]}${firstHalf}`, Colors.Stats);
    
    if (ranking.data.length > 5) {
      const secondHalf = ranking.data.slice(5, 10).map(formatEntry2).join(" ");
      this.sendMsgToPlayer(player, `🏆 ${ranking.prefix[1]}${secondHalf}`, Colors.Stats);
    }
  }

  async commandTop10Ext(player: PlayerObject, cmds: string[]) {
    if (this.warnIfPlayerIsNotHost(player, "topext")) return;
    this.hb_room.game_state.getTop10Players().then((results) => {
      let n = 3;
      for (let result of results) {
        if (n-- <= 0) return;
        this.sendMsgToPlayer(player, `mamy ${result.player_name} ${result.games} ${result.goals}`);

      }
    }).catch((e) => hb_log(`!! commandTop10Ext error ${e}`));
  }

  async commandUpdateTop10(player: PlayerObject, cmds: string[]) {
    if (this.warnIfPlayerIsNotHost(player, "update_top10")) return;
    this.hb_room.updateTop10();
  }

  async commandPrintAuth(player: PlayerObject) {
    this.sendMsgToPlayer(player, `Twój auth ID to: ${this.Pid(player.id).auth_id}`);
  }

  async commandThumbVote(player: PlayerObject) {
    let playerExt = this.Pid(player.id);
    if (playerExt.trust_level == 0) return;
    this.hb_room.game_state.getPlayerVotes(playerExt.auth_id).then(({ upvotes, downvotes }) => {
      this.sendMsgToPlayer(player, `Masz ${upvotes} 👍 oraz ${downvotes} 👎, daj komuś kciuka w górę: !thumb_up @kebab`, Colors.Help);
    }).catch((error) => {
      console.error('Błąd przy pobieraniu reputacji:', error);
    });
  }

  async commandThumbVoteUp(player: PlayerObject, cmds: string[]) {
    let playerExt = this.Pid(player.id);
    if (playerExt.trust_level == 0) return;
    if (cmds.length == 0) {
      this.sendMsgToPlayer(player, "Wpisz nazwę gracza któremu chcesz dać kciuka w górę!");
      return;
    }
    let cmdPlayerExt = this.getPlayerDataByName(cmds, player);
    if (!cmdPlayerExt) return;
    if (player.id == cmdPlayerExt.id) return;
    this.hb_room.game_state.voteUp(playerExt.auth_id, cmdPlayerExt.auth_id);
    this.sendMsgToPlayer(player, `Dałeś ${cmdPlayerExt.name} kciuka w górę!`);
  }

  async commandThumbVoteDown(player: PlayerObject, cmds: string[]) {
    let playerExt = this.Pid(player.id);
    if (playerExt.trust_level == 0) return;
    if (cmds.length == 0) {
      this.sendMsgToPlayer(player, "Wpisz nazwę gracza któremu chcesz dać kciuka w dół!");
      return;
    }
    let cmdPlayerExt = this.getPlayerDataByName(cmds, player);
    if (!cmdPlayerExt) return;
    if (player.id == cmdPlayerExt.id) return;
    this.hb_room.game_state.voteDown(playerExt.auth_id, cmdPlayerExt.auth_id);
    this.sendMsgToPlayer(player, `Dałeś ${cmdPlayerExt.name} kciuka w dół!`);
  }

  async commandThumbVoteRemove(player: PlayerObject, cmds: string[]) {
    let playerExt = this.Pid(player.id);
    if (playerExt.trust_level == 0) return;
    if (cmds.length == 0) {
      this.sendMsgToPlayer(player, "Wpisz nazwę gracza któremu chcesz zabrać swojego kciuka!");
      return;
    }
    let cmdPlayerExt = this.getPlayerDataByName(cmds, player);
    if (!cmdPlayerExt) return;
    if (player.id == cmdPlayerExt.id) return;
    this.hb_room.game_state.removeVote(playerExt.auth_id, cmdPlayerExt.auth_id);
    this.sendMsgToPlayer(player, `Zabrałeś ${cmdPlayerExt.name} kciuka!`);
  }

  async commandRejoice(player: PlayerObject, cmds: string[]) {
    if (cmds.length === 0) {
      let names = this.hb_room.rejoice_maker.getRejoiceNames(player.id);
      let txt = names.length === 0 ? "Nie masz dostępnych cieszynek :( Sprawdź !sklep" : `Twoje cieszynki: ${names.join(", ")}, Wpisz !cieszynka <nazwa> by ją zmienić!`;
      this.sendMsgToPlayer(player, txt, Colors.DarkGreen);
      return;
    }
    let newSelected = cmds[0];
    if (this.hb_room.rejoice_maker.changeSelected(player.id, newSelected)) {
      this.sendMsgToPlayer(player, `Twoja aktualna cieszynka to ${newSelected}`, Colors.DarkGreen);
    } else {
      let names = this.hb_room.rejoice_maker.getRejoiceNames(player.id);
      this.sendMsgToPlayer(player, `Nie udało się zmienić cieszynki na ${newSelected}, Twoje cieszynki: ${names.join(", ")}`, Colors.DarkGreen);
    }
  }

  async commandVip(player: PlayerObject, cmds: string[]) {
    let playerExt = this.Pid(player.id);
    if (cmds.length === 0) {
      let all_option_names = Array.from(this.hb_room.vip_option_prices.keys());
      let option_names = this.hb_room.vip_options.getOptionNames(player.id);
      let optionsTxt = '';
      for (let option of all_option_names) {
        if (option_names.includes(option)) optionsTxt += '✅';
        optionsTxt += option + ' ';
      }
      this.sendMsgToPlayer(player, `By sprawdzić cenę: !vip <nazwa>, By rozpocząć proces zakupu: !vip <nazwa> <liczba dni>`, Colors.DarkGreen);
      this.sendMsgToPlayer(player, "Lista opcji VIP: "+optionsTxt, Colors.DarkGreen);
      if (playerExt.pendingVipOptionTransaction && playerExt.pendingVipOptionTransaction.status != "completed") {
        this.hb_room.game_state.getPaymentStatus(playerExt.pendingVipOptionTransaction.transactionId).then((paymentStatus) => {
          let tr = playerExt.pendingVipOptionTransaction;
          if (tr && paymentStatus) {
            if (paymentStatus === "completed") {
              if (tr.status !== "completed") {
                this.hb_room.vip_options.handlePlayerJoin(playerExt).then((num) => {
                  if (num > 0) this.sendMsgToPlayer(player, `Nowa opcja VIP aktywowana! Możesz ją już teraz wykorzystać!`, Colors.AzureBlue);
                }).catch((e) => e && hb_log(`!! vip_options after payment error: ${e}`));
              }
              tr.status = paymentStatus;
              this.sendMsgToPlayer(player, `Twoja płatność została zaksięgowana! Zakup zostanie aktywowany przy następnej wizycie. Dziękujemy!`, Colors.AzureBlue);
            } else if (paymentStatus === "failed") {
              tr.status = paymentStatus;
              this.sendMsgToPlayer(player, `Wystąpił problem z Twoją ostatnią płatnością. Sprawdź szczegóły tutaj: ${tr.link}`, Colors.DarkRed);
            } else if (paymentStatus === "started") {
              this.sendMsgToPlayer(player, `Masz aktywną transakcję. Możesz ją dokończyć tutaj: ${tr.link}`, Colors.AzureBlue);
            }
          }
        }).catch((e) => e && hb_log(`!! getPaymentStatus error: ${e}`))
      }
      return;
    }
    let optionName = cmds[0];
    if (!this.hb_room.vip_option_prices.has(optionName)) {
      this.sendMsgToPlayer(player, `Nie ma opcji VIP o nazwie ${optionName}!`, Colors.DarkGreen);
      return;
    }
    let prices = this.hb_room.vip_option_prices.get(optionName)!;
    if (cmds.length === 1) {
      const formattedString = Array.from(prices).map(({ for_days, price }) => `${for_days} dni: ${price} zł`).join(', ');
      this.sendMsgToPlayer(player, `VIP ${optionName} - dostępne opcje: ${formattedString}`, Colors.DarkGreen);
      return;
    }
    let forDays = Number.parseInt(cmds[1]);
    if (isNaN(forDays)) {
      this.sendMsgToPlayer(player, `Nieprawidłowa liczba dni dla opcji ${optionName}, ${forDays} nie jest prawidłową opcją!`, Colors.DarkGreen);
      return;
    }
    if (!prices.some(e => e.for_days == forDays)) {
      this.sendMsgToPlayer(player, `Nie ma takiej opcji zakupu! Sprawdź dostępne opcje wpisując !vip <nazwa>`, Colors.DarkGreen);
      return;
    }
    if (playerExt.pendingVipOptionTransaction && playerExt.pendingVipOptionTransaction.status !== 'completed') {
      this.sendMsgToPlayer(player, `Inny proces zakupu jest w toku. Najpierw go zakończ: ${playerExt.pendingVipOptionTransaction.link}`, Colors.DarkGreen);
      return;
    }
    this.hb_room.game_state.insertVipTransaction(playerExt.auth_id, optionName, Date.now(), forDays, this.hb_room.getSselector()).then((result) => {
      this.sendMsgToPlayer(player, `Proces zakupu opcji VIP rozpoczęty! Wkrótce otrzymasz link.`, Colors.DarkGreen);
      hb_log(`Zakup opcji VIP dla ${playerExt.name} ${playerExt.auth_id} r:${optionName} na ${forDays}, id:${result}`);
    }).catch((e) => e && hb_log(`!! insertVipTransaction error ${e}`));
  }

  async commandPrintAvailableRejoices(player: PlayerObject, cmds: string[]) {
    let availableRejoices = Array.from(this.hb_room.rejoice_prices.keys());
    this.sendMsgToPlayer(player, `Cieszynki dostępne do zakupu: ${availableRejoices.join(", ")}; Wpisz !cieszynka by sprawdzić listę Twoich cieszynek!`, Colors.DarkGreen);
  }

  async commandBuyRejoice(player: PlayerObject, cmds: string[]) {
    let playerExt = this.Pid(player.id);
    if (cmds.length === 0) {
      this.sendMsgToPlayer(player, `By sprawdzić cenę: !sklep <nazwa>, By rozpocząć proces zakupu: !kup <nazwa> <liczba dni>`, Colors.DarkGreen);
      this.sendMsgToPlayer(player, `Listę cieszynek dostępnych do kupienia sprawdzisz wołając !cieszynki, zainteresowany opcjami VIP? sprawdź !vip`, Colors.DarkGreen);
      if (playerExt.pendingRejoiceTransaction && playerExt.pendingRejoiceTransaction.status != "completed") {
        this.hb_room.game_state.getPaymentStatus(playerExt.pendingRejoiceTransaction.transactionId).then((paymentStatus) => {
          let tr = playerExt.pendingRejoiceTransaction;
          if (tr && paymentStatus) {
            if (paymentStatus === "completed") {
              if (tr.status !== "completed") {
                this.hb_room.rejoice_maker.handlePlayerJoin(playerExt).then((num) => {
                  if (num > 0) this.sendMsgToPlayer(player, `Nowa cieszynka aktywowana! Możesz ją już teraz wykorzystać!`, Colors.AzureBlue);
                }).catch((e) => e && hb_log(`!! rejoice_maker after payment error: ${e}`));
              }
              tr.status = paymentStatus;
              this.sendMsgToPlayer(player, `Twoja płatność została zaksięgowana! Zakup zostanie aktywowany przy następnej wizycie. Dziękujemy!`, Colors.AzureBlue);
            } else if (paymentStatus === "failed") {
              tr.status = paymentStatus;
              this.sendMsgToPlayer(player, `Wystąpił problem z Twoją ostatnią płatnością. Sprawdź szczegóły tutaj: ${tr.link}`, Colors.DarkRed);
            } else if (paymentStatus === "started") {
              this.sendMsgToPlayer(player, `Masz aktywną transakcję. Możesz ją dokończyć tutaj: ${tr.link}`, Colors.AzureBlue);
            }
          }
        }).catch((e) => e && hb_log(`!! getPaymentStatus error: ${e}`))
      }
      return;
    }
    let rejoiceName = cmds[0];
    if (rejoiceName === "vip") {
      return this.commandVip(player, cmds.slice(1));
    }
    if (!this.hb_room.rejoice_prices.has(rejoiceName)) {
      this.sendMsgToPlayer(player, `Nie ma cieszynki o nazwie ${rejoiceName}!`, Colors.DarkGreen);
      return;
    }
    let prices = this.hb_room.rejoice_prices.get(rejoiceName)!;
    if (cmds.length === 1) {
      const formattedString = Array.from(prices).map(({ for_days, price }) => `${for_days} dni: ${price} zł`).join(', ');
      this.sendMsgToPlayer(player, `Cieszynka ${rejoiceName} - dostępne opcje: ${formattedString}`, Colors.DarkGreen);
      return;
    }
    let forDays = Number.parseInt(cmds[1]);
    if (isNaN(forDays)) {
      this.sendMsgToPlayer(player, `Nieprawidłowa liczba dni dla cieszynki ${rejoiceName}, ${forDays} nie jest prawidłową opcją!`, Colors.DarkGreen);
      return;
    }
    if (!prices.some(e => e.for_days == forDays)) {
      this.sendMsgToPlayer(player, `Nie ma takiej opcji zakupu! Sprawdź dostępne opcje wpisując !kup <nazwa>`, Colors.DarkGreen);
      return;
    }
    if (playerExt.pendingRejoiceTransaction && playerExt.pendingRejoiceTransaction.status !== 'completed') {
      this.sendMsgToPlayer(player, `Inny proces zakupu jest w toku. Najpierw go zakończ: ${playerExt.pendingRejoiceTransaction.link}`, Colors.DarkGreen);
      return;
    }
    this.hb_room.game_state.insertRejoiceTransaction(playerExt.auth_id, rejoiceName, Date.now(), forDays, this.hb_room.getSselector()).then((result) => {
      this.sendMsgToPlayer(player, `Proces zakupu cieszynki rozpoczęty! Wkrótce otrzymasz link.`, Colors.DarkGreen);
      hb_log(`Zakup cieszynki dla ${playerExt.name} ${playerExt.auth_id} r:${rejoiceName} na ${forDays}, id:${result}`);
    }).catch((e) => e && hb_log(`!! insertRejoiceTransaction error ${e}`));
  }

  async commandCheckPlayerTransaction(player: PlayerObject, cmds: string[]) {
    if (this.warnIfPlayerIsNotHost(player, 'check_transaction')) return;
    if (cmds.length === 0) {
      this.sendMsgToPlayer(player, `O jakiego gracza chodzi?`);
      return;
    }
    let cmdPlayer = this.getPlayerDataByName(cmds, player, true);
    if (!cmdPlayer) return;
    let transaction = cmdPlayer.pendingRejoiceTransaction;
    if (!transaction) {
      this.sendMsgToPlayer(player, `Gracz ${cmdPlayer.name} nie ma zadnej transakcji w trakcie`);
      return;
    }
    this.sendMsgToPlayer(player, `Gracz ${player.name} numer transakcji: ${transaction.transactionId}, link: ${transaction.link} status: ${transaction.status}`);
  }

  async commandUpdateRejoiceForPlayer(player: PlayerObject, cmds: string[]) {
    if (this.warnIfPlayerIsNotHost(player, 'update_rejoice')) return;
    if (cmds.length === 0) {
      this.sendMsgToPlayer(player, `O jakiego gracza chodzi?`);
      return;
    }
    let cmdPlayer = this.getPlayerDataByName(cmds, player, true);
    if (!cmdPlayer) return;
    this.hb_room.rejoice_maker.handlePlayerJoin(cmdPlayer).then((num) => {
      this.sendMsgToPlayer(player, `Gracz ${cmdPlayer.name} Dostał ${num} cieszynek!`);
    }).catch((e) => e && hb_log(`!! rejoice_maker handlePlayerJoin error: ${e}`));
  }

  async commandSetRejoiceForPlayer(player: PlayerObject, cmds: string[]) {
    if (this.warnIfPlayerIsNotHost(player, 'set_rejoice')) return;
    if (cmds.length < 2) {
      this.sendMsgToPlayer(player, `O jakiego gracza chodzi? I jaka cieszynka?`);
      return;
    }
    let cmdPlayer = this.getPlayerDataByName(cmds, player, true);
    if (!cmdPlayer) return;
    let rejoiceId = cmds[1];
    this.hb_room.game_state.updateOrInsertRejoice(cmdPlayer.auth_id, rejoiceId, 0, Date.now() + 60_000).then(((result) => {
      this.hb_room.rejoice_maker.handlePlayerJoin(cmdPlayer).then((num) => {
        this.sendMsgToPlayer(player, `Gracz ${cmdPlayer.name} Dostał ${num} cieszynek!`);
      }).catch((e) => e && hb_log(`!! rejoice_maker handlePlayerJoin error: ${e}`));
    })).catch((e) => hb_log(`updateOrInsertRejoice error: ${e}`));
  }

  async commandSetVipOptionForPlayer(player: PlayerObject, cmds: string[]) {
    if (this.warnIfPlayerIsNotHost(player, 'vip_option')) return;
    if (cmds.length < 2) {
      this.sendMsgToPlayer(player, `O jakiego gracza chodzi? I jaka opcja VIPowska?`);
      return;
    }
    let cmdPlayer = this.getPlayerDataByName(cmds, player, true);
    if (!cmdPlayer) return;
    let option = cmds[1];
    this.hb_room.game_state.updateOrInsertVipOption(cmdPlayer.auth_id, option, 0, Date.now() + 60_000).then(((result) => {
      this.hb_room.vip_options.handlePlayerJoin(cmdPlayer).then((num) => {
        this.sendMsgToPlayer(player, `Gracz ${cmdPlayer.name} Dostał ${num} nowych opcji VIP!`);
      }).catch((e) => e && hb_log(`!! vip_options handlePlayerJoin error: ${e}`));
    })).catch((e) => hb_log(`updateOrInsertVipOption error: ${e}`));
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
    if (caller_ext.trust_level < 3) {
      this.sendMsgToPlayer(player, `Musisz mieć co najmniej trzeci poziom by móc nadawać poziom zaufania!`);
      return;
    }
    const amIhost = this.hb_room.isPlayerIdHost(player.id);
    let trust_level = parseInt(cmds[1] ?? 1, 10);
    trust_level = isNaN(trust_level) ? 0 : trust_level;
    if (!amIhost && trust_level <= 0) {
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
    this.hb_room.game_state.setTrustLevel(cmd_player_ext, trust_level, caller_ext);
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
      this.sendMsgToPlayer(player, `Ustawiłeś zaufanie dla: ${this.hb_room.to_be_trusted.size} graczy!`)
      this.hb_room.to_be_trusted.forEach(player_id => {
        let p = this.Pid(player_id);
        p.trust_level = 1;
        this.hb_room.game_state.setTrustLevel(p, 1, caller_ext);
      });
      this.hb_room.to_be_trusted.clear();
      return;
    } else if (c == '-') {
      this.hb_room.to_be_trusted.clear();
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
        this.hb_room.to_be_trusted.add(p.id);
        to_be_trusted_names.add(p.name);
      } else if (this.hb_room.to_be_trusted.has(p.id)) {
        to_be_trusted_names.add(p.name);
      }
    });
    this.sendMsgToPlayer(player, `W kolejce do dodania czekają: ${[...to_be_trusted_names].join(" ")}`);
  }

  async commandUnlockWriting(player: PlayerObject, cmds: string[]) {
    if (this.warnIfPlayerIsNotHost(player, 'u')) return;
    if (cmds.length == 0) {
      this.hb_room.anti_spam.clearMute(player.id);
      this.hb_room.captcha.clearCaptcha(player);
      this.hb_room.giveAdminTo(player);
    } else {
      let cmdPlayer = this.getPlayerObjectByName(cmds, player);
      if (!cmdPlayer) return;
      this.hb_room.anti_spam.clearMute(cmdPlayer.id);
      this.hb_room.captcha.clearCaptcha(cmdPlayer);
      this.sendMsgToPlayer(player, `Usunąłem blokady dla gracza: ${cmdPlayer.name}`);
    }
  }

  static trustIndicators: string[] = ['❌', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣'];

  async commandShowTrust(player: PlayerObject, cmds: string[]) {
    if (this.warnIfPlayerIsNotAdminNorHost(player)) return;
    let rStr = '';
    let bStr = '';
    let sStr = '';
    this.hb_room.players_ext.forEach(player => {
      let str = `${player.name}=${player.trust_level < 6? Commander.trustIndicators[player.trust_level]: player.trust_level} `;
      if (player.team === 1) rStr += str;
      else if (player.team === 2) bStr += str;
      else sStr += str;
    })
    this.sendMsgToPlayer(player, `R: ${rStr} | B: ${bStr} | S: ${sStr}`);

  }

  formatUptime(ms: number) {
    const total_seconds = Math.floor(ms / 1000);
    const hours = String(Math.floor(total_seconds / 3600)).padStart(2, '0');
    const minutes = String(Math.floor((total_seconds % 3600) / 60)).padStart(2, '0');
    const seconds = String(total_seconds % 60).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  }

  async commandUptime(player: PlayerObject) {
    let txt = this.formatUptime(Date.now() - this.hb_room.server_start_time);
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
    if (this.warnIfPlayerIsNotHost(player, 'anti_spam')) return;
    if (cmds.length == 0) return;
    let new_state = toBoolean(cmds[0]);
    this.hb_room.anti_spam.setEnabled(new_state);
    this.sendMsgToPlayer(player, `anti_spam = ${new_state}`);
    if (new_state) {
      this.getPlayers().filter(e => e.admin).forEach(player => {
        this.sendMsgToPlayer(player, `Anty Spam został włączony, mozesz wyłączyć dla niego sprawdzanie spamu: !spam_disable/sd <nick>, bez tego przy pisaniu podobnych wiadomości mógłby dostać kicka!`);
      });
    }
  }

  async commandTriggerCaptcha(player: PlayerObject, cmds: string[]) {
    if (this.warnIfPlayerIsNotHost(player, 'captcha')) return;
    if (cmds.length == 0) {
      this.sendMsgToPlayer(player, "Podkomendy: gen, clear, gen_me, set [0/1]");
    }
    if (cmds[0] == "gen_me") {
      this.hb_room.captcha.askCaptcha(player);
      return;
    } else if (cmds[0] == "set" && cmds.length > 1) {
      let new_state = toBoolean(cmds[1]);
      this.hb_room.captcha.setEnabled(new_state);
      this.sendMsgToPlayer(player, `Stan captcha = ${new_state}`);
      return;
    }

    this.getPlayers().forEach(p => {
      if (p.id != player.id) {
        if (cmds[0] == "gen") this.hb_room.captcha.askCaptcha(p);
        else if (cmds[0] == "clear") this.hb_room.captcha.clearCaptcha(p);
      }
    });
  }

  async commandOnlyTrustedJoin(player: PlayerObject, cmds: string[]) {
    if (this.warnIfPlayerIsNotHost(player, 'only_trusted_join')) return;
    if (cmds.length == 0) {
      this.sendMsgToPlayer(player, "wołaj z on/off");
      return;
    }
    let new_state = toBoolean(cmds[0]);
    this.hb_room.allow_connecting_only_trusted = new_state;
    this.sendMsgToPlayer(player, `Tylko trusted connecting: ${new_state}`);
  }

  async commandOnlyTrustedChat(player: PlayerObject, cmds: string[]) {
    if (this.warnIfPlayerIsNotHost(player, 'only_trusted_chat')) return;
    if (cmds.length == 0) {
      this.sendMsgToPlayer(player, "wołaj z on/off");
      return;
    }
    let new_state = toBoolean(cmds[0]);
    this.hb_room.allow_chatting_only_trusted = new_state;
    this.sendMsgToPlayer(player, `Tylko trusted chatting: ${new_state}`);
  }

  async commandWhitelistNonTrustedNick(player: PlayerObject, cmds: string[]) {
    if (this.warnIfPlayerIsNotAdmin(player)) return;
    cmds.forEach(player_name => {
      this.hb_room.whitelisted_nontrusted_player_names.add(player_name);
    });
  }

  async commandAutoDebug(player: PlayerObject, cmds: string[]) {
    if (this.warnIfPlayerIsNotHost(player, 'auto_debug')) return;
    if (!this.hb_room.ratings_for_all_games) {
      this.hb_room.player_duplicate_allowed = true;
      this.hb_room.limit = Number.parseInt(cmds[0]) || 3;
      this.hb_room.auto_afk = false;
      this.hb_room.auto_bot.MaxMatchTime = Number.parseInt(cmds[1]) || 150;
      this.hb_room.auto_bot.autoVoter.setRequiredVotes(2);
      this.commandAutoMode(player, ["on"]);
    } else {
      this.hb_room.player_duplicate_allowed = false;
      this.hb_room.auto_afk = true;
      this.hb_room.auto_bot.MaxMatchTime = 6*60;
      this.hb_room.auto_bot.autoVoter.setRequiredVotes(3);
      this.commandAutoMode(player, ["off"]);
    }
    this.hb_room.ratings_for_all_games = !this.hb_room.ratings_for_all_games;
    this.sendMsgToPlayer(player, `Rating dla wszystkich: ${this.hb_room.ratings_for_all_games}`);
  }

  async commandSetDelayOnJoin(player: PlayerObject, cmds: string[]) {
    if (this.warnIfPlayerIsNotHost(player, 'set_delay')) return;
    if (!cmds.length) return;
    let time = Number.parseInt(cmds[0]);
    if (!isNaN(time)) {
      this.hb_room.delay_joiner.DelayTime = time * 1000;
      this.sendMsgToPlayer(player, `Delay ustawiony na: ${time} s`);
    }
  }

  async commandSetWelcomeMsg(player: PlayerObject, cmds: string[]) {
    if (this.warnIfPlayerIsNotHost(player, 'welcome')) return;
    if (!cmds.length) return;
    this.hb_room.welcome_message.setMessage(cmds.join(' '));
  }

  async commandSendAnnoToAllPlayers(player: PlayerObject, cmds: string[]) {
    if (this.warnIfPlayerIsNotHost(player, 'welcome')) return;
    if (!cmds.length) return;
    this.hb_room.sendMsgToAll(`${cmds.join(' ')}`, Colors.AzureBlue, 'bold');
  }

  async commandServerRestart(player: PlayerObject) {
    if (this.warnIfPlayerIsNotHost(player, 'server_restart')) return;
    for (let i = 0; i < 3; ++i) {
      this.hb_room.sendMsgToAll(`Reset za ${3 - i} sekund`, Colors.Warning, 'bold', 2);
      await sleep(1000);
    }
    for (let p of this.getPlayersExt()) {
      this.r().kickPlayer(p.id, "Reset, wróć za minutę!", false);
    }
  }

  async commandGodTest(player: PlayerObject, cmds: string[]) {
    if (this.warnIfPlayerIsNotHost(player, 'server_restart')) return;
    let cmd = cmds.join(" ");
    this.sendMsgToPlayer(player, `trying to exec: ${cmd}`);
    this.r().onPlayerChat(this.hb_room.god_player, cmd);
  }

  async commandSwitchBotStoppingFlag(player: PlayerObject, cmds: string[]) {
    if (this.warnIfPlayerIsNotHost(player, 'bots')) return;
    this.hb_room.bot_stopping_enabled = !this.hb_room.bot_stopping_enabled;
      this.sendMsgToPlayer(player, `Obecny stan: ${this.hb_room.bot_stopping_enabled}`);
  }

  async commandPrintShortInfo(player: PlayerObject, cmds: string[]) {
    if (this.warnIfPlayerIsNotHost(player, 'bots')) return;
    let players = this.r().getPlayerList();
    let txt = '';
    for (let e of players) {
      let p = this.hb_room.Pid(e.id);
      txt += ` ${p.name}=T${p.trust_level},B${p.bot?1:0}`;
    }
    this.sendMsgToPlayer(player,txt);
  }

  async commandBotSetRadius(player: PlayerObject, cmds: string[]) {
    if (this.warnIfPlayerIsNotHost(player, 'botmin')) return;
    let newRadius = Number.parseFloat(cmds[0]);
    if (isNaN(newRadius)) newRadius = 15;
    let bots = this.hb_room.getPlayersExtList().filter(e => e.bot);
      bots.forEach(bot => {
        this.r().setPlayerDiscProperties(bot.id, { "radius": newRadius });
      })
  }

  async commandCheckBots(player: PlayerObject, cmds: string[]) {
    if (this.warnIfPlayerIsNotHost(player, 'bots')) return;
    let bots = this.hb_room.getPlayersExtList().filter(e => e.bot).map(e => e.name);
    if (bots.length)
      this.sendMsgToPlayer(player, `Boty: ${bots.join(', ')}`);
    else
      this.sendMsgToPlayer(player, `Nie znalazłem botów`);
  }

  async commandWhoIsNotBot(player: PlayerObject, cmds: string[]) {
    if (this.warnIfPlayerIsNotHost(player, 'bots')) return;
    let bots = this.hb_room.getPlayersExtList().filter(e => !e.bot).map(e => e.name);
    if (bots.length)
      this.sendMsgToPlayer(player, `Raczej ludzie: ${bots.join(', ')}`);
    else
      this.sendMsgToPlayer(player, `Nie znalazłem Człowieka`);
  }

  async commandMarkBot(player: PlayerObject, cmds: string[]) {
    if (this.warnIfPlayerIsNotHost(player, 'bot')) return;
    let txt = '';
    for (let cmd of cmds) {
      let cmdPlayer = this.getPlayerDataByName(cmd, player);
      if (!cmdPlayer) continue;
      if (cmdPlayer.id == player.id) continue;
      cmdPlayer.bot = true;
      this.hb_room.game_state.addProbableBot(cmdPlayer.auth_id, cmdPlayer.conn_id).catch((e) => hb_log(`!! addProbableBot error ${e}`));
      txt += `${cmdPlayer.name} `;
    }
    this.sendMsgToPlayer(player, `BOT dodałem ${txt}`);
  }

  async commandUnmarkBot(player: PlayerObject, cmds: string[]) {
    if (this.warnIfPlayerIsNotHost(player, 'bot')) return;
    let txt = '';
    for (let cmd of cmds) {
      let cmdPlayer = this.getPlayerDataByName(cmd, player);
      if (!cmdPlayer) continue;
      if (cmdPlayer.id == player.id) continue;
      cmdPlayer.bot = false;
      this.hb_room.game_state.removeProbableBotByAuthId(cmdPlayer.auth_id).catch((e) => hb_log(`!! removeProbableBot error ${e}`));
      txt += `${cmdPlayer.name} `;
    }
    this.sendMsgToPlayer(player, `BOT usunąłem ${txt}`);
  }

  async commandKickBots(player: PlayerObject, cmds: string[]) {
    if (this.warnIfPlayerIsNotHost(player, 'bots')) return;
    let bots = this.hb_room.getPlayersExtList().filter(e => e.bot);
    for (let bot of bots) {
      this.hb_room.room.kickPlayer(bot.id, '', false);
    }
  }

  async commandTKickBots(player: PlayerObject, cmds: string[]) {
    if (this.warnIfPlayerIsNotHost(player, 'tkick_bots')) return;
    let bots = this.hb_room.getPlayersExtList().filter(e => e.bot);
    for (let bot of bots) {
      this.hb_room.room.kickPlayer(bot.id, '', false);
      this.hb_room.players_game_state_manager.setPlayerTimeKicked(bot, 365*24*60*60*1000, false);
    }
  }

  async commandNKickBots(player: PlayerObject, cmds: string[]) {
    if (this.warnIfPlayerIsNotHost(player, 'nkick_bots')) return;
    let bots = this.hb_room.getPlayersExtList().filter(e => e.bot);
    for (let bot of bots) {
      this.hb_room.room.kickPlayer(bot.id, '', false);
      this.hb_room.players_game_state_manager.setNetworkTimeKicked(bot, 365*24*60*60*1000, false);
    }
  }

  async commandBanReload(player: PlayerObject, cmds: string[]) {
    if (this.warnIfPlayerIsNotHost(player, 'ban_reload')) return;
    this.hb_room.players_game_state_manager.initAllGameState();
    this.sendMsgToPlayer(player, `Przeładowałem network players state`);
  }

  async keyboardLShiftDown(player: PlayerObject) {
    this.hb_room.acceleration_tasks.startSprint(player.id);
  }

  async keyboardLShiftUp(player: PlayerObject) {
    this.hb_room.acceleration_tasks.stopSprint(player.id);
  }

  async keyboardADown(player: PlayerObject) {
    this.hb_room.acceleration_tasks.slide(player.id);
  }

  warnIfPlayerIsNotAdminNorHost(player: PlayerObject) {
    if (this.hb_room.isPlayerHost(player)) return false;
    return this.warnIfPlayerIsNotAdmin(player);
  }

  warnIfPlayerIsNotAdmin(player: PlayerObject) {
    if (!player.admin) {
      this.sendMsgToPlayer(player, "Tylko dla Admina!");
      return true;
    }
    return false;
  }

  warnIfPlayerIsNotApprovedAdmin(player: PlayerObject|PlayerData) {
    if (!("admin_level" in player)) return this.Pid(player.id).admin_level <= 0;
    return player.admin_level <= 0;
  }

  warnIfPlayerIsNotHost(player: PlayerObject, cmd_name: string) {
    if (!this.hb_room.isPlayerHost(player) && !this.hb_room.isGodPlayer(player)) {
      this.sendMsgToPlayer(player, `Nieznana komenda:${cmd_name} `);
      return true;
    }
    return false
  }
}

export default Commander;
