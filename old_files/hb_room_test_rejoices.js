class PlayerData {
  constructor(player) {
    // this.player = player;
    this.name = player.name; /// @type string
    this.id = player.id; /// @type int
    this.team = player.team;
    this.admin = player.admin;
    this.admin_stats = null;
    this.position = player.position;
    this.auth_id = player.auth || ''; /// @type string
    this.conn_id = player.conn; /// @type string
    this.connected = true;
    this.join_time = Date.now();
  }

  update(player) {
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
}

class Colors {
  static TeamChatRed = 0xDD2222;
  static TeamChatBlue = 0x2222DD;
  static TeamSpecBlue = 0xAAAAAA;
  static GameState = 0xBBBBBB;
  static Admin = 0xBBBBBB;
  static Help = 0x22EE22;
  static Warning = 0xFF1111;
  static TrustZero = 0x9c9c9c;
}

class HaxballRoom {
  constructor(room_name, token, is_public_room) {
    this.room = HBInit({
      roomName: room_name,
      maxPlayers: 16,
      public: is_public_room,
      geo: { "code": "it", "lat": 40.0, "lon": 14.0 },
      noPlayer: true, // Remove host player (recommended!)
      token: token,
    });

    this.server_start_time = Date.now();
    this.pressure_left = 0.0;
    this.pressure_right = 0.0;
    this.pressure_total = 0.0;
    this.last_tick = 0.0;
    this.pressure_bar_length = 300;
    this.last_discs_update_time = 0;
    this.feature_pressure = true;
    this.feature_pressure_stadium = false;
    this.players_ext_data = new Map(); /// @type {Map<number, PlayerData>}
    this.last_command = new Map();  // Mapa: id -> command_string
    this.muted_players = new Set();
    this.game_stopped_timer = null;
    this.game_paused_timer = null;
    this.last_player_team_changed_by_admin_time = Date.now();
    this.last_winner_team = 0;
    this.limit = 3;

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

    this.commands = {
      restart: this.commandRestartMatch,
      r: this.commandRestartMatch,
      rr: this.commandRandomAndRestartMatch,
      win_stay: this.commandWinStayNextMatch,
      ws: this.commandWinStayNextMatch,
      start: this.commandStartMatch,
      stop: this.commandStopMatch,
      s: this.commandStartOrStopMatch,
      swap: this.commandSwapTeams,
      sr: this.commandSwapAndRestart,
      a: this.commandAddPlayersToTeam,
      add: this.commandAddPlayersToTeam,
      map: this.commandChangeMap,
      m: this.commandChangeMap,
      mute: this.commandMute,
      muted: this.commandMuted,
      unmute: this.commandUnmute,
      muteall: this.commandMuteAll,
      mute_all: this.commandMuteAll,
      unmute_all: this.commandUnmuteAll,
      unmuteall: this.commandUnmuteAll,
      bb: this.commandByeBye,
      kick: this.commandKick,
      limit: this.commandLimit,

      spec_move_red: this.commandSpecMoveRed,
      spec_move_blue: this.commandSpecMoveBlue,
      red_move_spec: this.commandRedMoveSpec,
      blue_move_spec: this.commandBlueMoveSpec,

      uptime: this.commandUptime,

      h: this.commandHelp,
      "?": this.commandHelp,
      help: this.commandHelp,
      pomoc: this.commandHelp,
      komendy: this.commandHelp
    };

    this.last_selected_map_name = null;
    this.time_limit_reached = false;
    this.room.setDefaultStadium("Classic");
    this.setMapByName("futsal");
    this.room.setScoreLimit(3);
    this.room.setTimeLimit(3);
    this.room.setTeamsLock(true);
  }

  P(player) {
    let p = this.players_ext_data.get(player.id);
    p.update(player);
    return p;
  }

  Pid(player_id) {
    return this.players_ext_data.get(player_id);
  }

  resetPressureStats() {
    // hb_log("HB reset pressure stats")
    this.pressure_left = 0.0;
    this.pressure_right = 0.0;
    this.pressure_total = 0.0;
    this.last_tick = 0.0;
  }

  handleGameTick() {
    // Current time in ms
    let scores = this.room.getScores();
    let players = this.room.getPlayerList();
    let current_tick = scores.time;
    let delta_time = current_tick - this.last_tick;
    this.last_tick = current_tick;

    if (this.feature_pressure) {
      /* To use it, edit map, add sth like below to vertexes:
          { "x" : -150, "y" : -260, "color" : "404040", "cMask": [], "_selected" : "segment" },
          { "x" : 150, "y" : -260, "color" : "404040", "cMask": [], "_selected" : "segment" }
          And add to segments (update v0,v1 indexes):
          { "v0" : 20, "v1" : 21, "color" : "404040", "cMask": [], "_selected" : true }
          And add to discs:
          { "radius" : 5, "pos" : [0, -260], "color" : "202020", "cGroup" : [] }
           y below is not changed, only x is manipulated
      */

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
          this.room.setDiscProperties(6, { // Pressure disc properties (id: 6)
            x: pressure_disc_pos_x,
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
          this.room.setDiscProperties(5, { // Possesion disc properties (id: 5)
            x: possesion_disc_pos_x,
            color: possesion_disc_color,
          });
        }
      }
    }
    // NO AFK check here
  }

  shuffleAllPlayers(players) {
    // Mieszanie graczy (Fisher-Yates shuffle)
    for (let i = players.length - 1; i > 0; i--) {
      let j = Math.floor(Math.random() * (i + 1));
      [players[i], players[j]] = [players[j], players[i]];
    }
  }

  setMapByName(map_name) {
    if (!all_maps.has(map_name)) return;
    if (this.last_selected_map_name != map_name) this.room.setCustomStadium(all_maps.get(map_name));
    this.last_selected_map_name = map_name;
  }

  selectAppropriateMap(players) {
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

  handleGameStart(byPlayer) {
    this.last_winner_team = 0;
    this.last_discs_update_time = 0;
    this.time_limit_reached = false;
    this.resetPressureStats();
  }

  handleGameStop(byPlayer) {
  }

  handleGamePause(byPlayer) {
  }

  handleGameUnpause(byPlayer) {
  }

  updateAdmins() {
    let players = this.getPlayers();
    if (players.length == 1) {
      this.giveAdminTo(players[0]);
      return;
    }
  }

  addNewAdmin() {
    this.updateAdmins();
  }

  giveAdminTo(player) {
    this.room.setPlayerAdmin(player.id, true);
    let player_ext = this.Pid(player.id);
    if (!player_ext.admin_stats) player_ext.admin_stats = new AdminStats();
    else player_ext.admin_stats.since_now();
    this.sendOnlyTo(player, `Wielka władza to równie wielka odpowiedzialność! Jesteś Adminem!`, Colors.Admin, null, 2);
  }

  takeAdminFrom(player) {
    this.room.setPlayerAdmin(player.id, false);
    let p = this.Pid(player.id);
    let s = p.admin_stats;
  }

  giveAdminToPlayerWithName(player_name) {
    var players = this.room.getPlayerList();
    var player = players.find(player => player.name == player_name);
    if (player != null) {
      hb_log(`Giving admin to ${player_name}`);
      this.giveAdminTo(player);
    } else {
      hb_log(`Player ${player_name} not found`);
    }
  }

  handlePlayerJoin(player) {
    this.players_ext_data.set(player.id, new PlayerData(player));
    // if (this.checkIfDotPlayerIsHost(player)) return;
    // if (this.checkForPlayerDuplicate(player)) return;
    if (this.checkForPlayerNameDuplicate(player)) return;
    let playerExt = this.P(player);
    this.sendOnlyTo(player, `Sprawdź dostępne komendy: !help`, Colors.Help);
  }

  checkIfDotPlayerIsHost(player) {
    if (player.name.trim() == '.' && !this.isHost(player)) {
      this.room.kickPlayer(player.id, "Kropka Nienawiści!");
      return true;
    }
    return false;
  }

  checkForPlayerDuplicate(player) {
    let kicked = false;
    let player_auth = player.auth || '';
    this.getPlayers().forEach(e => {
      if (e.id != player.id) {
        let p = this.P(e);
        if (p.auth_id == player_auth && p.conn_id == player.conn) {
          this.room.kickPlayer(player.id, "One tab, one brain!", false);
          kicked = true;
        }
      }
    });
    return kicked;
  }

  checkForPlayerNameDuplicate(player) {
    let kicked = false;
    this.getPlayers().forEach(e => {
      if (e.id != player.id && e.name == player.name) {
        this.room.kickPlayer(player.id, "Change nick!", false);
        kicked = true;
      }
    });
    return kicked;
  }

  handlePlayerLeave(player) {
    this.handleEmptyRoom();
    this.last_command.delete(player.id);
    this.removeMuted(player);
    let player_ext = this.Pid(player.id);
    player_ext.mark_disconnected();
  }

  handleEmptyRoom() {
    var players = this.room.getPlayerList();
    if (players.length == 0) {
      this.room.stopGame();
      this.setMapByName("futsal");
    }
  }

  handleKickRateLimitSet(min, rate, burst, byPlayer) {
    // TODO set default values
  }

  handleTeamsLockChange(locked, byPlayer) {
    if (!locked) this.room.setTeamsLock(true);
  }

  handleStadiumChange(newStadiumName, byPlayer) {
    if (byPlayer) {
      this.sendOnlyTo(byPlayer, 'Sprawdź komendę !m do zmiany mapy, np 2v2: !m 2, 3v3: !m 3');
    }
    const t = this.constructor.buy_coffe_link;
    if ([`${t} Classic BAR`, `${t} Big BAR`, `${t} Futsal 1x1 2x2 from HaxMaps BAR`, `${t} Futsal 3v3 Zimska Liga from HaxMaps BAR`,
    `${t} BFF 1x1 Futsal BAR`, `${t} Winky's Futsal BAR`].includes(newStadiumName)) {
      this.feature_pressure_stadium = true;
    } else {
      this.feature_pressure_stadium = false;
    }
  }

  handlePlayerAdminChange(changedPlayer, byPlayer) {
  }

  handlePlayerKicked(kickedPlayer, reason, ban, byPlayer) {
    if (ban) {
      this.room.clearBan(kickedPlayer.id); // TODO idk how to handle that
    }
  }

  handlePlayerTeamChange(changedPlayer, byPlayer) {
  }

  handlePlayerActivity(player) {
  }

  handlePlayerBallKick(player) {
  }

  handleTeamGoal(team) {
  }

  handleTeamVictory(scores) {
    if (scores.red > scores.blue) this.last_winner_team = 1;
    else if (scores.blue > scores.red) this.last_winner_team = 2;
    else this.last_winner_team = 0;
  }

  handlePositionsReset() {
    //TODO
  }

  handlePlayerChat(player, message) {
    if (!message.startsWith('!kb_')) { // to not spam
      hb_log_to_console(player, message)
    }
    let p = this.P(player);
    if (message[0] != "!") {
      return true;
    }

    // Handle last command
    if (message == "!!") {
      let last_command_str = this.last_command.get(player.id);
      if (last_command_str == null) {
        this.sendOnlyTo(player, "Brak ostatniej komendy");
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

  executeCommand(command, player, args = []) {
    const cmd = this.commands[command];
    if (cmd) {
      cmd.call(this, player, args);
    } else {
      this.sendOnlyTo(player, "Nieznana komenda: " + command);
    }
  }

  commandRestartMatch(player) {
    if (this.warnIfPlayerIsNotAdmin(player)) return;
    this.updateWinnerTeamBeforeGameStop();
    this.room.stopGame();
    // TODO maybe some sleep?
    this.room.startGame();
    this.sendToAll(`(!r) ${player.name} zrobił restart meczu, limit: ${this.limit} (!limit), zmiana mapy: !m 2, !m 3, !m 4`, Colors.GameState);
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

  commandRandomAndRestartMatch(player) {
    if (this.warnIfPlayerIsNotAdmin(player)) return;
    this.updateWinnerTeamBeforeGameStop();
    this.makeRandomAndRestartMatch();
    this.sendToAll(`(!rr) ${player.name} zrobił losowanie drużyn${this.getPrevWinnerLogTxt()}, limit: ${this.limit} (!limit), zmiana mapy: !m 2, !m 3, !m 4`, Colors.GameState);
  }

  commandWinStayNextMatch(player) {
    if (this.warnIfPlayerIsNotAdmin(player)) return;
    this.updateWinnerTeamBeforeGameStop();
    if (!this.last_winner_team) this.makeRandomAndRestartMatch();
    else this.makeWinStayAndRestartMatch();
    this.sendToAll(`(!ws) ${player.name} zostawił zwycięską druzynę${this.getPrevWinnerLogTxt()}, limit: ${this.limit} (!limit), zmiana mapy: !m 2, !m 3, !m 4`, Colors.GameState);
  }

  makeRandomAndRestartMatch() {
    this.room.stopGame();

    let players = this.getPlayers();
    let red = [];
    let blue = [];
    let spec = [];
    let red_winner = this.last_winner_team == 1;
    let blue_winner = this.last_winner_team == 2;

    players.forEach(e => {
      let player_ext = this.Pid(e.id);
      if (e.team == 1) red.push(e);
      else if (e.team == 2) blue.push(e);
      else spec.push(e);
    });

    let selected_players = [];
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
      if (!selected_players.includes(next_spec)) {
        selected_players.push(next_spec);
      }
    }

    // Dodajemy graczy z przegranej drużyny (red lub blue), jeśli są jeszcze miejsca
    if (selected_players.length < this.limit * 2) {
      let losing_team = red_winner ? blue : red; // Wybieramy drużynę przegraną
      while (selected_players.length < this.limit * 2 && losing_team.length > 0) {
        let next_loser = losing_team.shift();
        if (!selected_players.includes(next_loser)) {
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

    this.selectAppropriateMap(players);
    this.room.startGame();
  }

  makeWinStayAndRestartMatch() {
    this.room.stopGame();

    let players = this.getPlayers();
    let red = [];
    let blue = [];
    let spec = [];
    let red_winner = this.last_winner_team == 1;
    let blue_winner = this.last_winner_team == 2;

    players.forEach(e => {
      let player_ext = this.Pid(e.id);
      if (e.team == 1) red.push(e);
      else if (e.team == 2) blue.push(e);
      else spec.push(e);
    });

    let selected_players = [];

    // Dodajemy graczy ze spectatorów
    while (selected_players.length < this.limit && spec.length > 0) {
      let next_spec = spec.shift();
      if (!selected_players.includes(next_spec)) selected_players.push(next_spec);
    }

    // Dodajemy graczy z przegranej drużyny (red lub blue), jeśli są jeszcze miejsca
    if (selected_players.length < this.limit) {
      let losing_team = red_winner ? blue : red; // Wybieramy drużynę przegraną
      while (selected_players.length < this.limit && losing_team.length > 0) {
        let next_loser = losing_team.shift();
        if (!selected_players.includes(next_loser)) selected_players.push(next_loser);
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

    this.room.startGame();
  }

  commandStartMatch(player) {
    if (this.warnIfPlayerIsNotAdmin(player)) return;
    this.room.startGame();
  }

  commandStopMatch(player) {
    if (this.warnIfPlayerIsNotAdmin(player)) return;
    this.updateWinnerTeamBeforeGameStop();
    this.room.stopGame();
  }

  commandStartOrStopMatch(player) {
    if (this.warnIfPlayerIsNotAdmin(player)) return;
    let d = this.room.getScores();
    if (d) {
      this.updateWinnerTeamBeforeGameStop();
      this.room.stopGame();
    } else {
      this.room.startGame();
    }
  }

  commandSwapTeams(player) {
    if (this.warnIfPlayerIsNotAdmin(player)) return;
    if (this.isGameInProgress()) {
      this.sendOnlyTo(player, 'Nie mozna zmieniać zespołów podczas meczu!')
      return;
    }
    this.swapTeams();
  }

  commandSwapAndRestart(player) {
    if (this.warnIfPlayerIsNotAdmin(player)) return;
    this.updateWinnerTeamBeforeGameStop();
    this.room.stopGame();
    this.swapTeams();
    this.room.startGame();
    this.sendToAll(`(!sr) ${player.name} zmienił strony druzyn, limit: ${this.limit} (!limit), zmiana mapy: !m 2, !m 3, !m 4`, Colors.GameState);
  }

  commandAddPlayersToTeam(player) {
    if (this.warnIfPlayerIsNotAdmin(player)) return;
    let players = this.getPlayers();
    this.shuffleAllPlayers(players);
    let red = this.limit;
    let blue = this.limit;

    players.forEach(e => {
      if (e.team == 1) red--;
      else if (e.team == 2) blue--;
    });
    let any_added = false;

    for (let i = 0; i < players.length && (red > 0 || blue > 0); i++) {
      let player_ext = this.Pid(players[i].id);
      if (player_ext.team != 0) continue;

      let team;
      if (red > blue) team = 1;
      else team = 2
      if (team == 1) red--;
      else blue--;

      this.room.setPlayerTeam(player_ext.id, team);
      any_added = true;
    }
    if (any_added) this.sendToAll(`(!a) ${player.name} uzupełnił druzyny`, Colors.GameState);
  }

  swapTeams() {
    this.getPlayers().forEach(e => {
      let p = this.P(e);
      if (p.team) {
        this.room.setPlayerTeam(p.id, this.getOpponentTeam(p.team));
      }
    })
  }

  commandHelp(player) {
    this.sendOnlyTo(player, "Komendy: !bb !kebab", Colors.Help);
    if (player.admin) {
      this.sendOnlyTo(player, "Komendy: !mute !unmute !restart/r !start/stop/s !swap !sr !rr !win_stay/ws !add/a !map/m", Colors.Help);
    }
    this.sendOnlyTo(player, "By wywołać ostatnią komendę, uzyj !!", Colors.Help);
  }

  commandChangeMap(player, cmds) {
    if (this.warnIfPlayerIsNotAdmin(player)) return;
    if (cmds.length == 0) {
      this.sendOnlyTo(player, 'Napisz jaką mapę chcesz, dostępne: classic/c, big/b, futsal/f, futsal_big/fb');
      return;
    }
    let map_name = cmds[0].toLowerCase();
    if (all_maps.has(map_name)) {
      this.setMapByName(map_name);
      this.sendToAll(`${player.name} zmienił mapę na ${map_name}`, Colors.GameState);
    } else {
      this.sendOnlyTo(player, 'Nie ma takiej mapy', Colors.Warning);
    }
  }

  commandMute(player, player_names) {
    if (this.warnIfPlayerIsNotAdmin(player)) return;
    let muted = [];
    player_names.forEach(player_name => {
      let e = this.getPlayerWithName(player_name);
      if (e) {
        this.addMuted(e);
        muted.push('@' + e.name);
        this.sendOnlyTo(e, "Zostałeś wyciszony!", Colors.Warning, null, 2);
      }
    });
    this.sendOnlyTo(player, `Muted: ${muted.join(" ")}`);
  }


  commandMuted(player) {
    let players = this.room.getPlayerList();
    let muted = [];
    players.forEach(e => {
      if (this.isMuted(e)) muted.push(e.name);
    });
    this.sendOnlyTo(player, `Muted: ${muted.join(" ")}`);
  }

  commandMuteAll(player) {
    if (this.warnIfPlayerIsNotAdmin(player)) return;
    let players = this.room.getPlayerList();
    players.forEach(player => {
      this.addMuted(player);
    });
    this.sendOnlyTo(player, "Muted all Players", Colors.GameState);
  }

  commandUnmute(player, player_names) {
    if (this.warnIfPlayerIsNotAdmin(player)) return;
    var players = this.room.getPlayerList();
    // if player name starts with any of player names, unmute
    players.forEach(player => {
      if (player_names.some(name => player.name.startsWith(name))) {
        this.removeMuted(player);
        this.anti_spam.removePlayer(player);
        this.sendOnlyTo(player, "Ju mozesz pisać!", Colors.Warning, null, 2);
      }
    });
    this.sendOnlyTo(player, `Unmuted: ${player_names}`);
  }

  commandUnmuteAll(player) {
    if (this.warnIfPlayerIsNotAdmin(player)) return;
    this.muted_players.clear();
    this.sendOnlyTo(player, "Unmuted all Players", Colors.GameState);
  }

  commandByeBye(player) {
    this.room.kickPlayer(player.id, "Bye bye!", false);
  }

  commandKick(player, cmds) {
    if (this.warnIfPlayerIsNotAdmin(player)) return;
    if (cmds.length == 0) {
      this.sendOnlyTo(player, 'Podaj nazwę gracza/graczy');
      return;
    }
    cmds.forEach(player_name => {
      let e = this.getPlayerWithName(player_name);
      if (e && e.id != player.id) {
        this.room.kickPlayer(e.id);
      }
    })
  }


  commandLimit(player, values) {
    if (this.warnIfPlayerIsNotAdmin(player)) return;
    if (values.length == 0) return;
    try {
      const limit = parseInt(values[0], 10);
      if (limit < 1 || limit > 6) {
        this.sendOnlyTo(player, "Poprawne wartosci to zakres <1, 6>")
      } else {
        this.limit = limit;
        this.sendToAll(`Zmieniono limit max graczy w druzynie na ${limit}`);
      }
    } catch (e) { }
  }

  commandSpecMoveRed(player) {
    if (this.warnIfPlayerIsNotAdmin(player)) return;
    this.movePlayerBetweenTeams(0, 1);
  }

  commandSpecMoveBlue(player) {
    if (this.warnIfPlayerIsNotAdmin(player)) return;
    this.movePlayerBetweenTeams(0, 2);
  }

  commandRedMoveSpec(player) {
    if (this.warnIfPlayerIsNotAdmin(player)) return;
    this.movePlayerBetweenTeams(1, 0);
  }

  commandBlueMoveSpec(player) {
    if (this.warnIfPlayerIsNotAdmin(player)) return;
    this.movePlayerBetweenTeams(2, 0);
  }

  movePlayerBetweenTeams(from_team, to_team) {
    this.getPlayers().forEach(player => {
      if (player.team == from_team) {
        this.room.setPlayerTeam(player.id, to_team);
      }
    });
  }

  hostOnlyCommand(player, cmd_name) {
    if (!this.isHost(player)) {
      this.sendOnlyTo(player, `Nieznana komenda:${cmd_name} `);
      return true;
    }
    return false
  }

  commandServerRestart(player) {
    if (this.hostOnlyCommand(player, 'server_restart')) return;
    this.getPlayers().forEach(e => {
      this.room.kickPlayer(e.id, "Server is restarted!");
    });
  }

  formatUptime(ms) {
    const total_seconds = Math.floor(ms / 1000);
    const hours = String(Math.floor(total_seconds / 3600)).padStart(2, '0');
    const minutes = String(Math.floor((total_seconds % 3600) / 60)).padStart(2, '0');
    const seconds = String(total_seconds % 60).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  }

  commandUptime(player) {
    let txt = this.formatUptime(Date.now() - this.server_start_time);
    this.sendOnlyTo(player, `Server uptime: ${txt}`);
  }

  static buy_coffe_link = 'https://buycoffee.to/futsal';

  commandDumpPlayers(player) {
    if (this.warnIfPlayerIsNotAdmin(player)) return;
    var players = this.getPlayers();
    players.forEach(e => {
      let p = this.Pid(e.id);
      this.sendOnlyTo(player, `${p.name} [${p.id}] auth: ${p.auth_id} conn: ${p.conn_id}`)
    });
  }

  addMuted(player) {
    this.muted_players.add(player.id);
  }

  removeMuted(player) {
    this.muted_players.delete(player.id);
  }

  isMuted(player) {
    return this.muted_players.has(player.id);
  }

  sendOnlyTo(player, message, color = null, style = null, sound = 0) {
    // If sound is set to 0 the announcement will produce no sound. 
    // If sound is set to 1 the announcement will produce a normal chat sound. 
    // If set to 2 it will produce a notification sound.
    this.room.sendAnnouncement(message, player.id, color, style, sound);
  }

  sendToAll(message, color = null, style = null, sound = 0) {
    this.room.sendAnnouncement(message, null, color, style, sound);
  }

  warnIfPlayerIsNotAdmin(player) {
    if (!player.admin) {
      this.sendOnlyTo(player, "Tylko dla Admina!");
      return true;
    }
    return false;
  }

  getPlayers() {
    return this.room.getPlayerList();
  }

  getPlayerWithName(player_name) {
    // TODO polskie znaki na ascii
    if (player_name.startsWith('@')) player_name = player_name.slice(1);
    return this.getPlayers().find(player => player.name.replace(' ', '_') === player_name) || null;
  }

  isGameInProgress() {
    return this.room.getScores() != null;
  }

  getOpponentTeam(t) {
    if (t == 1) return 2;
    if (t == 2) return 1;
    return 0;
  }

  isHost(player) {
    let p = this.P(player)
    if (p.auth_id == '' || p.auth_id == 'QrInL5KJCKDFUyBjgPxMeq392ZB0XjYksePfN6cm3BY')
      return true;
    return false;
  }
}

// Create new room
const stadium_futsal_v1_v2_bar = `{name:'buycoffee.to/futsal BFF 1x1 Futsal BAR',width:480,height:230,bg:{kickOffRadius:60,color:'34414B'},vertexes:[{x:-401.4,y:-200,cMask:[],cGroup:[]},{x:401.4,y:-200,cMask:[],cGroup:[]},{x:401.4,y:200,cMask:[],cGroup:[]},{x:-401.4,y:200,cMask:[],cGroup:[]},{x:0,y:200,cMask:[],cGroup:[]},{x:0,y:-200,cMask:[],cGroup:[]},{x:0,y:-80,cMask:['red','blue'],cGroup:['redKO','blueKO']},{x:0,y:80,cMask:['red','blue'],cGroup:['redKO','blueKO']},{x:-400,y:70,cMask:[],cGroup:[]},{x:-400,y:-70,cMask:[],cGroup:[]},{x:400,y:-70,cMask:[],cGroup:[]},{x:400,y:70,cMask:[],cGroup:[]},{x:0,y:230,cMask:[],cGroup:[]},{x:0,y:-230,cMask:[],cGroup:[]},{x:436.4,y:-70,cMask:[],cGroup:[]},{x:436.4,y:70,cMask:[],cGroup:[]},{x:-436.4,y:-70,cMask:[],cGroup:[]},{x:-436.4,y:70,cMask:[],cGroup:[]},{x:0,y:-1.5,cMask:[],cGroup:[]},{x:0,y:1.5,cMask:[],cGroup:[]},{x:400,y:-135,cMask:[],cGroup:[]},{x:400,y:135,cMask:[],cGroup:[]},{x:-400,y:-135,cMask:[],cGroup:[]},{x:-400,y:135,cMask:[],cGroup:[]},{x:-400,y:-201.4,cMask:[],cGroup:[]},{x:400,y:-201.4,cMask:[],cGroup:[]},{x:400,y:201.4,cMask:[],cGroup:[]},{x:-400,y:201.4,cMask:[],cGroup:[]},{x:435,y:-71.4,cMask:[],cGroup:[]},{x:435,y:71.4,cMask:[],cGroup:[]},{x:-435,y:-71.4,cMask:[],cGroup:[]},{x:-435,y:71.4,cMask:[],cGroup:[]},{x:-150,y:-230,color:'404040',cMask:[],_selected:'segment'},{x:150,y:-230,color:'404040',cMask:[],_selected:'segment'}],segments:[{v0:5,v1:6,color:'ABC2D5',bCoef:0,cMask:[],cGroup:[]},{v0:4,v1:7,color:'ABC2D5',bCoef:0,cMask:[],cGroup:[]},{v0:6,v1:13,vis:false,bCoef:0.1,cMask:['red','blue'],cGroup:['redKO','blueKO']},{v0:7,v1:12,vis:false,bCoef:0.1,cMask:['red','blue'],cGroup:['redKO','blueKO']},{v0:6,v1:7,curve:180,color:'D9A472',bCoef:0.1,cMask:['red','blue'],cGroup:['redKO'],curveF:6.123233995736766e-17},{v0:7,v1:6,curve:180,color:'D9A472',bCoef:0.1,cMask:['red','blue'],cGroup:['blueKO'],curveF:6.123233995736766e-17},{v0:18,v1:19,curve:180,color:'626262',bCoef:0,cMask:[],curveF:6.123233995736766e-17},{v0:19,v1:18,curve:180,color:'626262',bCoef:0,cMask:[],curveF:6.123233995736766e-17},{v0:21,v1:20,curve:150,color:'626262',bCoef:0,cMask:[],curveF:0.2679491924311227},{v0:22,v1:23,curve:150,color:'626262',bCoef:0,cMask:[],curveF:0.2679491924311227},{v0:10,v1:14,color:'6666FF',bCoef:0.1,cMask:['ball'],bias:-10},{v0:28,v1:29,color:'6666FF',bCoef:0.1,cMask:['ball'],bias:-10},{v0:15,v1:11,color:'6666FF',bCoef:0.1,cMask:['ball'],bias:-10},{v0:8,v1:17,color:'FF6666',bCoef:0.1,cMask:['ball'],bias:-10},{v0:31,v1:30,color:'FF6666',bCoef:0.1,cMask:['ball'],bias:-10},{v0:16,v1:9,color:'FF6666',bCoef:0.1,cMask:['ball'],bias:-10},{v0:9,v1:8,color:'C5C5C5',bCoef:0,cMask:[]},{v0:10,v1:11,color:'C5C5C5',bCoef:0,cMask:[]},{v0:0,v1:1,color:'ABC2D5',cMask:['ball'],bias:-10},{v0:25,v1:10,color:'ABC2D5',cMask:['ball'],bias:-10},{v0:11,v1:26,color:'ABC2D5',cMask:['ball'],bias:-10},{v0:2,v1:3,color:'ABC2D5',cMask:['ball'],bias:-10},{v0:27,v1:8,color:'ABC2D5',cMask:['ball'],bias:-10},{v0:9,v1:24,color:'ABC2D5',cMask:['ball'],bias:-10},{v0:32,v1:33,color:'404040',cMask:[],_selected:true}],planes:[{normal:[0,1],dist:-230,bCoef:0},{normal:[0,-1],dist:-230,bCoef:0},{normal:[1,0],dist:-480,bCoef:0},{normal:[-1,0],dist:-480,bCoef:0}],goals:[{p0:[-407.9,70],p1:[-407.9,-70],team:'red'},{p0:[407.9,70],p1:[407.9,-70],team:'blue'}],discs:[{radius:5.8,invMass:1.55,pos:[0,0],color:'FFF26D',bCoef:0.412,cGroup:['ball','kick','score']},{radius:5.4,invMass:0,pos:[-400,-70],color:'31726'},{radius:5.4,invMass:0,pos:[-400,70],color:'31726'},{radius:5.4,invMass:0,pos:[400,-70],color:'31726'},{radius:5.4,invMass:0,pos:[400,70],color:'31726'},{radius:7,pos:[0,-230],color:'424242',cGroup:[]},{radius:5,pos:[0,-230],color:'202020',cGroup:[]}],playerPhysics:{bCoef:0,acceleration:0.11,kickingAcceleration:0.083,kickStrength:4.2},ballPhysics:'disc0'}`;
const stadium_futsal_v3_bar = `{name:"buycoffee.to/futsal Winky's Futsal BAR",width:620,height:270,bg:{type:'',color:'454C5E',width:0,height:0},vertexes:[{x:550,y:-240,cMask:['ball']},{x:0,y:270,bCoef:0.1,cMask:['red','blue'],cGroup:['redKO','blueKO']},{x:-550,y:-80,bCoef:0.1,cMask:['ball'],bias:2,color:'f08a2b'},{x:-590,y:-80,bCoef:0.1,cMask:['ball'],bias:0,color:'f08a2b'},{x:-590,y:80,bCoef:0.1,cMask:['ball'],bias:0,color:'f08a2b'},{x:-550,y:80,bCoef:0.1,cMask:['ball'],bias:2,color:'f08a2b'},{x:550,y:-80,bCoef:0.1,cMask:['ball'],bias:-2,color:'e8e3e3'},{x:590,y:-80,bCoef:0.1,cMask:['ball'],bias:0,color:'e8e3e3'},{x:590,y:80,bCoef:0.1,cMask:['ball'],bias:0,color:'e8e3e3'},{x:550,y:80,bCoef:0.1,cMask:['ball'],bias:-2,color:'e8e3e3'},{x:-550,y:80,bCoef:1.1,cMask:['ball'],color:'a3acc2',bias:40},{x:-550,y:240,bCoef:1.1,cMask:['ball'],color:'a3acc2',bias:40},{x:-550,y:-80,bCoef:1.1,cMask:['ball'],color:'a3acc2',bias:-40},{x:-550,y:-240,bCoef:1.1,cMask:['ball'],color:'a3acc2',bias:-40},{x:-551.5,y:240,cMask:['ball'],color:'a3acc2'},{x:551.5,y:240,cMask:['ball'],color:'a3acc2'},{x:550,y:80,bCoef:1.1,cMask:['ball'],color:'a3acc2',bias:-40},{x:550,y:240,bCoef:1.1,cMask:['ball'],color:'a3acc2',bias:-40},{x:550,y:-240,bCoef:1.1,cMask:['ball'],color:'a3acc2',bias:-40},{x:550,y:-80,bCoef:1.1,cMask:['ball'],color:'a3acc2',bias:-40},{x:550,y:-240,bCoef:0,cMask:['ball']},{x:550,y:-240,bCoef:0,cMask:['ball']},{x:-551.5,y:-240,cMask:['ball'],color:'a3acc2'},{x:551.5,y:-240,cMask:['ball'],color:'a3acc2'},{x:0,y:-240,bCoef:0.1,cMask:['red','blue'],cGroup:['redKO','blueKO'],color:'a3acc2'},{x:0,y:-81.4,bCoef:0.1,cMask:['red','blue'],cGroup:['redKO','blueKO'],color:'a3acc2'},{x:0,y:81.4,bCoef:0.1,cMask:['red','blue'],cGroup:['redKO','blueKO'],color:'a3acc2'},{x:0,y:240,bCoef:0.1,cMask:['red','blue'],cGroup:['redKO','blueKO'],color:'a3acc2'},{x:550,y:-80,bCoef:0.1,cMask:['ball']},{x:550,y:80,bCoef:0.1,cMask:['ball']},{x:-550,y:-80,bCoef:0.1,cMask:[],color:'c4c9d4'},{x:-550,y:80,bCoef:0.1,cMask:[],color:'c4c9d4'},{x:550,y:-80,bCoef:0.1,cMask:[],color:'c4c9d4'},{x:550,y:80,bCoef:0.1,cMask:[],color:'c4c9d4'},{x:-548.5,y:160,bCoef:0.1,cMask:[],color:'a3acc2'},{x:-548.5,y:-160,bCoef:0.1,cMask:[],color:'a3acc2'},{x:548.5,y:160,bCoef:0.1,cMask:[],color:'a3acc2'},{x:548.5,y:-160,bCoef:0.1,cMask:[],color:'a3acc2'},{x:-590,y:-81.5,bCoef:0.1,cMask:['ball'],bias:0,color:'f08a2b'},{x:-590,y:81.5,bCoef:0.1,cMask:['ball'],bias:0,color:'f08a2b'},{x:590,y:-81.5,bCoef:0.1,cMask:['ball'],bias:0,color:'e8e3e3'},{x:590,y:81.5,bCoef:0.1,cMask:['ball'],bias:0,color:'e8e3e3'},{x:26,y:-13,cGroup:['c1'],trait:'none',color:'e8e3e3'},{x:10,y:15,cGroup:['c1'],trait:'none',color:'e8e3e3'},{x:6,y:-13,cGroup:['c1'],color:'e8e3e3'},{x:-1,y:1,cGroup:['c1'],color:'e8e3e3'},{x:23,y:-13,cGroup:['c1'],trait:'none',color:'e8e3e3'},{x:7,y:15,cGroup:['c1'],trait:'none',color:'e8e3e3'},{x:9,y:-13,cGroup:['c1'],color:'e8e3e3'},{x:1,y:2,cGroup:['c1'],color:'e8e3e3'},{x:-27,y:-13,cGroup:['c1'],color:'f08a2b'},{x:-9,y:15,cGroup:['c1'],color:'f08a2b'},{x:-24,y:-13,cGroup:['c1'],color:'f08a2b'},{x:-6,y:15,cGroup:['c1'],color:'f08a2b'},{x:7,y:3,cGroup:['c1'],trait:'none',color:'454C5E',curve:0},{x:17,y:19,cGroup:['c1'],trait:'none',color:'454C5E',curve:0},{x:9,y:3,cGroup:['c1'],trait:'none',color:'454C5E',curve:0},{x:19,y:19,cGroup:['c1'],trait:'none',color:'454C5E',curve:0},{x:-10,y:-13,cGroup:['c1'],color:'e8e3e3'},{x:8,y:15,cGroup:['c1'],color:'e8e3e3'},{x:-7,y:-13,cGroup:['c1'],color:'e8e3e3'},{x:11,y:15,cGroup:['c1'],color:'e8e3e3'},{x:-36,y:15.8,cGroup:['c1'],trait:'none',color:'454C5E',curve:0},{x:34,y:15.8,cGroup:['c1'],trait:'none',color:'454C5E',curve:0},{x:-36,y:-13.8,cGroup:['c1'],trait:'none',color:'454C5E',curve:0},{x:34,y:-13.8,cGroup:['c1'],trait:'none',color:'454C5E',curve:0},{x:11,y:3,cGroup:['c1'],trait:'none',color:'454C5E',curve:0},{x:21,y:19,cGroup:['c1'],trait:'none',color:'454C5E',curve:0},{x:11,y:1,cGroup:['c1'],trait:'none',color:'454C5E',curve:0},{x:21,y:17,cGroup:['c1'],trait:'none',color:'454C5E',curve:0},{x:11,y:-1,cGroup:['c1'],trait:'none',color:'454C5E',curve:0},{x:21,y:15,cGroup:['c1'],trait:'none',color:'454C5E',curve:0},{x:0,y:78,cGroup:['c1'],color:'d0d5e1',curve:180},{x:0,y:-78,cGroup:['c1'],color:'d0d5e1',curve:180},{x:0,y:80,bCoef:0.1,cMask:['red','blue'],cGroup:['redKO','blueKO'],color:'a3acc2'},{x:0,y:-80,bCoef:0.1,cMask:['red','blue'],cGroup:['redKO','blueKO'],color:'a3acc2'},{x:0,y:-80,bCoef:0.1,cMask:['red','blue'],cGroup:['redKO','blueKO'],color:'a8b4bd'},{x:0,y:-270,bCoef:0.1,cMask:['red','blue'],cGroup:['redKO','blueKO']},{x:0,y:80,bCoef:0.1,cMask:['red','blue'],cGroup:['redKO','blueKO'],color:'a8b4bd'},{x:0,y:270,bCoef:0.1,cMask:['red','blue'],cGroup:['redKO','blueKO']},{x:-150,y:-270,color:'404040',cMask:[],_selected:'segment'},{x:150,y:-270,color:'404040',cMask:[],_selected:'segment'}],segments:[{v0:2,v1:3,color:'f08a2b',bCoef:0.1,cMask:['ball'],bias:2},{v0:4,v1:5,color:'f08a2b',bCoef:0.1,cMask:['ball'],bias:2},{v0:6,v1:7,color:'e8e3e3',bCoef:0.1,cMask:['ball'],bias:-2},{v0:8,v1:9,color:'e8e3e3',bCoef:0.1,cMask:['ball'],bias:-2},{v0:10,v1:11,color:'a3acc2',bCoef:1.1,cMask:['ball'],bias:40},{v0:12,v1:13,color:'a3acc2',bCoef:1.1,cMask:['ball'],bias:-40},{v0:14,v1:15,color:'a3acc2',cMask:['ball']},{v0:16,v1:17,color:'a3acc2',bCoef:1.1,cMask:['ball'],bias:-40},{v0:18,v1:19,color:'a3acc2',bCoef:1.1,cMask:['ball'],bias:-40},{v0:20,v1:21,color:'F8F8F8',bCoef:0,cMask:['ball']},{v0:22,v1:23,color:'a3acc2',cMask:['ball']},{v0:24,v1:25,color:'a3acc2',bCoef:0.1,cMask:['red','blue'],cGroup:['redKO','blueKO']},{v0:26,v1:27,color:'a3acc2',bCoef:0.1,cMask:['red','blue'],cGroup:['redKO','blueKO']},{v0:30,v1:31,color:'c4c9d4',bCoef:0.1,cMask:[]},{v0:32,v1:33,color:'c4c9d4',bCoef:0.1,cMask:[]},{v0:35,v1:34,curve:180,color:'a3acc2',bCoef:0.1,cMask:[],curveF:6.1232339957368e-17},{v0:36,v1:37,curve:180,color:'a3acc2',bCoef:0.1,cMask:[],curveF:6.1232339957368e-17},{v0:38,v1:39,color:'f08a2b',bCoef:0.1,cMask:['ball'],bias:0},{v0:40,v1:41,color:'e8e3e3',bCoef:0.1,cMask:['ball'],bias:0},{v0:42,v1:43,vis:true,color:'e8e3e3',cGroup:['c1'],trait:'none'},{v0:44,v1:45,vis:true,color:'e8e3e3',cGroup:['c1']},{v0:46,v1:47,vis:true,color:'e8e3e3',cGroup:['c1'],trait:'none'},{v0:48,v1:49,vis:true,color:'e8e3e3',cGroup:['c1']},{v0:50,v1:51,vis:true,color:'f08a2b',cGroup:['c1']},{v0:52,v1:53,vis:true,color:'f08a2b',cGroup:['c1']},{v0:54,v1:55,curve:0,vis:true,color:'454C5E',cGroup:['c1'],trait:'none',x:20,y:29},{v0:56,v1:57,curve:0,vis:true,color:'454C5E',cGroup:['c1'],trait:'none',x:20,y:29},{v0:58,v1:59,vis:true,color:'e8e3e3',cGroup:['c1']},{v0:60,v1:61,vis:true,color:'e8e3e3',cGroup:['c1']},{v0:62,v1:63,curve:0,vis:true,color:'454C5E',cGroup:['c1'],trait:'none',x:20,y:28.8},{v0:64,v1:65,curve:0,vis:true,color:'454C5E',cGroup:['c1'],trait:'none',x:20,y:-0.8},{v0:66,v1:67,curve:0,vis:true,color:'454C5E',cGroup:['c1'],trait:'none',x:20,y:29},{v0:68,v1:69,curve:0,vis:true,color:'454C5E',cGroup:['c1'],trait:'none',x:20,y:29},{v0:70,v1:71,curve:0,vis:true,color:'454C5E',cGroup:['c1'],trait:'none',x:20,y:29},{v0:72,v1:73,curve:180,vis:true,color:'d0d5e1',cGroup:['c1']},{v0:73,v1:72,curve:180,vis:true,color:'f5b070',cGroup:['c1']},{v0:74,v1:75,curve:180,color:'a3acc2',bCoef:0.1,cMask:['red','blue'],cGroup:['blueKO'],curveF:6.1232339957368e-17},{v0:75,v1:74,curve:180,color:'f08a2b',bCoef:0.1,cMask:['red','blue'],cGroup:['redKO'],curveF:6.1232339957368e-17},{v0:76,v1:77,vis:false,bCoef:0.1,cMask:['red','blue'],cGroup:['redKO','blueKO']},{v0:78,v1:79,vis:false,bCoef:0.1,cMask:['red','blue'],cGroup:['redKO','blueKO']},{v0:80,v1:81,color:'404040',cMask:[],_selected:true}],planes:[{normal:[0,1],dist:-240,bCoef:1.1,cMask:['ball']},{normal:[0,-1],dist:-240,bCoef:1.1,cMask:['ball']},{normal:[0,1],dist:-270,bCoef:0.1},{normal:[0,-1],dist:-270,bCoef:0.1},{normal:[1,0],dist:-620,bCoef:0.1},{normal:[-1,0],dist:-620,bCoef:0.1},{normal:[1,0],dist:-590,bCoef:0.1,cMask:['ball']},{normal:[-1,0],dist:-590,bCoef:0.1,cMask:['ball']}],goals:[{p0:[550,80],p1:[550,-80],team:'blue',color:'c4c9d4'},{p0:[-550,-80],p1:[-550,80],team:'red',color:'c4c9d4'}],discs:[{radius:5.8,invMass:1.55,pos:[0,0],color:'FFbb28',bCoef:0.412,cGroup:['ball','kick','score']},{radius:4.5,invMass:0,pos:[-550,80],color:'f08a2b'},{radius:4.5,invMass:0,pos:[-550,-80],color:'f08a2b'},{radius:4.5,invMass:0,pos:[550,80],color:'e8e3e3'},{radius:4.5,invMass:0,pos:[550,-80],color:'e8e3e3'},{radius:7,pos:[0,-270],color:'424242',cGroup:[]},{radius:5,pos:[0,-270],color:'202020',cGroup:[]}],playerPhysics:{bCoef:0,acceleration:0.11,kickingAcceleration:0.083,kickStrength:4.2},ballPhysics:'disc0',spawnDistance:268,traits:[],joints:[],redSpawnPoints:[],blueSpawnPoints:[],canBeStored:true}`;

let all_maps = new Map();
all_maps.set("Futsal v1 BAR", stadium_futsal_v1_v2_bar);
all_maps.set("Futsal v2 BAR", stadium_futsal_v1_v2_bar);
all_maps.set("futsal", stadium_futsal_v1_v2_bar);
all_maps.set("f", stadium_futsal_v1_v2_bar);
all_maps.set("Futsal v3 BAR", stadium_futsal_v3_bar);
all_maps.set("futsal_big", stadium_futsal_v3_bar);
all_maps.set("1", stadium_futsal_v1_v2_bar);
all_maps.set("2", stadium_futsal_v1_v2_bar);
all_maps.set("3", stadium_futsal_v3_bar);

function giveAdminToPlayerWithName(player_name) {
  room.giveAdminToPlayerWithName(player_name);
}

function banPlayersByPrefix(prefix) {
  var players = room.room.getPlayerList();
  players.forEach(player => {
    if (player.name.startsWith(prefix)) {
      room.room.kickPlayer(player.id, "xD", true);
    }
  });
}

function consoleDumpPlayers() {
  var players = room.room.getPlayerList();
  players.forEach(player => {
    console.log(`Player(${player.id}): ${player.name}`);
  });
}

function giveAdminOnlyTo(player_name) {
  var players = room.room.getPlayerList();
  players.forEach(player => {
    if (player.name == player_name) {
      room.giveAdminTo(player);
    } else {
      room.takeAdminFrom(player);
    }
  });
}

function kickAllExceptMe() {
  var players = room.room.getPlayerList();
  players.forEach(player => {
    if (player.name != '.') {
      room.room.kickPlayer(player.id, "Bye bye!", false);
    }
  });
}

function setPlayerAvatarTo(player_name, avatar) {
  var players = room.room.getPlayerList();
  players.forEach(player => {
    if (player.name == player_name) {
      room.room.setPlayerAvatar(player.id, avatar);
      return;
    }
  });
}

function clearPlayerAvatar(player_name) {
  var players = room.room.getPlayerList();
  players.forEach(player => {
    if (player.name == player_name) {
      room.room.setPlayerAvatar(player.id, null);
      return;
    }
  });
}


let hb_log_chat_to_console_enabled = true;
function hb_log_to_console(player, msg) {
  if (!hb_log_chat_to_console_enabled) return;
  console.debug(`[${new Date().toLocaleTimeString('pl-PL', { hour12: false })} ${player.name}][${player.id}] ${msg}`);
}

let hb_debug_enabled = true;
function hb_log(msg) {
  if (!hb_debug_enabled) return;
  console.debug(`[${new Date().toLocaleTimeString('pl-PL', { hour12: false })} ${msg}`);
}
// Create room
const room_name = '🍌TEST SERVER XXX';
const logging_selector = '3vs3';
let token = `thr1.AAAAAGe-WMDwX2buMcyjMw.M_YW8wegE_Q`;
if (localStorage.hasOwnProperty('haxball_headless_token_v3')) token = localStorage.getItem("haxball_headless_token_v3");
// const token = null;
const is_public_room = false; // Should ROOM be public?

var room = new HaxballRoom(room_name, token, is_public_room);
return room;
