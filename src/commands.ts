import { BuyCoffee } from "./buy_coffee";
import { HaxballRoom } from "./hb_room";
import { isValidMap } from "./maps";
import { PlayerData, PlayerTopRatingDataShort, TransactionByPlayerInfo } from "./structs";
import { sleep, getTimestampHM, toBoolean } from "./utils";
import { generateVerificationLink } from "./verification";
import { Colors } from "./colors";
import * as config from './config';
import { hb_log } from "./log";
import { Emoji } from "./emoji";
import { AutoBot } from "./auto_mode";

class BaseCommander {
  hb_room: HaxballRoom;

  constructor(hb_room: HaxballRoom) {
    this.hb_room = hb_room;
  }

  r() {
    return this.hb_room.room;
  }

  Pid(playerId: number): PlayerData {
    return this.hb_room.Pid(playerId);
  }

  sendMsgToPlayer(player: PlayerData, message: string, color: number | undefined = undefined, style: string | undefined = undefined, sound: number = 0) {
    this.hb_room.sendMsgToPlayer(player, message, color, style, sound);
  }

  sendMsgToAll(message: string, color: number | undefined = undefined, style: string | undefined = undefined, sound: number = 0) {
    this.hb_room.sendMsgToAll(message, color, style, sound);
  }

  getPlayerDataByName(playerName: string | string[], byPlayer: PlayerData | null, byPlayerIfNameNotSpecified = false, allPlayers = false): PlayerData | null {
    return this.hb_room.getPlayerDataByName(playerName, byPlayer, byPlayerIfNameNotSpecified, allPlayers);
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

  warnIfPlayerIsNotAdminNorHost(player: PlayerData) {
    if (this.hb_room.isPlayerHost(player)) return false;
    return this.warnIfPlayerIsNotAdmin(player);
  }

  warnIfPlayerIsNotAdmin(player: PlayerData) {
    if (!player.admin) {
      this.sendMsgToPlayer(player, "Tylko dla Admina!");
      return true;
    }
    return false;
  }

  warnIfPlayerIsNotApprovedAdmin(player: PlayerData) {
    return player.admin_level <= 0;
  }

  warnIfPlayerIsNotHost(player: PlayerData, cmd_name: string) {
    if (!this.hb_room.isPlayerHost(player) && !this.hb_room.isGodPlayer(player)) {
      this.sendMsgToPlayer(player, `Nieznana komenda:${cmd_name} `);
      return true;
    }
    return false
  }
}
class Commander extends BaseCommander {
  commands: Record<string, Function>;
  discordCommander: DiscordCommander;

  constructor(hb_room: HaxballRoom) {
    super(hb_room);

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
      mapc: this.commandChangeMapColored,
      ping: (player: PlayerData) => this.hb_room.sendMsgToPlayer(player, "Pong!"),
      mute: this.commandMute,
      muted: this.commandMuted,
      unmute: this.commandUnmute,
      muteall: this.commandMuteAll,
      mute_all: this.commandMuteAll,
      unmute_all: this.commandUnmuteAll,
      unmuteall: this.commandUnmuteAll,
      ignore: this.commandIgnore,
      ignoruj: this.commandIgnore,
      i: this.commandIgnore,
      "ignore-": this.commandUnignore,
      "ignoruj-": this.commandUnignore,
      "i-": this.commandUnignore,

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
      xt: this.commandTrustUntilDisconnected,
      "xt-": this.commandUnTrustTemporary,
      xtlist: this.commandShowTrustTemporary,
      xtl: this.commandShowTrustTemporary,
      after: this.commandAfter,

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
      donate: this.commandBuyCoffeeLink,

      dc: this.commandShowDiscordAndWebpage,
      discord: this.commandShowDiscordAndWebpage,
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
      boti: this.commandPrintShortInfo,
      botradius: this.commandBotSetRadius,
      botstop: this.commandSwitchBotStoppingFlag,
      ip: this.commandPrintPlayerIp,
      no_x: this.commandNoXEnable,
      no_xd: this.commandNoXDisable,
      ipv6: this.commandWhoHasIpv6,

      god: this.commandGodTest,

      h: this.commandHelp,
      "?": this.commandHelp,
      help: this.commandHelp,
      pomoc: this.commandHelp,
      komendy: this.commandHelp
    };

    this.discordCommander = new DiscordCommander(hb_room);
    this.discordCommander.update(this);
  }

  // commands below
  commandSendMessage(player: PlayerData, cmds: string[]) {
    if (cmds.length < 2) {
      this.sendMsgToPlayer(player, 'Uzycie:!pm/!pw/!w <@player_name> <message...>')
      return;
    }
    let cmdPlayer = this.getPlayerDataByName(cmds[0], player);
    if (!cmdPlayer) return;
    if (cmdPlayer.id == player.id) return;
    let msg = cmds.slice(1).join(" ");
    this.sendMsgToPlayer(player, `PM>> ${cmdPlayer.name}: ${msg}`, 0xFFBF00, 'italic');
    if (!cmdPlayer.ignores.has(player.id)) {
      this.sendMsgToPlayer(cmdPlayer, `PM<< ${player.name}: ${msg}`, 0xFFBF00, 'italic', 1);
    }
  }

  commandPressure(player: PlayerData) {
    this.sendMsgToPlayer(player, `Pressure: Red ${this.hb_room.pressure_right.toFixed(2)}s, Blue ${this.hb_room.pressure_left.toFixed(2)}s`);
  }

  commandChoosingPlayers(playerExt: PlayerData, cmds: string[]) {
    if (!cmds.length) {
      this.sendMsgToPlayer(playerExt, "W trakcie meczu wybierz sobie graczy! Dostaniesz dostępnych! np: !wyb @player1 @player2... !wyb #5 #8 #13 #21...", Colors.Help, 'italic');
      this.sendMsgToPlayer(playerExt, "Nie będzie przerwy na wybieranie. Lista przetrwa do restartu, by ją wyczyścić, uzyj !wyb-", Colors.Help, 'italic');
      if (playerExt.chosen_player_names.length) this.sendMsgToPlayer(playerExt, `Twoja obecna lista: ${playerExt.chosen_player_names.join(', ')}`, Colors.GameState, 'italic');
      return;
    }
    cmds.reverse().forEach(playerName => {
      let p = this.getPlayerDataByName(playerName, playerExt);
      if (p) {
        let newName = p.name_normalized;
        const prevIdx = playerExt.chosen_player_names.indexOf(newName);
        if (prevIdx !== -1) {
          playerExt.chosen_player_names.splice(prevIdx, 1);
        }
        playerExt.chosen_player_names.unshift(newName); // add always at the beginning, given player list is in reverse order so it it as expected
      }
    });
    this.sendMsgToPlayer(playerExt, `Twoja obecna lista: ${playerExt.chosen_player_names.join(', ')}`, Colors.GameState, 'italic');
  }

  commandUnchoosingPlayers(playerExt: PlayerData, cmds: string[]) {
    if (!cmds.length) {
      this.sendMsgToPlayer(playerExt, "Wyczyściłeś listę!", Colors.GameState, 'italic');
      playerExt.chosen_player_names = [];
    } else {
      const cmdsSet = new Set(); // O(1), list.includes has O(n)
      // TODO below to function?
      cmds.forEach(playerName => {
        let p = this.getPlayerDataByName(playerName, playerExt);
        if (p) {
          cmdsSet.add(p.name_normalized);
        }
      })
      playerExt.chosen_player_names = playerExt.chosen_player_names.filter(e => !cmdsSet.has(e));
      this.sendMsgToPlayer(playerExt, `Twoja obecna lista: ${playerExt.chosen_player_names.join(', ')}`, Colors.GameState, 'italic');
    }
  }

  commandPauseRequested(player: PlayerData) {
    if (!player.team) return;
    if (this.hb_room.auto_mode) this.hb_room.auto_bot.handlePauseRequest(player);
  }

  async commandRestartMatch(playerExt: PlayerData) {
    if (this.hb_room.auto_mode) {
      this.hb_room.auto_bot.handleRestartRequested(playerExt);
      return;
    }
    if (this.warnIfPlayerIsNotAdmin(playerExt)) return;
    this.hb_room.updateWinnerTeamBeforeGameStop();
    this.r().stopGame();
    await sleep(125);
    this.r().startGame();
    this.sendMsgToAll(`(!r) ${playerExt.name} zrobił restart meczu, limit: ${this.hb_room.limit} (!limit), zmiana mapy: !m 2, !m 3, !m 4`, Colors.GameState);
  }

  commandRandomAndRestartMatch(playerExt: PlayerData) {
    if (this.warnIfPlayerIsNotAdmin(playerExt)) return;
    this.hb_room.updateWinnerTeamBeforeGameStop();
    this.hb_room.makeRandomAndRestartMatch();
    this.sendMsgToAll(`(!rr) ${playerExt.name} zrobił losowanie drużyn${this.hb_room.getPrevWinnerLogTxt()}, limit: ${this.hb_room.limit} (!limit), zmiana mapy: !m 2, !m 3, !m 4`, Colors.GameState);
  }

  commandWinStayNextMatch(playerExt: PlayerData) {
    if (this.warnIfPlayerIsNotAdmin(playerExt)) return;
    this.hb_room.updateWinnerTeamBeforeGameStop();
    if (!this.hb_room.last_winner_team) this.hb_room.makeRandomAndRestartMatch();
    else this.hb_room.makeWinStayAndRestartMatch();
    this.sendMsgToAll(`(!ws) ${playerExt.name} zostawił zwycięską druzynę${this.hb_room.getPrevWinnerLogTxt()}, limit: ${this.hb_room.limit} (!limit), zmiana mapy: !m 2, !m 3, !m 4`, Colors.GameState);
  }

  commandStartMatch(playerExt: PlayerData) {
    if (this.warnIfPlayerIsNotAdmin(playerExt)) return;
    this.r().startGame();
  }

  commandStopMatch(playerExt: PlayerData) {
    if (this.warnIfPlayerIsNotAdmin(playerExt)) return;
    this.hb_room.updateWinnerTeamBeforeGameStop();
    this.r().stopGame();
  }

  commandStartOrStopMatch(playerExt: PlayerData) {
    if (this.warnIfPlayerIsNotAdmin(playerExt)) return;
    let d = this.r().getScores();
    if (d) {
      this.hb_room.updateWinnerTeamBeforeGameStop();
      this.r().stopGame();
    } else {
      this.r().startGame();
    }
  }

  commandSwapTeams(playerExt: PlayerData) {
    if (this.warnIfPlayerIsNotAdmin(playerExt)) return;
    if (this.hb_room.isGameInProgress()) {
      this.sendMsgToPlayer(playerExt, 'Nie mozna zmieniać zespołów podczas meczu!')
      return;
    }
    this.hb_room.swapTeams();
  }

  async commandSwapAndRestart(playerExt: PlayerData) {
    if (this.warnIfPlayerIsNotAdmin(playerExt)) return;
    this.hb_room.updateWinnerTeamBeforeGameStop();
    this.r().stopGame();
    await sleep(125);
    this.hb_room.swapTeams();
    await sleep(125);
    this.r().startGame();
    this.sendMsgToAll(`(!sr) ${playerExt.name} zmienił strony druzyn, limit: ${this.hb_room.limit} (!limit), zmiana mapy: !m 2, !m 3, !m 4`, Colors.GameState);
  }

  commandAddPlayersToTeam(playerExt: PlayerData) {
    if (this.warnIfPlayerIsNotAdmin(playerExt)) return;
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
    if (any_added) this.sendMsgToAll(`(!a) ${playerExt.name} uzupełnił druzyny`, Colors.GameState);
  }

  commandHelp(playerExt: PlayerData) {
    this.sendMsgToPlayer(playerExt, ": !wyb !p !w !ignore !bb !ping !afk !back !afks !stat !top !ttop !wtop !pasek !discord !kebab !cieszynka !sklep", Colors.Help, "small-italic");
    if (playerExt.admin_level) {
      this.sendMsgToPlayer(playerExt, "Dla Admina: !mute !unmute !r !s !swap !sr !rr !ws !a !map/m", Colors.Help, "small-italic");
      this.sendMsgToPlayer(playerExt, "Dla Admina: !kick !tkick_5m/1h/1d !tmute_5m/1h/1d !nkick_5m/1h/1d !nmute_5m/1h/1d", Colors.Help, "small-italic");
    }
    if (playerExt.trust_level > 0) {
      this.sendMsgToPlayer(playerExt, ": !thumb !thumb_up/down/remove !report !verify", Colors.Help, "small-italic");
    }
    this.sendMsgToPlayer(playerExt, "By wywołać ostatnią komendę, uzyj !!", Colors.Help, "small-italic");
  }

  commandChangeMap(playerExt: PlayerData, cmds: string[]) {
    if (this.warnIfPlayerIsNotAdmin(playerExt)) return;
    if (cmds.length == 0) {
      this.sendMsgToPlayer(playerExt, 'Napisz jaką mapę chcesz, dostępne: classic/c, big/b, futsal/f, futsal_big/fb futsal_huge/fh', Colors.GameState, 'italic');
      return;
    }
    let map_name = cmds[0].toLowerCase();
    if (isValidMap(map_name)) {
      if (!this.hb_room.isGameInProgress()) {
        this.hb_room.setMapByName(map_name);
        this.sendMsgToAll(`${playerExt.name} zmienił mapę na ${map_name}`, Colors.GameState);
      }
    } else {
      this.sendMsgToPlayer(playerExt, 'Nie ma takiej mapy', Colors.Warning);
    }
  }

  commandChangeMapColored(playerExt: PlayerData, cmds: string[]) {
    if (this.warnIfPlayerIsNotApprovedAdmin(playerExt)) return;
    if (cmds.length == 0) {
      this.sendMsgToPlayer(playerExt, 'Napisz jaką mapę chcesz, dostępne: classic/c, big/b, futsal/f, futsal_big/fb futsal_huge/fh', Colors.GameState, 'italic');
      return;
    }
    let map_name = cmds[0].toLowerCase();
    let bgColor = Number.parseInt(cmds[1]) || 0; // bg.color
    let ballColor = Number.parseInt(cmds[2]) || 0; // discs[0].color
    if (isValidMap(map_name)) {
      if (!this.hb_room.isGameInProgress()) {
        this.hb_room.setMapByName(map_name, bgColor, ballColor);
        this.sendMsgToAll(`${playerExt.name} zmienił mapę na ${map_name}, bg(0x${bgColor.toString(16)}) ball(0x${ballColor.toString(16)})`, Colors.GameState);
      }
    } else {
      this.sendMsgToPlayer(playerExt, 'Nie ma takiej mapy', Colors.Warning);
    }
  }

  commandMute(playerExt: PlayerData, cmds: string[]) {
    if (this.warnIfPlayerIsNotApprovedAdmin(playerExt)) return;
    for (let cmd of cmds) {
      let cmdPlayer = this.getPlayerDataByName(cmd, playerExt);
      if (!cmdPlayer) return;
      if (cmdPlayer.id == playerExt.id) return;
      this.hb_room.addPlayerMuted(cmdPlayer);
      this.sendMsgToPlayer(cmdPlayer, "Zostałeś wyciszony!", Colors.Warning, undefined, 2);
      this.sendMsgToPlayer(playerExt, `Muted: ${cmdPlayer.name}`);
    }
  }

  commandMuted(playerExt: PlayerData) {
    let muted: string[] = [];
    for (let p of this.getPlayersExt()) {
      if (this.hb_room.isPlayerMuted(p)) muted.push(p.name);
    }
    this.sendMsgToPlayer(playerExt, `Muted: ${muted.join(" ")}`);
  }

  commandMuteAll(playerExt: PlayerData) {
    if (this.warnIfPlayerIsNotApprovedAdmin(playerExt)) return;
    for (let p of this.getPlayersExt()) {
      this.hb_room.addPlayerMuted(p);
    }
    this.sendMsgToPlayer(playerExt, "Muted all Players", Colors.GameState);
  }

  commandUnmute(playerExt: PlayerData, cmds: string[]) {
    if (this.warnIfPlayerIsNotApprovedAdmin(playerExt)) return;
    for (let cmd of cmds) {
      let cmdPlayer = this.getPlayerDataByName(cmd, playerExt);
      if (!cmdPlayer) return;
      if (playerExt.id == cmdPlayer.id) return;
      if (!this.hb_room.isPlayerMuted(cmdPlayer)) return;
      this.hb_room.removePlayerMuted(cmdPlayer);
      this.hb_room.anti_spam.removePlayer(cmdPlayer);
      this.sendMsgToPlayer(cmdPlayer, "Ju mozesz pisać!", Colors.Warning, undefined, 2);
      this.sendMsgToPlayer(playerExt, `Unmuted: ${cmdPlayer.name}`);
    }
  }

  commandUnmuteAll(playerExt: PlayerData) {
    if (this.warnIfPlayerIsNotApprovedAdmin(playerExt)) return;
    this.hb_room.muted_players.clear();
    this.sendMsgToPlayer(playerExt, "Unmuted all Players", Colors.GameState);
  }

  commandIgnore(playerExt: PlayerData, cmds: string[]) {
    if (!cmds.length) {
      this.sendMsgToPlayer(playerExt, `Lista ignorowanych osób: ${Array.from(playerExt.ignores).map(e => `#${e}`).join(' ')}`, Colors.LightYellow, 'italic');
      return;
    }
    let cmdPlayer = this.getPlayerDataByName(cmds, playerExt);
    if (!cmdPlayer) return;
    if (playerExt.id == cmdPlayer.id) return;
    playerExt.ignores.add(cmdPlayer.id);
    cmdPlayer.ignored_by.add(playerExt.id);
    this.sendMsgToPlayer(playerExt, `Ignorujesz ${cmdPlayer.name}`, Colors.LightYellow, 'italic');
  }

  commandUnignore(playerExt: PlayerData, cmds: string[]) {
    if (!cmds.length) {
      playerExt.ignores.forEach(playerId => {
        this.Pid(playerId).ignored_by.delete(playerExt.id);
      });
      playerExt.ignores.clear();
      this.sendMsgToPlayer(playerExt, 'Lista ignorowanych osób jest teraz pusta!', Colors.LightYellow, 'italic');
      return;
    }
    let cmdPlayer = this.getPlayerDataByName(cmds, playerExt);
    if (!cmdPlayer) return;
    if (playerExt.id == cmdPlayer.id) return;
    if (playerExt.ignores.has(cmdPlayer.id)) {
      playerExt.ignores.delete(cmdPlayer.id);
      cmdPlayer.ignored_by.delete(playerExt.id);
      this.sendMsgToPlayer(playerExt, `Juz nie ignorujesz ${cmdPlayer.name}`, Colors.LightYellow, 'italic');
    }
  }

  commandSwitchAfk(playerExt: PlayerData) {
    // switch on/off afk
    if (!playerExt.afk) {
      this.commandSetAfkExt(playerExt);
    } else {
      // clear AFK status
      this.commandClearAfkExt(playerExt);
    }
  }

  commandSetAfk(playerExt: PlayerData) {
    this.commandSetAfkExt(playerExt);
  }

  commandSetAfkExt(playerExt: PlayerData) {
    // set on afk
    if (playerExt.afk) return;
    playerExt.afk_switch_time = Date.now();
    playerExt.afk = true;
    this.hb_room.setPlayerAvatarTo(playerExt, Emoji.Afk);
    this.sendMsgToAll(`${playerExt.name} poszedł AFK (!afk !back !jj)`, Colors.Afk);
    if (playerExt.team != 0) {
      this.r().setPlayerTeam(playerExt.id, 0);
    }
    if (playerExt.admin) this.hb_room.updateAdmins(null);
  }

  commandClearAfk(playerExt: PlayerData) {
    this.commandClearAfkExt(playerExt);
  }

  commandClearAfkExt(playerExt: PlayerData) {
    if (playerExt.afk) {
      const now = Date.now();
      if (now - playerExt.afk_switch_time < HaxballRoom.MaxAllowedAfkNoMoveTimeMs) {
        this.sendMsgToPlayer(playerExt, "Nie da się tak szybko wstać z krzesła i usiąść!", Colors.Afk);
        return;
      }
      playerExt.afk = false;
      this.hb_room.setPlayerAvatarTo(playerExt, '');
      this.sendMsgToAll(`${playerExt.name} wrócił z AFK (!afk !back !jj)`, Colors.Afk);
      playerExt.activity.updateGame(now);
      if (this.hb_room.auto_mode) this.hb_room.auto_bot.handlePlayerBackFromAfk(playerExt);
    }
    this.hb_room.updateAdmins(null);
  }

  commandPrintAfkList(playerExt: PlayerData) {
    var log_str = "AFK list: "
    for (let p of this.getPlayersExt()) {
      if (p.afk || p.afk_maybe) log_str += `${p.name}[${p.id}] `;
    }
    this.sendMsgToPlayer(playerExt, log_str);
  }

  commandSetAfkOther(playerExt: PlayerData, cmds: string[]) {
    if (this.warnIfPlayerIsNotApprovedAdmin(playerExt)) return;
    for (let cmd of cmds) {
      let cmdPlayer = this.getPlayerDataByName(cmd, playerExt);
      if (!cmdPlayer) return;
      let cmdPlayerExt = this.Pid(cmdPlayer.id);
      if (!cmdPlayerExt.afk) this.commandSetAfkExt(cmdPlayerExt);
    }
  }

  commandClearAfkOther(playerExt: PlayerData, cmds: string[]) {
    if (this.warnIfPlayerIsNotApprovedAdmin(playerExt)) return;
    for (let cmd of cmds) {
      let cmdPlayer = this.getPlayerDataByName(cmd, playerExt);
      if (!cmdPlayer) return;
      let cmdPlayerExt = this.Pid(cmdPlayer.id);
      this.commandClearAfkExt(cmdPlayerExt);
    }
  }

  commandByeBye(playerExt: PlayerData) {
    this.r().kickPlayer(playerExt.id, "Bye bye!", false);
  }

  commandKick(playerExt: PlayerData, cmds: string[]) {
    if (this.warnIfPlayerIsNotApprovedAdmin(playerExt)) return;
    for (let cmd of cmds) {
      let cmdPlayer = this.getPlayerDataByName(cmd, playerExt);
      if (!cmdPlayer) continue;
      if (cmdPlayer.id == playerExt.id) continue;
      this.r().kickPlayer(cmdPlayer.id, "Kik!", false);
    }
  }

  commandKickAllExceptVerified(playerExt: PlayerData) {
    if (this.warnIfPlayerIsNotApprovedAdmin(playerExt)) return;
    for (let p of this.getPlayersExt()) {
      if (playerExt.id != p.id && !p.trust_level) this.r().kickPlayer(p.id, "", false);
    }
  }

  commandKickAllRed(playerExt: PlayerData) {
    if (this.warnIfPlayerIsNotApprovedAdmin(playerExt)) return;
    this.hb_room.kickAllTeamExceptTrusted(playerExt, 1);
  }

  commandKickAllBlue(playerExt: PlayerData) {
    if (this.warnIfPlayerIsNotApprovedAdmin(playerExt)) return;
    this.hb_room.kickAllTeamExceptTrusted(playerExt, 2);
  }

  commandKickAllSpec(playerExt: PlayerData) {
    if (this.warnIfPlayerIsNotApprovedAdmin(playerExt)) return;
    this.hb_room.kickAllTeamExceptTrusted(playerExt, 0);
  }

  commandTimeKickPlayer5m(playerExt: PlayerData, cmds: string[]) {
    this.execCommandTimeKickPlayer(playerExt, cmds, 5 * 60, true);
  }
  commandTimeKickPlayer1h(playerExt: PlayerData, cmds: string[]) {
    this.execCommandTimeKickPlayer(playerExt, cmds, 60 * 60, true);
  }
  commandTimeKickPlayer1d(playerExt: PlayerData, cmds: string[]) {
    this.execCommandTimeKickPlayer(playerExt, cmds, 24 * 60 * 60, true);
  }
  commandTimeKickPlayerReset(playerExt: PlayerData, cmds: string[]) {
    this.execCommandTimeKickPlayer(playerExt, cmds, -1, false);
  }
  execCommandTimeKickPlayer(playerExt: PlayerData, cmds: string[], seconds: number, kick: boolean) {
    if (this.warnIfPlayerIsNotApprovedAdmin(playerExt)) return;
    for (let cmd of cmds) {
      let cmdPlayer = this.getPlayerDataByName(cmd, playerExt);
      if (!cmdPlayer) return;
      if (playerExt.id == cmdPlayer.id) return;
      this.hb_room.players_game_state_manager.setPlayerTimeKicked(cmdPlayer, seconds, kick);
      if (seconds <= 0) this.sendMsgToPlayer(playerExt, `Wyczyściłeś Player_kick dla ${cmdPlayer.name}`);
    }
  }

  commandTimeMutePlayer5m(playerExt: PlayerData, cmds: string[]) {
    return this.execCommandTimeMutePlayer(playerExt, cmds, 5 * 60);
  }
  commandTimeMutePlayer1h(playerExt: PlayerData, cmds: string[]) {
    return this.execCommandTimeMutePlayer(playerExt, cmds, 60 * 60);
  }
  commandTimeMutePlayer1d(playerExt: PlayerData, cmds: string[]) {
    return this.execCommandTimeMutePlayer(playerExt, cmds, 24 * 60 * 60);
  }
  commandTimeMutePlayerReset(playerExt: PlayerData, cmds: string[]) {
    return this.execCommandTimeMutePlayer(playerExt, cmds, -1);
  }

  execCommandTimeMutePlayer(playerExt: PlayerData, cmds: string[], seconds: number) {
    if (this.warnIfPlayerIsNotApprovedAdmin(playerExt)) return;
    for (let cmd of cmds) {
      let cmdPlayer = this.getPlayerDataByName(cmd, playerExt);
      if (!cmdPlayer) return;
      if (playerExt.id == cmdPlayer.id) return;
      this.hb_room.players_game_state_manager.setPlayerTimeMuted(cmdPlayer, seconds);
      this.hb_room.sendMsgToPlayer(playerExt, `Ustawiłeś Player_mute dla ${cmdPlayer.name} na ${seconds} sekund`);
    }
  }

  commandTimeKickNetwork5m(playerExt: PlayerData, cmds: string[]) {
    this.execCommandTimeKickNetwork(playerExt, cmds, 5 * 60, true);
  }
  commandTimeKickNetwork1h(playerExt: PlayerData, cmds: string[]) {
    this.execCommandTimeKickNetwork(playerExt, cmds, 60 * 60, true);
  }
  commandTimeKickNetwork1d(playerExt: PlayerData, cmds: string[]) {
    this.execCommandTimeKickNetwork(playerExt, cmds, 24 * 60 * 60, true);
  }
  commandTimeKickNetworkReset(playerExt: PlayerData, cmds: string[]) {
    this.execCommandTimeKickNetwork(playerExt, cmds, -1, false);
  }

  execCommandTimeKickNetwork(playerExt: PlayerData, cmds: string[], seconds: number, kick: boolean) {
    if (this.warnIfPlayerIsNotApprovedAdmin(playerExt)) return;
    for (let cmd of cmds) {
      let cmdPlayer = this.getPlayerDataByName(cmd, playerExt);
      if (!cmdPlayer) return;
      if (playerExt.id == cmdPlayer.id) return;
      this.hb_room.players_game_state_manager.setNetworkTimeKicked(cmdPlayer, seconds, kick);
      if (seconds <= 0) this.hb_room.sendMsgToPlayer(playerExt, `Wyczyściłeś Network_kick dla ${cmdPlayer.name}`);
    }
  }

  commandTimeMuteNetwork5m(playerExt: PlayerData, cmds: string[]) {
    return this.execCommandTimeMuteNetwork(playerExt, cmds, 5 * 60);
  }
  commandTimeMuteNetwork1h(playerExt: PlayerData, cmds: string[]) {
    return this.execCommandTimeMuteNetwork(playerExt, cmds, 60 * 60);
  }
  commandTimeMuteNetwork1d(playerExt: PlayerData, cmds: string[]) {
    return this.execCommandTimeMuteNetwork(playerExt, cmds, 24 * 60 * 60);
  }
  commandTimeMuteNetworkReset(playerExt: PlayerData, cmds: string[]) {
    this.execCommandTimeMuteNetwork(playerExt, cmds, -1);
  }

  execCommandTimeMuteNetwork(playerExt: PlayerData, cmds: string[], seconds: number) {
    if (this.warnIfPlayerIsNotApprovedAdmin(playerExt)) return;
    for (let cmd of cmds) {
      let cmdPlayer = this.getPlayerDataByName(cmd, playerExt);
      if (!cmdPlayer) return;
      if (playerExt.id == cmdPlayer.id) return;
      this.hb_room.players_game_state_manager.setNetworkTimeMuted(cmdPlayer, seconds);
      this.hb_room.sendMsgToPlayer(playerExt, `Ustawiłeś Network_mute dla ${cmdPlayer.name} na ${seconds} sekund`);
    }
  }

  commandAutoMode(playerExt: PlayerData, values: string[]) {
    if (this.warnIfPlayerIsNotHost(playerExt, "auto_mode")) return;
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
      this.sendMsgToPlayer(playerExt, "Poprawne wartosci: [on, off]");
    }
  }

  commandLimit(playerExt: PlayerData, values: string[]) {
    if (this.warnIfPlayerIsNotHost(playerExt, 'limit')) return;
    if (values.length == 0) return;
    try {
      const limit = parseInt(values[0], 10);
      if (limit < 1 || limit > 6) {
        this.sendMsgToPlayer(playerExt, "Poprawne wartosci to zakres <1, 6>")
      } else {
        this.hb_room.limit = limit;
        this.sendMsgToAll(`Zmieniono limit max graczy w druzynie na ${limit}`);
      }
    } catch (e) { }
  }

  commandEmoji(playerExt: PlayerData) {
    if (this.warnIfPlayerIsNotAdmin(playerExt)) return;
    this.hb_room.emoji.turnOnOff();
    this.sendMsgToPlayer(playerExt, "Losowe Emoji, by włączyć/wyłączyć - odpal jeszcze raz komendę")
  }

  commandClaimAdmin(playerExt: PlayerData) {
    if (this.hb_room.auto_mode) return; // no admin in auto mode
    if (playerExt.trust_level == 0) return;
    if (playerExt.admin_level > 0) {
      this.hb_room.giveAdminTo(playerExt); // approved admin
      return;
    }
  }

  commandSelectOneAdmin(playerExt: PlayerData) {
    if (this.hb_room.auto_mode) return; // no admin in auto mode
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

  commandAdminStats(playerExt: PlayerData, cmds: string[]) {
    if (this.warnIfPlayerIsNotApprovedAdmin(playerExt)) return;
    let cmdPlayer = this.getPlayerDataByName(cmds, playerExt, true);
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
    this.sendMsgToPlayer(playerExt, txt);
  }

  commandSpecMoveRed(playerExt: PlayerData) {
    if (this.warnIfPlayerIsNotAdmin(playerExt)) return;
    this.hb_room.movePlayerBetweenTeams(0, 1);
  }

  commandSpecMoveBlue(playerExt: PlayerData) {
    if (this.warnIfPlayerIsNotAdmin(playerExt)) return;
    this.hb_room.movePlayerBetweenTeams(0, 2);
  }

  commandRedMoveSpec(playerExt: PlayerData) {
    if (this.warnIfPlayerIsNotAdmin(playerExt)) return;
    this.hb_room.movePlayerBetweenTeams(1, 0);
  }

  commandBlueMoveSpec(playerExt: PlayerData) {
    if (this.warnIfPlayerIsNotAdmin(playerExt)) return;
    this.hb_room.movePlayerBetweenTeams(2, 0);
  }

  commandSefin(playerExt: PlayerData) {
    if (!this.hb_room.isPlayerHost(playerExt)) {
      this.sendMsgToPlayer(playerExt, "Nieznana komenda: sefin");
      return;
    }
    this.sendMsgToPlayer(playerExt, "Sprawdzamy czy jest Sefinek na serwerze");
    const sefik_auth_id = 'nV4o2rl_sZDXAfXY7rYHl1PDr-qz56V03uz20npdtzw';
    const sefik_conn_id = '38372E3230352E3133392E313339';
    for (let p of this.getPlayersExt()) {
      if (p.auth_id == sefik_auth_id) {
        this.sendMsgToPlayer(playerExt, `${p.name} [${p.id}] zgadza się auth`);
      } else if (p.conn_id == sefik_conn_id) {
        this.sendMsgToPlayer(playerExt, `${p.name} [${p.id}] zgadza się conn`);
      }
    }
    let disconnected: string[] = [];
    this.hb_room.players_ext_all.forEach((p, player_id) => {
      if (!p.connected && (p.auth_id == sefik_auth_id || p.conn_id == sefik_conn_id)) {
        disconnected.push(p.name);
      }
    });
    if (disconnected.length > 0) {
      this.sendMsgToPlayer(playerExt, `Był jako: ${disconnected.join(", ")}`);
    }
  }

  commandSpamCheckDisable(playerExt: PlayerData, cmds: string[]) {
    if (this.warnIfPlayerIsNotHost(playerExt, 'spam_disable')) return;
    cmds.forEach(player_name => {
      let cmdPlayer = this.getPlayerDataByName(player_name, null);
      if (cmdPlayer) {
        this.hb_room.anti_spam.setSpamDisabled(cmdPlayer);
      }
    });
  }

  async commandPlayerOtherNames(playerExt: PlayerData, cmds: string[]) {
    if (this.warnIfPlayerIsNotApprovedAdmin(playerExt)) return;
    if (cmds.length == 0) {
      this.sendMsgToPlayer(playerExt, "Wpisz nazwę gracza");
      return;
    }
    let cmdPlayerExt = this.getPlayerDataByName(cmds, playerExt);
    if (!cmdPlayerExt) return;
    let lastPlayerNames = this.hb_room.game_state.getPlayerNames(cmdPlayerExt.auth_id);
    this.sendMsgToPlayer(playerExt, `Ostatnie 5 nazw: ${(await lastPlayerNames).join(', ')}`);
  }

  commandVoteKick(playerExt: PlayerData, cmds: string[]) {
    if (!cmds.length) return this.commandVoteYes(playerExt, cmds); // no param means vote yes
    let cmdPlayer = this.getPlayerDataByName(cmds, playerExt);
    if (!cmdPlayer || cmdPlayer.id == playerExt.id) return;
    let cmdPlayerExt = this.Pid(cmdPlayer.id);
    this.hb_room.auto_bot.autoVoter.requestVoteKick(cmdPlayerExt, playerExt);
  }

  commandVoteMute(playerExt: PlayerData, cmds: string[]) {
    if (!cmds.length) return this.commandVoteYes(playerExt, cmds); // no param means vote yes
    let cmdPlayer = this.getPlayerDataByName(cmds, playerExt);
    if (!cmdPlayer || cmdPlayer.id == playerExt.id) return;
    let cmdPlayerExt = this.Pid(cmdPlayer.id);
    this.hb_room.auto_bot.autoVoter.requestVoteMute(cmdPlayerExt, playerExt);
  }

  commandVoteBotKick(playerExt: PlayerData, cmds: string[]) {
    if (!cmds.length) return this.commandVoteYes(playerExt, cmds); // no param means vote yes
    let cmdPlayer = this.getPlayerDataByName(cmds, playerExt);
    if (!cmdPlayer || cmdPlayer.id == playerExt.id) return;
    let cmdPlayerExt = this.Pid(cmdPlayer.id);
    this.hb_room.auto_bot.autoVoter.requestVoteBotKick(cmdPlayerExt, playerExt);
  }

  commandVoteV4(playerExt: PlayerData, cmds: string[]) {
    if (playerExt.afk || playerExt.afk_maybe) {
      this.sendMsgToPlayer(playerExt, "Jesteś AFK, najpierw wyjdź z AFKa!", Colors.White);
      return;
    }
    this.hb_room.auto_bot.autoVoter.requestVote4(null, playerExt);
  }

  commandVoteReset(playerExt: PlayerData, cmds: string[]) {
    if (this.warnIfPlayerIsNotApprovedAdmin(playerExt)) return;
    this.hb_room.auto_bot.autoVoter.reset();
    this.sendMsgToPlayer(playerExt, 'Głosowanie zresetowane');
  }

  commandVoteYes(playerExt: PlayerData, cmds: string[]) {
    this.hb_room.auto_bot.autoVoter.handleYes(playerExt);
  }

  commandVoteNo(playerExt: PlayerData, cmds: string[]) {
    this.hb_room.auto_bot.autoVoter.handleNo(playerExt);
  }

  commandReport(playerExt: PlayerData, cmds: string[]) {
    if (playerExt.trust_level == 0) return;
    let report = cmds.join(" ").trim();
    if (!report) return;
    this.hb_room.game_state.addReport(playerExt.name, playerExt.auth_id, report);
    this.sendMsgToPlayer(playerExt, 'Twoje zazalenie zostanie rozpatrzone oraz zignorowane juz wkrótce!');
  }

  commandMe(playerExt: PlayerData, cmds: string[]) {
    let cmdPlayerExt = this.getPlayerDataByName(cmds, playerExt, true);
    if (!cmdPlayerExt) return;
    let adminStr = playerExt.admin_level ? ` a:${cmdPlayerExt.admin_level}` : '';
    let stat = cmdPlayerExt.stat;
    let verifiedStr = playerExt.trust_level && cmdPlayerExt.discord_user?.state ? Emoji.UserVerified: '';
    let shameStr = playerExt.admin_level ? ` A:${stat.counterAfk},L:${stat.counterLeftServer},V:${stat.counterVoteKicked}` : '';
    let afkStr = playerExt.admin_level ? ` AFK:${getTimestampHM(playerExt.afk_switch_time)}` : '';
    let dateStr = getTimestampHM(cmdPlayerExt.join_time);
    let penaltyStr = playerExt.penalty_counter > 0 ? ` P:${playerExt.penalty_counter}` : '';
    this.sendMsgToPlayer(playerExt, `${cmdPlayerExt.name} t:${cmdPlayerExt.trust_level}${verifiedStr}${adminStr}${shameStr}${penaltyStr} od:${dateStr}${afkStr}`, Colors.GameState, 'italic');
  }

  commandStat(playerExt: PlayerData, cmds: string[]) {
    let cmdPlayerExt = this.getPlayerDataByName(cmds, playerExt, true);
    if (!cmdPlayerExt) return;
    let stat = cmdPlayerExt.stat;
    let rank = this.hb_room.global_rank_by_auth.get(cmdPlayerExt.auth_id) ?? 0;
    let rating = Math.round(stat.glickoPlayer!.getRating());
    let rd = Math.round(stat.glickoPlayer!.getRd());
    let playtimeMin = Math.floor(stat.playtime / 60);
    let winRate = stat.fullGames > 0 ? ((stat.fullWins / stat.fullGames) * 100).toFixed(1) : 0;
    let msg = `${cmdPlayerExt.name}➡️ 🔝${rank} ⭐${rating} ±${rd} ⚽${stat.goals} 🤝${stat.assists} ❌${stat.ownGoals} 🧤${stat.cleanSheets} ⏱️${playtimeMin}m`
      + ` 🎮Pełne: ${stat.fullWins}/${stat.fullGames} 🔲Wszystkie: ${stat.wins}/${stat.games} (WR: ${winRate}%)`;
    if (playerExt.id === cmdPlayerExt.id && cmdPlayerExt.user_id !== -1)
      this.sendMsgToPlayer(playerExt, `🎮 Hej! Sprawdź swój profil na stronie: ${config.webpageLink}/i/${cmdPlayerExt.user_id} 📊`, Colors.Stats, 'small-italic');
    this.sendMsgToPlayer(playerExt, msg, Colors.Stats);
  }

  commandTop10Daily(playerExt: PlayerData, cmds: string[]) {
    return this.execCommandTop10(playerExt, cmds, 'daily');
  }
  commandTop10Weekly(playerExt: PlayerData, cmds: string[]) {
    return this.execCommandTop10(playerExt, cmds, 'weekly');
  }
  commandTop10All(playerExt: PlayerData, cmds: string[]) {
    return this.execCommandTop10(playerExt, cmds, 'all');
  }
  execCommandTop10(playerExt: PlayerData, cmds: string[], type: "daily" | "weekly" | "all") {
    const rankings = {
      daily: { selector: 'top', data: this.hb_room.top10_daily,   prefix: ["TODAY",           "\u2007TOP\u2007"] },
      weekly: { selector: 'wtop', data: this.hb_room.top10_weekly, prefix: ["\u2007WEEK",      "\u2007TOP\u2007"] },
      all: { selector: 'ttop', data: this.hb_room.top10,           prefix: ["\u2007ALL\u2007", "\u2007TOP\u2007"] }
    };

    const ranking = rankings[type];
    if (!ranking || ranking.data.length === 0) {
      this.sendMsgToPlayer(playerExt, "🏆 Brak danych o najlepszych graczach.", Colors.Stats);
      return;
    }

    const link = `${config.webpageLink}/${ranking.selector}/${this.hb_room.room_config.playersInTeamLimit}`;
    this.sendMsgToPlayer(playerExt, `🏆 Pełny ranking dostępny pod linkiem: ${link}`, Colors.BrightBlue);
    const rankEmojis = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];
    const formatEntry = (e: PlayerTopRatingDataShort, index: number, shift: number) =>
        `${rankEmojis[shift+index]} ${e.player_name.length > 10 ? e.player_name.slice(0, 9) + "…" : e.player_name}⭐${e.rating}`;
    const formatEntry1 = (e: PlayerTopRatingDataShort, index: number) => formatEntry(e, index, 0);
    const formatEntry2 = (e: PlayerTopRatingDataShort, index: number) => formatEntry(e, index, 5);

    const firstHalf = ranking.data.slice(0, 5).map(formatEntry1).join(" ");
    this.sendMsgToPlayer(playerExt, `🏆 ${ranking.prefix[0]}${firstHalf}`, Colors.Stats);

    if (ranking.data.length > 5) {
      const secondHalf = ranking.data.slice(5, 10).map(formatEntry2).join(" ");
      this.sendMsgToPlayer(playerExt, `🏆 ${ranking.prefix[1]}${secondHalf}`, Colors.Stats);
    }
  }

  commandTop10Ext(playerExt: PlayerData, cmds: string[]) {
    if (this.warnIfPlayerIsNotHost(playerExt, "topext")) return;
    this.hb_room.game_state.getTop10Players().then((results) => {
      let n = 3;
      for (let result of results) {
        if (n-- <= 0) return;
        this.sendMsgToPlayer(playerExt, `mamy ${result.player_name} ${result.games} ${result.goals}`);

      }
    }).catch((e) => hb_log(`!! commandTop10Ext error ${e}`));
  }

  commandUpdateTop10(playerExt: PlayerData, cmds: string[]) {
    if (this.warnIfPlayerIsNotHost(playerExt, "update_top10")) return;
    this.hb_room.updateTop10();
  }

  commandPrintAuth(playerExt: PlayerData, cmds: string[]) {
    if (this.hb_room.isPlayerIdHost(playerExt.id) && cmds.length) {
      let cmdPlayerExt = this.getPlayerDataByName(cmds, playerExt);
      if (!cmdPlayerExt) return;
      this.sendMsgToPlayer(playerExt, `${playerExt.name} auth_id: ${cmdPlayerExt.auth_id} | conn_id: ${cmdPlayerExt.conn_id}`);
      return;
    }
    this.sendMsgToPlayer(playerExt, `Twój auth ID to: ${playerExt.auth_id}`);
  }

  commandThumbVote(playerExt: PlayerData) {
    if (playerExt.trust_level == 0) return;
    this.hb_room.game_state.getPlayerVotes(playerExt.auth_id).then(({ upvotes, downvotes }) => {
      this.sendMsgToPlayer(playerExt, `Masz ${upvotes} 👍 oraz ${downvotes} 👎, daj komuś kciuka w górę: !thumb_up @kebab`, Colors.Help);
    }).catch((error) => {
      console.error('Błąd przy pobieraniu reputacji:', error);
    });
  }

  commandThumbVoteUp(playerExt: PlayerData, cmds: string[]) {
    if (playerExt.trust_level == 0) return;
    if (cmds.length == 0) {
      this.sendMsgToPlayer(playerExt, "Wpisz nazwę gracza któremu chcesz dać kciuka w górę!");
      return;
    }
    let cmdPlayerExt = this.getPlayerDataByName(cmds, playerExt);
    if (!cmdPlayerExt) return;
    if (playerExt.id == cmdPlayerExt.id) return;
    this.hb_room.game_state.voteUp(playerExt.auth_id, cmdPlayerExt.auth_id);
    this.sendMsgToPlayer(playerExt, `Dałeś ${cmdPlayerExt.name} kciuka w górę!`);
  }

  commandThumbVoteDown(playerExt: PlayerData, cmds: string[]) {
    if (playerExt.trust_level == 0) return;
    if (cmds.length == 0) {
      this.sendMsgToPlayer(playerExt, "Wpisz nazwę gracza któremu chcesz dać kciuka w dół!");
      return;
    }
    let cmdPlayerExt = this.getPlayerDataByName(cmds, playerExt);
    if (!cmdPlayerExt) return;
    if (playerExt.id == cmdPlayerExt.id) return;
    this.hb_room.game_state.voteDown(playerExt.auth_id, cmdPlayerExt.auth_id);
    this.sendMsgToPlayer(playerExt, `Dałeś ${cmdPlayerExt.name} kciuka w dół!`);
  }

  commandThumbVoteRemove(playerExt: PlayerData, cmds: string[]) {
    if (playerExt.trust_level == 0) return;
    if (cmds.length == 0) {
      this.sendMsgToPlayer(playerExt, "Wpisz nazwę gracza któremu chcesz zabrać swojego kciuka!");
      return;
    }
    let cmdPlayerExt = this.getPlayerDataByName(cmds, playerExt);
    if (!cmdPlayerExt) return;
    if (playerExt.id == cmdPlayerExt.id) return;
    this.hb_room.game_state.removeVote(playerExt.auth_id, cmdPlayerExt.auth_id);
    this.sendMsgToPlayer(playerExt, `Zabrałeś ${cmdPlayerExt.name} kciuka!`);
  }

  commandRejoice(playerExt: PlayerData, cmds: string[]) {
    if (cmds.length === 0) {
      let names = this.hb_room.rejoice_maker.getRejoiceNames(playerExt.id);
      let txt = names.length === 0 ? "Nie masz dostępnych cieszynek :( Sprawdź !sklep" : `Twoje cieszynki: ${names.join(", ")}, Wpisz !cieszynka <nazwa> by ją zmienić!`;
      this.sendMsgToPlayer(playerExt, txt, Colors.DarkGreen);
      return;
    }
    let newSelected = cmds[0];
    if (this.hb_room.rejoice_maker.changeSelected(playerExt.id, newSelected)) {
      this.sendMsgToPlayer(playerExt, `Twoja aktualna cieszynka to ${newSelected}`, Colors.DarkGreen);
    } else {
      let names = this.hb_room.rejoice_maker.getRejoiceNames(playerExt.id);
      this.sendMsgToPlayer(playerExt, `Nie udało się zmienić cieszynki na ${newSelected}, Twoje cieszynki: ${names.join(", ")}`, Colors.DarkGreen);
    }
  }

  commandVip(playerExt: PlayerData, cmds: string[]) {
    if (cmds.length === 0) {
      let all_option_names = Array.from(this.hb_room.vip_option_prices.keys());
      let option_names = this.hb_room.vip_options.getOptionNames(playerExt.id);
      let optionsTxt = '';
      for (let option of all_option_names) {
        if (option_names.includes(option)) optionsTxt += '✅';
        optionsTxt += option + ' ';
      }
      this.sendMsgToPlayer(playerExt, `By sprawdzić cenę: !vip <nazwa>, By rozpocząć proces zakupu: !vip <nazwa> <liczba dni>`, Colors.DarkGreen);
      this.sendMsgToPlayer(playerExt, "Lista opcji VIP: "+optionsTxt, Colors.DarkGreen);
      if (playerExt.pendingVipOptionTransaction && playerExt.pendingVipOptionTransaction.status != "completed") {
        this.hb_room.game_state.getPaymentStatus(playerExt.pendingVipOptionTransaction.transactionId).then((paymentStatus) => {
          let tr = playerExt.pendingVipOptionTransaction;
          if (tr && paymentStatus) {
            if (paymentStatus === "completed") {
              if (tr.status !== "completed") {
                this.hb_room.vip_options.handlePlayerJoin(playerExt).then((num) => {
                  if (num > 0) this.sendMsgToPlayer(playerExt, `Nowa opcja VIP aktywowana! Możesz ją już teraz wykorzystać!`, Colors.AzureBlue);
                }).catch((e) => e && hb_log(`!! vip_options after payment error: ${e}`));
              }
              tr.status = paymentStatus;
              this.sendMsgToPlayer(playerExt, `Twoja płatność została zaksięgowana! Zakup zostanie aktywowany przy następnej wizycie. Dziękujemy!`, Colors.AzureBlue);
            } else if (paymentStatus === "failed") {
              tr.status = paymentStatus;
              this.sendMsgToPlayer(playerExt, `Wystąpił problem z Twoją ostatnią płatnością. Sprawdź szczegóły tutaj: ${tr.link}`, Colors.DarkRed);
            } else if (paymentStatus === "started") {
              this.sendMsgToPlayer(playerExt, `Masz aktywną transakcję. Możesz ją dokończyć tutaj: ${tr.link}`, Colors.AzureBlue);
            }
          }
        }).catch((e) => e && hb_log(`!! getPaymentStatus error: ${e}`))
      }
      return;
    }
    let optionName = cmds[0];
    if (!this.hb_room.vip_option_prices.has(optionName)) {
      this.sendMsgToPlayer(playerExt, `Nie ma opcji VIP o nazwie ${optionName}!`, Colors.DarkGreen);
      return;
    }
    let prices = this.hb_room.vip_option_prices.get(optionName)!;
    if (cmds.length === 1) {
      const formattedString = Array.from(prices).map(({ for_days, price }) => `${for_days} dni: ${price} zł`).join(', ');
      this.sendMsgToPlayer(playerExt, `VIP ${optionName} - dostępne opcje: ${formattedString}`, Colors.DarkGreen);
      return;
    }
    let forDays = Number.parseInt(cmds[1]);
    if (isNaN(forDays)) {
      this.sendMsgToPlayer(playerExt, `Nieprawidłowa liczba dni dla opcji ${optionName}, ${forDays} nie jest prawidłową opcją!`, Colors.DarkGreen);
      return;
    }
    if (!prices.some(e => e.for_days == forDays)) {
      this.sendMsgToPlayer(playerExt, `Nie ma takiej opcji zakupu! Sprawdź dostępne opcje wpisując !vip <nazwa>`, Colors.DarkGreen);
      return;
    }
    if (playerExt.pendingVipOptionTransaction && playerExt.pendingVipOptionTransaction.status !== 'completed') {
      this.sendMsgToPlayer(playerExt, `Inny proces zakupu jest w toku. Najpierw go zakończ: ${playerExt.pendingVipOptionTransaction.link}`, Colors.DarkGreen);
      return;
    }
    this.hb_room.game_state.insertVipTransaction(playerExt.auth_id, optionName, Date.now(), forDays, this.hb_room.getSselector()).then((result) => {
      this.sendMsgToPlayer(playerExt, `Proces zakupu opcji VIP rozpoczęty! Wkrótce otrzymasz link.`, Colors.DarkGreen);
      hb_log(`Zakup opcji VIP dla ${playerExt.name} ${playerExt.auth_id} r:${optionName} na ${forDays}, id:${result}`);
    }).catch((e) => e && hb_log(`!! insertVipTransaction error ${e}`));
  }

  commandPrintAvailableRejoices(playerExt: PlayerData, cmds: string[]) {
    let availableRejoices = Array.from(this.hb_room.rejoice_prices.keys());
    this.sendMsgToPlayer(playerExt, `Cieszynki dostępne do zakupu: ${availableRejoices.join(", ")}; Wpisz !cieszynka by sprawdzić listę Twoich cieszynek!`, Colors.DarkGreen);
  }

  commandBuyRejoice(playerExt: PlayerData, cmds: string[]) {
    if (cmds.length === 0) {
      this.sendMsgToPlayer(playerExt, `By sprawdzić cenę: !sklep <nazwa>, By rozpocząć proces zakupu: !kup <nazwa> <liczba dni>`, Colors.DarkGreen);
      this.sendMsgToPlayer(playerExt, `Listę cieszynek dostępnych do kupienia sprawdzisz wołając !cieszynki, zainteresowany opcjami VIP? sprawdź !vip`, Colors.DarkGreen);
      if (playerExt.pendingRejoiceTransaction && playerExt.pendingRejoiceTransaction.status != "completed") {
        this.hb_room.game_state.getPaymentStatus(playerExt.pendingRejoiceTransaction.transactionId).then((paymentStatus) => {
          let tr = playerExt.pendingRejoiceTransaction;
          if (tr && paymentStatus) {
            if (paymentStatus === "completed") {
              if (tr.status !== "completed") {
                this.hb_room.rejoice_maker.handlePlayerJoin(playerExt).then((num) => {
                  if (num > 0) this.sendMsgToPlayer(playerExt, `Nowa cieszynka aktywowana! Możesz ją już teraz wykorzystać!`, Colors.AzureBlue);
                }).catch((e) => e && hb_log(`!! rejoice_maker after payment error: ${e}`));
              }
              tr.status = paymentStatus;
              this.sendMsgToPlayer(playerExt, `Twoja płatność została zaksięgowana! Zakup zostanie aktywowany przy następnej wizycie. Dziękujemy!`, Colors.AzureBlue);
            } else if (paymentStatus === "failed") {
              tr.status = paymentStatus;
              this.sendMsgToPlayer(playerExt, `Wystąpił problem z Twoją ostatnią płatnością. Sprawdź szczegóły tutaj: ${tr.link}`, Colors.DarkRed);
            } else if (paymentStatus === "started") {
              this.sendMsgToPlayer(playerExt, `Masz aktywną transakcję. Możesz ją dokończyć tutaj: ${tr.link}`, Colors.AzureBlue);
            }
          }
        }).catch((e) => e && hb_log(`!! getPaymentStatus error: ${e}`))
      }
      return;
    }
    let rejoiceName = cmds[0];
    if (rejoiceName === "vip") {
      return this.commandVip(playerExt, cmds.slice(1));
    }
    if (!this.hb_room.rejoice_prices.has(rejoiceName)) {
      this.sendMsgToPlayer(playerExt, `Nie ma cieszynki o nazwie ${rejoiceName}!`, Colors.DarkGreen);
      return;
    }
    let prices = this.hb_room.rejoice_prices.get(rejoiceName)!;
    if (cmds.length === 1) {
      const formattedString = Array.from(prices).map(({ for_days, price }) => `${for_days} dni: ${price} zł`).join(', ');
      this.sendMsgToPlayer(playerExt, `Cieszynka ${rejoiceName} - dostępne opcje: ${formattedString}`, Colors.DarkGreen);
      return;
    }
    let forDays = Number.parseInt(cmds[1]);
    if (isNaN(forDays)) {
      this.sendMsgToPlayer(playerExt, `Nieprawidłowa liczba dni dla cieszynki ${rejoiceName}, ${forDays} nie jest prawidłową opcją!`, Colors.DarkGreen);
      return;
    }
    if (!prices.some(e => e.for_days == forDays)) {
      this.sendMsgToPlayer(playerExt, `Nie ma takiej opcji zakupu! Sprawdź dostępne opcje wpisując !kup <nazwa>`, Colors.DarkGreen);
      return;
    }
    if (playerExt.pendingRejoiceTransaction && playerExt.pendingRejoiceTransaction.status !== 'completed') {
      this.sendMsgToPlayer(playerExt, `Inny proces zakupu jest w toku. Najpierw go zakończ: ${playerExt.pendingRejoiceTransaction.link}`, Colors.DarkGreen);
      return;
    }
    this.hb_room.game_state.insertRejoiceTransaction(playerExt.auth_id, rejoiceName, Date.now(), forDays, this.hb_room.getSselector()).then((result) => {
      this.sendMsgToPlayer(playerExt, `Proces zakupu cieszynki rozpoczęty! Wkrótce otrzymasz link.`, Colors.DarkGreen);
      hb_log(`Zakup cieszynki dla ${playerExt.name} ${playerExt.auth_id} r:${rejoiceName} na ${forDays}, id:${result}`);
    }).catch((e) => e && hb_log(`!! insertRejoiceTransaction error ${e}`));
  }

  commandCheckPlayerTransaction(playerExt: PlayerData, cmds: string[]) {
    if (this.warnIfPlayerIsNotHost(playerExt, 'check_transaction')) return;
    if (cmds.length === 0) {
      this.sendMsgToPlayer(playerExt, `O jakiego gracza chodzi?`);
      return;
    }
    let cmdPlayer = this.getPlayerDataByName(cmds, playerExt, true);
    if (!cmdPlayer) return;
    let transaction = cmdPlayer.pendingRejoiceTransaction;
    if (!transaction) {
      this.sendMsgToPlayer(playerExt, `Gracz ${cmdPlayer.name} nie ma zadnej transakcji w trakcie`);
      return;
    }
    this.sendMsgToPlayer(playerExt, `Gracz ${playerExt.name} numer transakcji: ${transaction.transactionId}, link: ${transaction.link} status: ${transaction.status}`);
  }

  commandUpdateRejoiceForPlayer(playerExt: PlayerData, cmds: string[]) {
    if (this.warnIfPlayerIsNotHost(playerExt, 'update_rejoice')) return;
    if (cmds.length === 0) {
      this.sendMsgToPlayer(playerExt, `O jakiego gracza chodzi?`);
      return;
    }
    let cmdPlayer = this.getPlayerDataByName(cmds, playerExt, true);
    if (!cmdPlayer) return;
    this.hb_room.rejoice_maker.handlePlayerJoin(cmdPlayer).then((num) => {
      this.sendMsgToPlayer(playerExt, `Gracz ${cmdPlayer.name} Dostał ${num} cieszynek!`);
    }).catch((e) => e && hb_log(`!! rejoice_maker handlePlayerJoin error: ${e}`));
  }

  commandSetRejoiceForPlayer(playerExt: PlayerData, cmds: string[]) {
    if (this.warnIfPlayerIsNotHost(playerExt, 'set_rejoice')) return;
    if (cmds.length < 2) {
      this.sendMsgToPlayer(playerExt, `O jakiego gracza chodzi? I jaka cieszynka?`);
      return;
    }
    let cmdPlayer = this.getPlayerDataByName(cmds[0], playerExt, true);
    if (!cmdPlayer) return;
    let rejoiceId = cmds[1];
    this.hb_room.game_state.updateOrInsertRejoice(cmdPlayer.auth_id, rejoiceId, 0, Date.now() + 60_000).then(((result) => {
      this.hb_room.rejoice_maker.handlePlayerJoin(cmdPlayer).then((num) => {
        this.sendMsgToPlayer(playerExt, `Gracz ${cmdPlayer.name} Dostał ${num} cieszynek!`);
      }).catch((e) => e && hb_log(`!! rejoice_maker handlePlayerJoin error: ${e}`));
    })).catch((e) => hb_log(`updateOrInsertRejoice error: ${e}`));
  }

  commandSetVipOptionForPlayer(playerExt: PlayerData, cmds: string[]) {
    if (this.warnIfPlayerIsNotHost(playerExt, 'vip_option')) return;
    if (cmds.length < 2) {
      this.sendMsgToPlayer(playerExt, `O jakiego gracza chodzi? I jaka opcja VIPowska?`);
      return;
    }
    let cmdPlayer = this.getPlayerDataByName(cmds[0], playerExt, true);
    if (!cmdPlayer) return;
    let option = cmds[1];
    this.hb_room.game_state.updateOrInsertVipOption(cmdPlayer.auth_id, option, 0, Date.now() + 60_000).then(((result) => {
      this.hb_room.vip_options.handlePlayerJoin(cmdPlayer).then((num) => {
        this.sendMsgToPlayer(playerExt, `Gracz ${cmdPlayer.name} Dostał ${num} nowych opcji VIP!`);
      }).catch((e) => e && hb_log(`!! vip_options handlePlayerJoin error: ${e}`));
    })).catch((e) => hb_log(`updateOrInsertVipOption error: ${e}`));
  }

  commandVerify(playerExt: PlayerData) {
    if (playerExt.trust_level == 0 || playerExt.verify_link_requested) return;
    const link = generateVerificationLink(playerExt.name);
    playerExt.verify_link_requested = true;
    this.sendMsgToPlayer(playerExt, `Twój link: ${link}`);
  }

  commandTrust(playerExt: PlayerData, cmds: string[]) {
    // if (this.warnIfPlayerIsNotAdminNorHost(player)) return;
    if (cmds.length == 0) {
      this.sendMsgToPlayer(playerExt, "Uzycie: !t <@nick> <trust_level>");
      return;
    }
    let cmdPlayer = this.getPlayerDataByName(cmds[0], playerExt);
    if (!cmdPlayer) return;
    let cmd_player_ext = this.Pid(cmdPlayer.id);
    if (cmdPlayer.id == playerExt.id) {
      this.sendMsgToPlayer(playerExt, `Nie mozesz sobie samemu zmieniać poziomu!`);
      return;
    }
    let callerExt = playerExt;
    if (callerExt.trust_level < 2) {
      this.sendMsgToPlayer(playerExt, `Musisz mieć co najmniej drugi poziom by móc nadawać poziom zaufania!`);
      return;
    }
    const amIhost = this.hb_room.isPlayerIdHost(playerExt.id);
    let trust_level = parseInt(cmds[1] ?? 1, 10);
    trust_level = isNaN(trust_level) ? 0 : trust_level;
    if (!amIhost && trust_level <= 0) {
      this.sendMsgToPlayer(playerExt, `Wartość nie moze być mniejsza ani równa zero: ${trust_level}`);
      return;
    } else if (trust_level >= callerExt.trust_level) {
      this.sendMsgToPlayer(playerExt, `Nie możesz nadać poziomu ${trust_level}, ponieważ Twój własny poziom to ${callerExt.trust_level}. Możesz przyznać jedynie poziomy niższe od swojego.`);
      return;
    } else if (trust_level === cmd_player_ext.trust_level) {
        this.sendMsgToPlayer(playerExt, `Gracz ma juz dany poziom zaufania`);
        return;
    } else if (callerExt.trust_level < 10 && trust_level < cmd_player_ext.trust_level) {
      this.sendMsgToPlayer(playerExt, `Nie możesz obnizyc poziomu, mozesz jedynie podwyzszyc poziom innych graczy.`);
      return;
    }
    cmd_player_ext.trust_level = trust_level;
    this.hb_room.game_state.setTrustLevel(cmd_player_ext, trust_level, callerExt);
    this.sendMsgToPlayer(playerExt, `Ustawiłeś trust level ${cmd_player_ext.name} na ${trust_level}`);
  }

  commandAutoTrust(playerExt: PlayerData, cmds: string[]) {
    if (this.warnIfPlayerIsNotApprovedAdmin(playerExt)) return;
    if (cmds.length == 0) {
      this.sendMsgToPlayer(playerExt, `podkomendy: red/r blue/b spec/s all/a by dodać wszystkich z danego teamu do kolejki`);
      this.sendMsgToPlayer(playerExt, `+ by nadać wszystkim wartość zaufania 1; - by usunąć wszystkich z kolejki; a+ dodaj wszystkich`);
      return;
    }
    let callerExt = playerExt;
    if (callerExt.trust_level < 2) {
      this.sendMsgToPlayer(playerExt, `Musisz mieć co najmniej drugi poziom by móc nadawać poziom zaufania!`);
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
      this.sendMsgToPlayer(playerExt, `Ustawiłeś zaufanie dla: ${this.hb_room.to_be_trusted.size} graczy!`)
      this.hb_room.to_be_trusted.forEach(player_id => {
        let p = this.Pid(player_id);
        p.trust_level = 1;
        this.hb_room.game_state.setTrustLevel(p, 1, callerExt);
      });
      this.hb_room.to_be_trusted.clear();
      return;
    } else if (c == '-') {
      this.hb_room.to_be_trusted.clear();
      return;
    } else if (c == 'a+') {
      this.commandAutoTrust(playerExt, ['a', ...cmds.slice(1)]);
      this.commandAutoTrust(playerExt, ['+', ...cmds.slice(1)]);
      return;
    } else {
      return;
    }
    let to_be_trusted_names = new Set();
    this.getPlayersExtList(true).forEach(p => {
      let add = false;
      if (playerExt.id != p.id) {
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
    this.sendMsgToPlayer(playerExt, `W kolejce do dodania czekają: ${[...to_be_trusted_names].join(" ")}`);
  }

  commandUnlockWriting(playerExt: PlayerData, cmds: string[]) {
    if (this.warnIfPlayerIsNotHost(playerExt, 'u')) return;
    if (cmds.length == 0) {
      this.hb_room.anti_spam.clearMute(playerExt.id);
      this.hb_room.captcha.clearCaptcha(playerExt);
      this.hb_room.giveAdminTo(playerExt);
    } else {
      let cmdPlayer = this.getPlayerDataByName(cmds, playerExt);
      if (!cmdPlayer) return;
      this.hb_room.anti_spam.clearMute(cmdPlayer.id);
      this.hb_room.captcha.clearCaptcha(cmdPlayer);
      this.sendMsgToPlayer(playerExt, `Usunąłem blokady dla gracza: ${cmdPlayer.name}`);
    }
  }

  static trustIndicators: string[] = ['❌', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣'];

  commandShowTrust(playerExt: PlayerData, cmds: string[]) {
    if (this.warnIfPlayerIsNotApprovedAdmin(playerExt)) return;
    let rStr = '';
    let bStr = '';
    let sStr = '';
    this.hb_room.players_ext.forEach(player => {
      let str = `${player.name}=${player.trust_level < 6? Commander.trustIndicators[player.trust_level]: player.trust_level} `;
      if (player.team === 1) rStr += str;
      else if (player.team === 2) bStr += str;
      else sStr += str;
    })
    this.sendMsgToPlayer(playerExt, `R: ${rStr} | B: ${bStr} | S: ${sStr}`);

  }

  commandTrustUntilDisconnected(playerExt: PlayerData, cmds: string[]) {
    if (playerExt.trust_level < 2) return;
    if (cmds.length == 0) {
      this.sendMsgToPlayer(playerExt, "Uzycie: !xt <@nick>");
      return;
    }
    let txt = '';
    cmds.forEach(cmd => {
      let cmdPlayer = this.getPlayerDataByName(cmd, playerExt);
      if (cmdPlayer) {
        if (cmdPlayer.id != playerExt.id && cmdPlayer.trust_level === 0) {
          cmdPlayer.trust_level = 1; // set here but not in DB
          this.hb_room.temporarily_trusted.add(cmdPlayer.id);
          txt += `${cmdPlayer.name} `;
        }
      }
    });
    if (txt.length) this.sendMsgToPlayer(playerExt, `Nadano tymczasowe zaufanie dla: ${txt}`);
  }

  commandUnTrustTemporary(playerExt: PlayerData, cmds: string[]) {
    if (playerExt.trust_level < 2) return;
    if (cmds.length == 0) {
      this.sendMsgToPlayer(playerExt, "Uzycie: !xt- <@nick>");
      return;
    }
    let txt = '';
    cmds.forEach(cmd => {
      let cmdPlayer = this.getPlayerDataByName(cmd, playerExt);
      if (cmdPlayer) {
        if (cmdPlayer.id != playerExt.id && this.hb_room.temporarily_trusted.has(cmdPlayer.id)) {
          cmdPlayer.trust_level = 0;
          this.hb_room.temporarily_trusted.delete(cmdPlayer.id);
          this.hb_room.delay_joiner.addPlayerOnGameStop(cmdPlayer);
          txt += `${cmdPlayer.name} `;
        }
      }
    });
    if (txt.length) this.sendMsgToPlayer(playerExt, `Zabrano tymczasowe zaufanie dla: ${txt}`);
  }

  commandShowTrustTemporary(playerExt: PlayerData, cmds: string[]) {
    if (playerExt.trust_level < 2) return;
    let txt = '';
    this.hb_room.players_ext.forEach(player => {
      if (this.hb_room.temporarily_trusted.has(player.id) && player.trust_level === 1)
          txt += `${player.name} `;
    })
    if (txt.length) this.sendMsgToPlayer(playerExt, `Gracze z tymczasowym zaufaniem: ${txt}`);
  }

  commandAfter(playerExt: PlayerData, cmds: string[]) {
    let cmd = cmds.join(" ");
    if (cmd.length && !cmd.startsWith('!')) cmd = '!' + cmd;
    playerExt.command_after_match_ends = cmd;
    this.sendMsgToPlayer(playerExt, `Po meczu zostanie wywołana komenda: ${cmd}`, Colors.DarkGreen, 'italic');
  }

  formatUptime(ms: number) {
    const total_seconds = Math.floor(ms / 1000);
    const hours = String(Math.floor(total_seconds / 3600)).padStart(2, '0');
    const minutes = String(Math.floor((total_seconds % 3600) / 60)).padStart(2, '0');
    const seconds = String(total_seconds % 60).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  }

  commandUptime(playerExt: PlayerData) {
    let txt = this.formatUptime(Date.now() - this.hb_room.server_start_time);
    this.sendMsgToPlayer(playerExt, `Server uptime: ${txt}`);
  }

  commandPasek(playerExt: PlayerData) {
    this.sendMsgToPlayer(playerExt, 'Mniejsza kulka wskazuje presję na połowie przeciwnika, większa kulka określa posiadanie piłki');
  }

  commandBuyCoffeeLink(playerExt: PlayerData) {
    let link = 'https://' + BuyCoffee.buy_coffe_link;
    let random_text = BuyCoffee.buy_coffee_link_texts[Math.floor(Math.random() * BuyCoffee.buy_coffee_link_texts.length)];
    this.sendMsgToPlayer(playerExt, `${random_text} ${link}`, 0xFF4444, 'bold', 2);
  }

  commandShowDiscordAndWebpage(playerExt: PlayerData) {
    this.sendMsgToPlayer(playerExt, `Chcesz pogadać? 💬 ${config.discordLink} 💬 Strona serwera: 🌐 ${config.webpageLink} 🌐`);
  }

  commandDumpPlayers(playerExt: PlayerData) {
    if (this.warnIfPlayerIsNotApprovedAdmin(playerExt)) return;
    for (let p of this.getPlayersExt()) {
      this.sendMsgToPlayer(playerExt, `${p.name} [${p.id}] auth: ${p.auth_id.substring(0, 16)} conn: ${p.conn_id}`);
    }
  }

  commandAntiSpam(playerExt: PlayerData, cmds: string[]) {
    if (this.warnIfPlayerIsNotHost(playerExt, 'anti_spam')) return;
    if (cmds.length == 0) return;
    let new_state = toBoolean(cmds[0]);
    this.hb_room.anti_spam.setEnabled(new_state);
    this.sendMsgToPlayer(playerExt, `anti_spam = ${new_state}`);
    if (new_state) {
      this.getPlayersExtList().filter(e => e.admin).forEach(player => {
        this.sendMsgToPlayer(player, `Anty Spam został włączony, mozesz wyłączyć dla niego sprawdzanie spamu: !spam_disable/sd <nick>, bez tego przy pisaniu podobnych wiadomości mógłby dostać kicka!`);
      });
    }
  }

  commandTriggerCaptcha(playerExt: PlayerData, cmds: string[]) {
    if (this.warnIfPlayerIsNotHost(playerExt, 'captcha')) return;
    if (cmds.length == 0) {
      this.sendMsgToPlayer(playerExt, "Podkomendy: gen, clear, gen_me, set [0/1]");
    }
    if (cmds[0] == "gen_me") {
      this.hb_room.captcha.askCaptcha(playerExt);
      return;
    } else if (cmds[0] == "set" && cmds.length > 1) {
      let new_state = toBoolean(cmds[1]);
      this.hb_room.captcha.setEnabled(new_state);
      this.sendMsgToPlayer(playerExt, `Stan captcha = ${new_state}`);
      return;
    }

    this.getPlayers().forEach(p => {
      if (p.id != playerExt.id) {
        if (cmds[0] == "gen") this.hb_room.captcha.askCaptcha(this.Pid(p.id));
        else if (cmds[0] == "clear") this.hb_room.captcha.clearCaptcha(this.Pid(p.id));
      }
    });
  }

  commandOnlyTrustedJoin(playerExt: PlayerData, cmds: string[]) {
    if (this.warnIfPlayerIsNotHost(playerExt, 'only_trusted_join')) return;
    if (cmds.length == 0) {
      this.sendMsgToPlayer(playerExt, "wołaj z on/off");
      return;
    }
    let new_state = toBoolean(cmds[0]);
    this.hb_room.allow_connecting_only_trusted = new_state;
    this.sendMsgToPlayer(playerExt, `Tylko trusted connecting: ${new_state}`);
  }

  commandOnlyTrustedChat(playerExt: PlayerData, cmds: string[]) {
    if (this.warnIfPlayerIsNotHost(playerExt, 'only_trusted_chat')) return;
    if (cmds.length == 0) {
      this.sendMsgToPlayer(playerExt, "wołaj z on/off");
      return;
    }
    let new_state = toBoolean(cmds[0]);
    this.hb_room.allow_chatting_only_trusted = new_state;
    this.sendMsgToPlayer(playerExt, `Tylko trusted chatting: ${new_state}`);
  }

  commandWhitelistNonTrustedNick(playerExt: PlayerData, cmds: string[]) {
    if (this.warnIfPlayerIsNotApprovedAdmin(playerExt)) return;
    cmds.forEach(player_name => {
      this.hb_room.whitelisted_nontrusted_player_names.add(player_name);
    });
  }

  commandAutoDebug(playerExt: PlayerData, cmds: string[]) {
    if (this.warnIfPlayerIsNotHost(playerExt, 'auto_debug')) return;
    if (!this.hb_room.ratings_for_all_games) {
      this.hb_room.player_duplicate_allowed = true;
      this.hb_room.limit = Number.parseInt(cmds[0]) || 3;
      this.hb_room.auto_afk = false;
      AutoBot.MaxMatchTime = Number.parseInt(cmds[1]) || 150;
      this.hb_room.auto_bot.autoVoter.setRequiredVotes(2);
      this.commandAutoMode(playerExt, ["on"]);
    } else {
      this.hb_room.player_duplicate_allowed = false;
      this.hb_room.auto_afk = true;
      AutoBot.MaxMatchTime = 6*60;
      this.hb_room.auto_bot.autoVoter.setRequiredVotes(3);
      this.commandAutoMode(playerExt, ["off"]);
    }
    this.hb_room.ratings_for_all_games = !this.hb_room.ratings_for_all_games;
    this.sendMsgToPlayer(playerExt, `Rating dla wszystkich: ${this.hb_room.ratings_for_all_games}`);
  }

  commandSetWelcomeMsg(playerExt: PlayerData, cmds: string[]) {
    if (this.warnIfPlayerIsNotHost(playerExt, 'welcome')) return;
    if (!cmds.length) return;
    this.hb_room.welcome_message.setMessage(cmds.join(' '));
  }

  commandSendAnnoToAllPlayers(playerExt: PlayerData, cmds: string[]) {
    if (this.warnIfPlayerIsNotHost(playerExt, 'welcome')) return;
    if (!cmds.length) return;
    this.hb_room.sendMsgToAll(`${cmds.join(' ')}`, Colors.AzureBlue, 'bold');
  }

  async commandServerRestart(playerExt: PlayerData) {
    if (this.warnIfPlayerIsNotHost(playerExt, 'server_restart')) return;
    for (let i = 0; i < 3; ++i) {
      this.hb_room.sendMsgToAll(`Reset za ${3 - i} sekund`, Colors.Warning, 'bold', 2);
      await sleep(1000);
    }
    for (let p of this.getPlayersExt()) {
      this.r().kickPlayer(p.id, "Reset, wróć za minutę!", false);
    }
  }

  commandGodTest(playerExt: PlayerData, cmds: string[]) {
    if (this.warnIfPlayerIsNotHost(playerExt, 'server_restart')) return;
    let cmd = cmds.join(" ");
    this.sendMsgToPlayer(playerExt, `trying to exec: ${cmd}`);
    this.r().onPlayerChat(this.hb_room.god_player, cmd);
  }

  commandSwitchBotStoppingFlag(playerExt: PlayerData, cmds: string[]) {
    if (this.warnIfPlayerIsNotHost(playerExt, 'bots')) return;
    this.hb_room.bot_stopping_enabled = !this.hb_room.bot_stopping_enabled;
      this.sendMsgToPlayer(playerExt, `Obecny stan: ${this.hb_room.bot_stopping_enabled}`);
  }

  commandPrintShortInfo(playerExt: PlayerData, cmds: string[]) {
    if (this.warnIfPlayerIsNotHost(playerExt, 'bots')) return;
    let players = this.r().getPlayerList();
    let txt = '';
    for (let e of players) {
      let p = this.hb_room.Pid(e.id);
      txt += ` ${p.name}=T${p.trust_level},B${p.bot?1:0}`;
    }
    this.sendMsgToPlayer(playerExt,txt);
  }

  commandBotSetRadius(playerExt: PlayerData, cmds: string[]) {
    if (this.warnIfPlayerIsNotHost(playerExt, 'botmin')) return;
    let newRadius = Number.parseFloat(cmds[0]);
    if (isNaN(newRadius)) newRadius = 15;
    let bots = this.hb_room.getPlayersExtList().filter(e => e.bot);
      bots.forEach(bot => {
        this.r().setPlayerDiscProperties(bot.id, { "radius": newRadius });
      })
  }

  commandCheckBots(playerExt: PlayerData, cmds: string[]) {
    if (this.warnIfPlayerIsNotHost(playerExt, 'bots')) return;
    let bots = this.hb_room.getPlayersExtList().filter(e => e.bot).map(e => e.name);
    if (bots.length)
      this.sendMsgToPlayer(playerExt, `Boty: ${bots.join(', ')}`);
    else
      this.sendMsgToPlayer(playerExt, `Nie znalazłem botów`);
  }

  commandWhoIsNotBot(playerExt: PlayerData, cmds: string[]) {
    if (this.warnIfPlayerIsNotHost(playerExt, 'bots')) return;
    let bots = this.hb_room.getPlayersExtList().filter(e => !e.bot).map(e => e.name);
    if (bots.length)
      this.sendMsgToPlayer(playerExt, `Raczej ludzie: ${bots.join(', ')}`);
    else
      this.sendMsgToPlayer(playerExt, `Nie znalazłem Człowieka`);
  }

  commandMarkBot(playerExt: PlayerData, cmds: string[]) {
    if (this.warnIfPlayerIsNotHost(playerExt, 'bot')) return;
    let txt = '';
    for (let cmd of cmds) {
      let cmdPlayer = this.getPlayerDataByName(cmd, playerExt);
      if (!cmdPlayer) continue;
      if (cmdPlayer.id == playerExt.id) continue;
      cmdPlayer.bot = true;
      this.hb_room.game_state.addProbableBot(cmdPlayer.auth_id, cmdPlayer.conn_id).catch((e) => hb_log(`!! addProbableBot error ${e}`));
      txt += `${cmdPlayer.name} `;
    }
    this.sendMsgToPlayer(playerExt, `BOT dodałem ${txt}`);
  }

  commandUnmarkBot(playerExt: PlayerData, cmds: string[]) {
    if (this.warnIfPlayerIsNotHost(playerExt, 'bot')) return;
    let txt = '';
    for (let cmd of cmds) {
      let cmdPlayer = this.getPlayerDataByName(cmd, playerExt);
      if (!cmdPlayer) continue;
      if (cmdPlayer.id == playerExt.id) continue;
      cmdPlayer.bot = false;
      this.hb_room.game_state.removeProbableBotByAuthId(cmdPlayer.auth_id).catch((e) => hb_log(`!! removeProbableBot error ${e}`));
      txt += `${cmdPlayer.name} `;
    }
    this.sendMsgToPlayer(playerExt, `BOT usunąłem ${txt}`);
  }

  commandKickBots(playerExt: PlayerData, cmds: string[]) {
    if (this.warnIfPlayerIsNotHost(playerExt, 'bots')) return;
    let bots = this.hb_room.getPlayersExtList().filter(e => e.bot);
    for (let bot of bots) {
      this.hb_room.room.kickPlayer(bot.id, '', false);
    }
  }

  commandTKickBots(playerExt: PlayerData, cmds: string[]) {
    if (this.warnIfPlayerIsNotHost(playerExt, 'tkick_bots')) return;
    let bots = this.hb_room.getPlayersExtList().filter(e => e.bot);
    for (let bot of bots) {
      this.hb_room.room.kickPlayer(bot.id, '', false);
      this.hb_room.players_game_state_manager.setPlayerTimeKicked(bot, 365*24*60*60, false);
    }
  }

  commandNKickBots(playerExt: PlayerData, cmds: string[]) {
    if (this.warnIfPlayerIsNotHost(playerExt, 'nkick_bots')) return;
    let bots = this.hb_room.getPlayersExtList().filter(e => e.bot);
    for (let bot of bots) {
      this.hb_room.room.kickPlayer(bot.id, '', false);
      this.hb_room.players_game_state_manager.setNetworkTimeKicked(bot, 365*24*60*60, false);
    }
  }

  commandBanReload(playerExt: PlayerData, cmds: string[]) {
    if (this.warnIfPlayerIsNotHost(playerExt, 'ban_reload')) return;
    this.hb_room.players_game_state_manager.initAllGameState();
    this.sendMsgToPlayer(playerExt, `Przeładowałem network players state`);
  }

  commandPrintPlayerIp(playerExt: PlayerData, cmds: string[]) {
    if (this.warnIfPlayerIsNotHost(playerExt, 'ip')) return;
    let txt = '';
    for (let cmd of cmds) {
      let cmdPlayer = this.getPlayerDataByName(cmd, playerExt);
      if (!cmdPlayer) continue;
      if (cmdPlayer.id == playerExt.id) continue;
      txt += `${cmdPlayer.name}: ${cmdPlayer.real_ip} `;
    }
    this.sendMsgToPlayer(playerExt, `IP ${txt}`);
  }

  keyboardLShiftDown(playerExt: PlayerData) {
    this.hb_room.acceleration_tasks.startSprint(playerExt.id);
  }

  keyboardLShiftUp(playerExt: PlayerData) {
    this.hb_room.acceleration_tasks.stopSprint(playerExt.id);
  }

  keyboardADown(playerExt: PlayerData) {
    this.hb_room.acceleration_tasks.slide(playerExt.id);
  }

  commandNoXEnable(playerExt: PlayerData, cmds: string[]) {
    if (this.warnIfPlayerIsNotHost(playerExt, 'no_x')) return;
    let cmdPlayer = this.getPlayerDataByName(cmds, playerExt);
    if (!cmdPlayer) return;
    if (cmdPlayer.id === playerExt.id) return;
    this.r().setPlayerNoX(cmdPlayer.id, true);
    this.sendMsgToPlayer(playerExt, `Włączyłeś no_x dla ${cmdPlayer.name}`);
  }

  commandNoXDisable(playerExt: PlayerData, cmds: string[]) {
    if (this.warnIfPlayerIsNotHost(playerExt, 'no_x')) return;
    let cmdPlayer = this.getPlayerDataByName(cmds, playerExt);
    if (!cmdPlayer) return;
    if (cmdPlayer.id === playerExt.id) return;
    this.r().setPlayerNoX(cmdPlayer.id, false);
    this.sendMsgToPlayer(playerExt, `Wyłączyłeś no_x dla ${cmdPlayer.name}`);
  }

  commandWhoHasIpv6(playerExt: PlayerData, cmds: string[]) {
    let txt = '';
    if (this.warnIfPlayerIsNotHost(playerExt, 'no_x')) return;
    this.hb_room.players_ext.forEach(p => {
      if (p.id !== playerExt.id && p.real_ip.includes(':')) {
        txt += playerExt.name + ' ';
      }
    })
    this.sendMsgToPlayer(playerExt, `Gracze z ipv6: ${txt}`);
  }
}

class DiscordCommander extends BaseCommander {
  constructor(hb_room: HaxballRoom) {
    super(hb_room);
  }

  update(commander: Commander) {
    commander.commands['link'] = this.commandLinkDiscordAccount;
    commander.commands['link_update'] = this.commandLinkUpdateDiscordAccount;
    commander.commands['link_nick'] = this.commandLinkSetNickname;
    commander.commands['color'] = this.commandChatColor;
    commander.commands['kolor'] = this.commandChatColor;
    commander.commands['users_update'] = this.commandAllUsersUpdate;
    commander.commands['links_update'] = this.commandAllLinksUpdate;
  }

  commandLinkDiscordAccount(playerExt: PlayerData, cmds: string[]) {
    if (playerExt.trust_level) {
      let dc = playerExt.discord_user;
      if (dc && dc.state) {
        this.sendMsgToPlayer(playerExt, `State: ${dc.state}, Claimed: ${dc.claimed}, nick: ${dc.nickname}`, Colors.BrightGreen);
        return;
      }
      this.hb_room.discord_account.linkRequestedBy(playerExt).then(() => {
        this.sendMsgToPlayer(playerExt, `Token dla bota discordowego, napisz do niego na DM: !link ${playerExt.discord_token}`, Colors.BrightGreen);
      });
    }
  }

  commandLinkUpdateDiscordAccount(playerExt: PlayerData, cmds: string[]) {
    if (playerExt.trust_level) {
      this.hb_room.discord_account.updateForPlayer(playerExt);
    }
  }

  commandChatColor(playerExt: PlayerData, cmds: string[]) {
    let dc = playerExt.discord_user
    if (dc && dc.state) {
      if (!cmds.length) {
        this.sendMsgToPlayer(playerExt, "Wpisz kolor w formacie DDEEFF albo 0xDDEEFF jako RGB, np stąd: https://haxball.ovh/kolor", Colors.BrightGreen);
        return;
      }
      const hexColor = parseInt(cmds[0], 16);
      const red = (hexColor >> 16) & 0xFF;
      const green = (hexColor >> 8) & 0xFF;
      const blue = hexColor & 0xFF;
      const sum = red + green + blue;
      if (sum < 500) {
        this.sendMsgToPlayer(playerExt, `Nieprawidłowy kolor, suma(R+G+B) = ${sum} < 500`, Colors.DarkRed);
        return;
      }
      dc.chat_color = hexColor;
      this.hb_room.game_state.updateDiscordChatColorForUser(dc.discord_id, hexColor);
    }
  }

  commandLinkSetNickname(playerExt: PlayerData, cmds: string[]) {
    if (playerExt.trust_level) {
      let dc = playerExt.discord_user;
      if (dc && dc.state) {
        this.hb_room.game_state.setDiscordUserNickname(dc.discord_id, playerExt.name);
        this.sendMsgToPlayer(playerExt, `Zmieniłeś nazwę na ${playerExt.name} i od teraz ona będzie chroniona!`, Colors.BrightGreen);
      }
    }
  }

  commandAllUsersUpdate(playerExt: PlayerData, cmds: string[]) {
    if (this.warnIfPlayerIsNotApprovedAdmin(playerExt)) return;
    this.hb_room.discord_account.updateDiscordUsers();
  }

  commandAllLinksUpdate(playerExt: PlayerData, cmds: string[]) {
    if (this.warnIfPlayerIsNotApprovedAdmin(playerExt)) return;
    this.hb_room.discord_account.updateDiscordLinks();
  }
}

export default Commander;
