import { HaxballRoom } from "./hb_room";
import { PlayerData } from "./structs";
import { getTimestampHMS, sleep } from "./utils";
import { Colors } from "./colors";

enum MatchState {
  lobby,
  started,
  ballInGame,
  afterGoal,
  afterVictory,
}

class Match {
  redScore: number;
  blueScore: number;
  matchEndTime: number; // [seconds]
  startedAt: number; // Date time
  endedAt: number;  // Date time
  redTeam: number[]; // player indexes
  blueTeam: number[];

  constructor(
    redScore: number=0,
    blueScore: number=0,
    matchEndTime: number=0,
    startedAt: number=Date.now(),
    endedAt: number=0,
    redTeam: number[]=[],
    blueTeam: number[]=[]
  ) {
    this.redScore = redScore;
    this.blueScore = blueScore;
    this.matchEndTime = matchEndTime;
    this.startedAt = startedAt;
    this.endedAt = endedAt;
    this.redTeam = redTeam;
    this.blueTeam = blueTeam;
  }
  setEnd() { this.endedAt = Date.now(); }
}

class MatchHistory {
  matches: Match[];
  constructor() {
    this.matches = [];
  }

  push(match: Match) { this.matches.push(match); }

  arraysEqual(a: number[], b: number[]) {
    return a.length === b.length && a.slice().sort().every((v, i) => v === b.sort()[i]);
  }

  theSameTeamsInLastMatches() {
    if (this.matches.length < 3) return;
    const lastMatch = this.matches[this.matches.length - 1];
    const prevMatch = this.matches[this.matches.length - 2];
    const pprevMatch = this.matches[this.matches.length - 3];
    return (this.arraysEqual(lastMatch.redTeam, prevMatch.redTeam)
      && this.arraysEqual(lastMatch.blueTeam, prevMatch.blueTeam)
      && this.arraysEqual(pprevMatch.redTeam, prevMatch.redTeam)
      && this.arraysEqual(pprevMatch.blueTeam, prevMatch.blueTeam))
  }
}

export class AutoBot {
  // TODO add descriptive messages for players
  // TODO handle returning afk players
  hb_room: HaxballRoom;
  room: RoomObject;
  redTeam: PlayerData[];
  blueTeam: PlayerData[];
  specTeam: PlayerData[];
  shuffled: boolean;
  matchState: MatchState;
  ranked: boolean;
  lastWinner: 0 | 1 | 2;
  winStreak: number;
  currentMatchLastGoalScorer: 0 | 1 | 2;
  currentMatchGameTime: number;

  lobbyMonitoringTimer: any;
  matchStartedTimer: any;
  afterPositionsResetTimer: any;

  LobbyMonitoringTimeout = 500; // [ms]
  MatchStartedTimeout = 20 * 1000; // [ms]
  AfterPositionsResetTimeout = 15 * 1000; // [ms]
  MaxMatchTime = 6 * 60; // [s]
  WinStreakLimit = 100; // matches when winner moves to spec // TODO change to lower value in future
  matchHistory: MatchHistory;
  currentMatch: Match;
  pauseUsedByRed: boolean;
  pauseUsedByBlue: boolean;
  minuteLeftReminder: boolean;

  constructor(hb_room: HaxballRoom) {
    this.hb_room = hb_room;
    this.room = this.hb_room.room;

    this.redTeam = [];
    this.blueTeam = [];
    this.specTeam = [];
    this.shuffled = false;
    this.matchState = MatchState.lobby;
    this.ranked = false;
    this.lastWinner = 0;
    this.winStreak = 0;
    this.currentMatchLastGoalScorer = 0;
    this.currentMatchGameTime = 0;

    this.lobbyMonitoringTimer = null;
    this.matchStartedTimer = null;
    this.afterPositionsResetTimer = null;
    this.matchHistory = new MatchHistory();
    this.currentMatch = new Match();
    this.pauseUsedByRed = false;
    this.pauseUsedByBlue = false;
    this.minuteLeftReminder = false;
  }

  async reset() {
    AMLog("reset");
    this.clearAllTimers();
    this.redTeam = [];
    this.blueTeam = [];
    this.specTeam = [];
    this.ranked = false;
    this.lastWinner = 0;
    this.winStreak = 0;
    this.matchState = MatchState.lobby;
  }

  async resetAndStart() {
    this.reset();
    await sleep(500);
    this.stopAndGoToLobby();
    this.hb_room.getPlayersExtList(true).forEach(p => { this.handlePlayerJoin(p) });
  }

  clearAllTimers() {
    this.clearMatchStartedTimer();
    this.clearAfterPositionsResetTimer();
    this.stopLobbyMonitoringTimer();
  }

  limit() {
    return this.hb_room.limit;
  }

  async handlePlayerJoin(playerExt: PlayerData) {
    AMLog(`${playerExt.name} joined`);
    if ([MatchState.lobby, MatchState.afterVictory].includes(this.matchState)) {
      this.addPlayerToSpec(playerExt);
      return; // add to spec because no game in progress
    }
    const limit = this.limit();
    let rl = this.redTeam.length;
    let bl = this.blueTeam.length;
    let added = true;
    if (rl < limit && rl <= bl) {
      this.addPlayerToRed(playerExt);
      rl++;
    } else if (bl < limit) {
      this.addPlayerToBlue(playerExt);
      bl++;
    }  else {
      this.addPlayerToSpec(playerExt);
      added = false;
    }
    if (added) {
      if (limit == 3) {
        if (rl == 3 && bl == 3) {
          if (this.hb_room.last_selected_map_name != 'futsal_big') { // start ranked
            await this.stopAndGoToLobby();
          } // else it was ranked and player joined
        } // they still should play at futsal map
      } // for now handle only limit==3
      if (this.matchState == MatchState.lobby) {
        await this.stopAndGoToLobby();
      }
    }
  }

  async handlePlayerLeave(playerExt: PlayerData) {
    AMLog(`${this.matchState} ${playerExt.name} ${playerExt.id} leaved`);
    AMLog(`r:${this.redTeam.map(e => e.name).join(",")} b:${this.blueTeam.map(e => e.name).join(",")} s:${this.specTeam.map(e=>e.name).join(",")}`);
    if (this.removePlayerInSpec(playerExt)) return; // don't care about him
    let redLeft = this.removePlayerInRed(playerExt);
    let blueLeft = false;
    if (!redLeft) blueLeft = this.removePlayerInBlue(playerExt);
    if (!redLeft && !blueLeft) {
      AMLog(`${playerExt.name} leaved some other universum`); // should not happen but happens...
      return;
    }
    if ([MatchState.lobby, MatchState.afterVictory].includes(this.matchState)) return; // add players only while game
    if (redLeft || blueLeft) this.fillMissingGapsInTeams(redLeft);
  }

  async handlePlayerTeamChange(changedPlayer: PlayerData) {
    AMLog(`${this.matchState} handle player team change ${changedPlayer.name} to team ${changedPlayer.team}`);
    let redLeft = false;
    let blueLeft = false;
    if (this.isPlayerInSpec(changedPlayer) && changedPlayer.team) {
      this.changeAssignment(changedPlayer.id, this.specTeam, changedPlayer.team == 1 ? this.redTeam : this.blueTeam);
    } else if (this.isPlayerInRed(changedPlayer) && changedPlayer.team != 1) {
      this.changeAssignment(changedPlayer.id, this.redTeam, changedPlayer.team == 0 ? this.specTeam : this.blueTeam);
      if (changedPlayer.team == 0) redLeft = true;
    } else if (this.isPlayerInBlue(changedPlayer) && changedPlayer.team != 2) {
      this.changeAssignment(changedPlayer.id, this.blueTeam, changedPlayer.team == 0 ? this.specTeam : this.redTeam);
      if (changedPlayer.team == 0) blueLeft = true;
    }
    if ([MatchState.lobby, MatchState.afterVictory].includes(this.matchState)) return; // add players only while game
    if (redLeft || blueLeft) this.fillMissingGapsInTeams(redLeft);
  }

  async handlePlayerBackFromAfk(playerExt: PlayerData) {
    AMLog(`${this.matchState} handler player returning from AFK ${playerExt.name}`);
    if ([MatchState.lobby, MatchState.afterVictory].includes(this.matchState)) return; // add players only while game
    const limit = this.limit();
    if (limit == 3) {
      let rl = this.redTeam.length;
      let bl = this.blueTeam.length;
      if (rl == bl && bl == limit) return;
      if (rl == bl && rl < limit || rl < bl) {
        this.movePlayerToRed(playerExt, this.specTeam);
        rl++;
      }
      else {
        this.movePlayerToBlue(playerExt, this.specTeam);
        bl++;
      }
      if (rl == 3 && bl == 3 && this.hb_room.last_selected_map_name != 'futsal_big') {
        await this.stopAndGoToLobby();
      }
    }
  }

  async fillMissingGapsInTeams(redLeft: boolean) {
    const limit = this.limit();
    if (limit == 3) {
      // try to add
      let spec = this.bottomNonAfkSpec();
      if (spec) {
        if (redLeft) this.movePlayerToRed(spec, this.specTeam, true);
        else this.movePlayerToBlue(spec, this.specTeam, true);
        return;
      }
      await this.tryToRebalance3V3();
    }
  }

  async tryToRebalance3V3() {
    // below if cannot add new player then check if it is still possible to play
    let rl = this.redTeam.length;
    let bl = this.blueTeam.length;
    if (rl == bl && bl == 3) return;
    if (rl == 3 && bl == 2 || rl == 2 && bl == 3) return;
    const currentMap = this.hb_room.last_selected_map_name;
    if (currentMap == "futsal_big") {
      this.hb_room.sendMsgToAll("Zmiana na mniejszą mapę", Colors.GameState, "italic");
      await this.stopAndGoToLobby(); // 2v2, 3v1, 2v1...
      return;
    } // below is "futsal" map so try to fix balance
    if (Math.abs(rl - bl) > 1) {
      AMLog("Przesuwamy podczas meczu bo 3vs1 albo 2vs0");
      if (rl > bl) this.movePlayerToBlue(this.redTeam[this.redTeam.length - 1], this.redTeam);
      else this.movePlayerToRed(this.blueTeam[this.blueTeam.length - 1], this.blueTeam);
      return;
    }
    if (rl + bl == 1) {
      this.hb_room.sendMsgToAll("Pozostał jeden gracz na boisku, reset!", Colors.GameState, "italic");
      await this.stopAndGoToLobby();
    } else if (rl + bl == 0) {
      this.hb_room.sendMsgToAll("Nikogo na boisku, wracamy do poczekalni!", Colors.GameState, "italic");
      await this.stopAndGoToLobby();
    }
  }

  async handleGameStart(byPlayer: PlayerData | null) {
    AMLog("handling game started");
    this.startMatchStartedTimer();
    this.currentMatchGameTime = 0;
    this.currentMatchLastGoalScorer = 0;
    this.shuffled = false;
    this.pauseUsedByRed = false;
    this.pauseUsedByBlue = false;
    this.minuteLeftReminder = false;
    this.currentMatch = new Match();
  }

  async handleGameStop(byPlayer: PlayerData | null) {
    AMLog("handling game stopped");
    this.sendMsgToAfkingPeople();
    this.clearMatchStartedTimer();
    this.stopAndGoToLobby();
  }

  async handleGamePause(byPlayer: PlayerData | null) {
    AMLog("handling game paused");
    if (this.matchState == MatchState.started) {
      this.clearMatchStartedTimer();
    } else if (this.matchState == MatchState.afterGoal) {
      this.clearAfterPositionsResetTimer();
    }
  }

  async handleGameUnpause(byPlayer: PlayerData | null) {
    AMLog("handling game unpaused");
    if (this.matchState == MatchState.started) {
      this.startMatchStartedTimer();
    } else if (this.matchState == MatchState.afterGoal) {
      this.startAfterPositionsResetTimer();
    }
  }

  async handleGameTick(scores: ScoresObject) {
    if (scores.time > this.currentMatchGameTime) {
      this.matchState = MatchState.ballInGame;
      this.currentMatchGameTime = scores.time;
    }

    if (!this.minuteLeftReminder && scores.time > this.MaxMatchTime - 60) { // seconds
      this.hb_room.sendMsgToAll('Za minutę (6:00) mecz się kończy, rozstrzygnie przewaga presji na połowie przeciwnika (mniejsza kulka u góry)!', Colors.DarkRed, 'bold');
      this.minuteLeftReminder = true;
    }

    if (scores.time > this.MaxMatchTime) {
      AMLog("Exceeded max match time");
      let lastWinner: 0 | 1 | 2 = 0;
      if (scores.red != scores.blue) { // idk why, but maybe?
        lastWinner = scores.red > scores.blue ? 1 : 2;
      } else {
        lastWinner = this.hb_room.pressure_left >= this.hb_room.pressure_right ? 1 : 2;
        if (lastWinner == 1) {
          let red_pressure = (this.hb_room.pressure_right / this.hb_room.pressure_total) * 100;
          this.hb_room.sendMsgToAll(`Red wygrywa po przekroczeniu max czasu poprzez przewagę presji na połowie przeciwnika ${red_pressure}%`, Colors.GameState, 'italic');
        } else {
          let blue_pressure = (this.hb_room.pressure_left / this.hb_room.pressure_total) * 100;
          this.hb_room.sendMsgToAll(`Blue wygrywa po przekroczeniu max czasu poprzez przewagę presji na połowie przeciwnika ${blue_pressure}%`, Colors.GameState, 'italic');
        }
      }
      this.setLastWinner(lastWinner);
      this.moveSomeTeamToSpec();
      this.stopAndGoToLobby();
    }
  }

  async handlePositionsReset() {
    AMLog("handling positions reset");
    this.clearAfterPositionsResetTimer();
    this.matchState = MatchState.afterGoal;
    this.startAfterPositionsResetTimer();
  }

  async handleTeamGoal(team: 0|1|2) {
    AMLog("handling team goal");
    this.currentMatchLastGoalScorer = team;
    let rl = this.redTeam.length;
    let bl = this.blueTeam.length;
    if (team == 1 && rl == 1 && bl == 0) this.stopAndGoToLobby(); // the only player shot to blue goal
  }

  async handleTeamVictory(scores: ScoresObject) {
    AMLog("handling team victory");
    this.sendMsgToAfkingPeople();
    this.currentMatch.setEnd();
    this.matchHistory.push(this.currentMatch);
    this.matchState = MatchState.afterVictory;
    let lastWinner: 1|2 = scores.red > scores.blue ? 1 : 2;
    this.hb_room.sendMsgToAll(`${lastWinner == 1 ? 'Red' : 'Blue'} wygrywa mecz! Mecz kończy się wynikiem Red🔴 ${scores.red}:${scores.blue} 🔵Blue, Gratulacje!`, Colors.GameState, 'italic');
    this.setLastWinner(lastWinner);
    this.moveSomeTeamToSpec();
    this.stopAndGoToLobby();
  }

  async handlePauseRequest(byPlayer: PlayerData) {
    if (!this.pauseUsedByRed) {
      for (let p of this.redTeam) {
        if (p.id == byPlayer.id) {
          this.room.pauseGame(true);
          this.pauseUsedByRed = true;
          this.hb_room.sendMsgToAll(`(!p) ${byPlayer.name} jako gracz Red wykorzystał jedyną pauzę w meczu.`, Colors.GameState, 'italic');
          return;
        }
      }
    }
    if (!this.pauseUsedByBlue) {
      for (let p of this.blueTeam) {
        if (p.id == byPlayer.id) {
          this.room.pauseGame(true);
          this.pauseUsedByBlue = true;
          this.hb_room.sendMsgToAll(`(!p) ${byPlayer.name} jako gracz Blue wykorzystał jedyną pauzę w meczu.`, Colors.GameState, 'italic');
          return;
        }
      }
    }
  }

  moveSomeTeamToSpec() {
    if (this.winStreak >= this.WinStreakLimit) {
      if (this.lastWinner == 1) this.moveAllRedToSpec();
      else this.moveAllBlueToSpec();
      this.hb_room.sendMsgToAll(`Zwycięzcy (${this.lastWinner==1? 'Red': 'Blue'}) schodzą po ${this.winStreak} meczach by dać pograć teraz innym!`, Colors.GameState, 'italic');
      this.winStreak = 0;
    } else if (this.lastWinner == 1) this.moveAllBlueToSpec();
    else this.moveAllRedToSpec();
    if (this.ranked && !this.redTeam.length && this.blueTeam.length) {
      this.moveAllBlueToRed(); // move blue to red on ranked
      this.lastWinner = this.hb_room.getOpponentTeam(this.lastWinner);
    }
  }

  startMatchStartedTimer() {
    AMLog("Start match started timer");
    this.matchStartedTimer = setTimeout(() => {
      if (this.matchState == MatchState.started) {
        AMLog(`Red don't play, why?`);
        this.hb_room.sendMsgToAll(`Druzyna Red nie rozpoczęła meczu w przeciągu ${this.MatchStartedTimeout / 1000} sekund...`, Colors.GameState, 'italic');
        this.setLastWinner(2);
        this.moveAllRedToSpec();
        this.stopAndGoToLobby();
      }
    }, this.MatchStartedTimeout);
  }

  clearMatchStartedTimer() {
    AMLog("clearing match started timer");
    if (this.matchStartedTimer) {
      clearTimeout(this.matchStartedTimer);
      this.matchStartedTimer = null;
    }
  }

  startAfterPositionsResetTimer() {
    AMLog("Start after positions reset timer");
    this.afterPositionsResetTimer = setTimeout(() => {
      if (this.matchState == MatchState.afterGoal) {
        AMLog('Why dont you play after goal');
        if (this.currentMatchLastGoalScorer == 1) {
          this.hb_room.sendMsgToAll(`Druzyna Blue nie kontynuuje meczu po zdobyciu bramki w ciągu ${this.AfterPositionsResetTimeout / 1000} sekund...`, Colors.GameState, 'italic');
          this.setLastWinner(1);
          this.moveAllBlueToSpec();
        } else {
          this.hb_room.sendMsgToAll(`Druzyna Red nie kontynuuje meczu po zdobyciu bramki w ciągu ${this.AfterPositionsResetTimeout / 1000} sekund...`, Colors.GameState, 'italic');
          this.setLastWinner(2);
          this.moveAllRedToSpec();
        }
        this.stopAndGoToLobby();
      }
    }, this.AfterPositionsResetTimeout);
  }

  clearAfterPositionsResetTimer() {
    AMLog("clearing after positions reset timer");
    if (this.afterPositionsResetTimer) {
      clearTimeout(this.afterPositionsResetTimer);
      this.afterPositionsResetTimer = null;
    }
  }

  setLastWinner(lastWinner: 1|2) {
    if (!this.ranked || this.lastWinner != lastWinner) this.winStreak = 0;
    this.lastWinner = lastWinner;
    this.winStreak++;
    this.hb_room.sendMsgToAll(`Druzyna ${lastWinner == 1 ? "Red" : "Blue"} wygrała, jest to ich ${this.winStreak} zwycięstwo!`);
  }

  async stopAndGoToLobby() {
    if (this.lobbyMonitoringTimer) return; // only one monitoring timer!
    AMLog("Stop and go to lobby");
    this.clearAllTimers();
    this.room.stopGame();
    AMLog(`stopAndGoToLobby: r:${this.redTeam.map(e => e.name).join(",")} b:${this.blueTeam.map(e => e.name).join(",")} s:${this.specTeam.map(e=>e.name).join(",")}`);
    this.lobbyMonitoringTimer = setInterval(async () => {
      // mix a little bit if under limit
      this.shuffleIfNeeded();
      const limit = this.limit();
      let rl = this.redTeam.length;
      let bl = this.blueTeam.length;
      let added = false;
      if (rl < limit || bl < limit) {
        added = true;
        let spec = this.topNonAfkSpec();
        AMLog(`rl=${rl} bl=${bl}`);
        if (this.ranked && spec && (bl == 0 || rl == 0)) {
          this.checkForPreparedSelection(spec);
          return;
        }
        if (spec) {
          // TODO maybe if there are people then at first fill losers team, then winner team if any
          if (this.lastWinner == 1 && bl < limit) this.movePlayerToBlue(spec, this.specTeam);
          else if (this.lastWinner == 2 && rl < limit) this.movePlayerToRed(spec, this.specTeam);
          else if (bl < rl) this.movePlayerToBlue(spec, this.specTeam);
          else this.movePlayerToRed(spec, this.specTeam);
        } else added = false;
      }
      if (added) return; // handle next player in next iteration
      if (rl == 0 && bl == 0) return;
      if (rl == 0 && bl == 1) {
        AMLog("Przesuwamy jedynego blue do red");
        this.movePlayerToRed(this.blueTeam[0], this.blueTeam);
        return;
      }
      if (Math.abs(rl - bl) > 1) {
        AMLog("Przesuwamy bo 3vs1 albo 2vs0");
        if (rl > bl) this.movePlayerToBlue(this.redTeam[this.redTeam.length - 1], this.redTeam);
        else this.movePlayerToRed(this.blueTeam[this.blueTeam.length - 1], this.blueTeam);
        return;
      }
      
      // if no more players then go below
      if (limit == 3) {
        AMLog("NO I ZACZYNAMY GRE");
        this.clearMatchStartedTimer();
        this.stopLobbyMonitoringTimer();
        this.room.reorderPlayers(this.specTeam.map(e => e.id), true);
        if (rl == 3 && bl == 3) {
          this.hb_room.setMapByName("futsal_big");
          await sleep(500);
          this.matchState = MatchState.started;
          if (!this.ranked) {
            this.lastWinner = 0;
            this.winStreak = 0;
          }
          this.ranked = true;
          this.room.startGame();
        } else {
          this.hb_room.setMapByName("futsal");
          await sleep(500);
          this.matchState = MatchState.started;
          this.ranked = false;
          this.room.startGame();
        }
      }
    }, this.LobbyMonitoringTimeout);
  }
  
  checkForPreparedSelection(spec: PlayerData) {
    let rl = this.redTeam.length;
    let redTeam = rl == 0;
    if (redTeam) this.movePlayerToRed(spec, this.specTeam);
    else this.movePlayerToBlue(spec, this.specTeam);
    AMLog(`${spec.name} CZY WYBRAŁ SOBIE DO SKŁADU KOGOŚ: ${spec.chosen_player_names.join(" ")}`);
    if (!spec.chosen_player_names.length) return;
    let limit = this.limit() - 1;
    let foundPlayers = this.specTeam.filter(e => spec.chosen_player_names.includes(e.name_normalized));
    let txt = '';
    for (let p of foundPlayers) {
      if (limit <= 0) break;
      limit--;
      if (redTeam) this.movePlayerToRed(p, this.specTeam);
      else this.movePlayerToBlue(p, this.specTeam);
      txt += p.name + ' ';
    }
    if (txt.length) this.hb_room.sendMsgToAll(`(!wyb) ${spec.name} wybrał sobie do składu:: ${txt}!`, Colors.GameState, 'italic');
    else this.hb_room.sendMsgToAll(`(!wyb) ${spec.name} nikogo nie wybrał, dostał pierwszych dostępnych z oczekujących!`, Colors.GameState, 'italic');
  }
  
  shuffleIfNeeded() {
    if (this.shuffled) return;
    if (!this.ranked) {
      let rb = [...this.redTeam, ...this.blueTeam];
      AMLog(`MIESZAM ${rb.map(e=>e.name).join(",")}`);
      const limit = this.limit();
      for (let i = 0; i < this.specTeam.length && rb.length < limit * 2; i++) {
        let p = this.specTeam[i];
        if (!p.afk && !p.afk_maybe) {
          this.specTeam.splice(i, 1);
          rb.push(p);
          i--;
        }
      }
      this.hb_room.shuffleAllPlayers(rb);
      AMLog(`MIESZAM REZULTAT: ${rb.map(e=>e.name).join(",")}`);
      rb.forEach(p => {
        this.specTeam.unshift(p);
        p.team = 0;
        this.room.setPlayerTeam(p.id, p.team);
      });
      this.redTeam = [];
      this.blueTeam = [];
      this.shuffled = true;
    } else {
      if (this.matchHistory.theSameTeamsInLastMatches() && this.getNonAfkAllCount() == this.limit() * 2) {
        this.hb_room.sendMsgToAll('W trzech ostantich meczach były takie same składy, nie ma kogo dobrać, to teraz dla odmiany mieszamy!', Colors.GameState, 'italic');
        let rb = [...this.redTeam, ...this.blueTeam, ...this.specTeam];
        AMLog(`MIESZAM RANKEDA: ${rb.map(e=>e.name).join(',')}`);
        this.hb_room.shuffleAllPlayers(rb);
        AMLog(`MIESZAM RANKEDA REZULTAT: ${rb.map(e=>e.name).join(',')}`);
        rb.forEach(p => {
          p.team = 0;
          this.room.setPlayerTeam(p.id, p.team);
        });
        this.specTeam = rb;
        this.redTeam = [];
        this.blueTeam = [];
        this.shuffled = true;
      }
    }
  }

  sendMsgToAfkingPeople() {
    this.specTeam.filter(e => e.afk || e.afk_maybe).forEach(e => {
      this.hb_room.sendMsgToPlayer(e, "Czy nadal jesteś AFK? Jeśli nie, to wpisz !afk by przełączyć stan, !jj by wrócić, !afks by sprawdzić kto inny jeszcze afczy!", Colors.DarkRed, 'bold');
    });
  }

  stopLobbyMonitoringTimer() {
    AMLog("Stop lobby monitoring timer");
    clearInterval(this.lobbyMonitoringTimer);
    this.lobbyMonitoringTimer = null;
  }

  addPlayerToRed(playerExt: PlayerData) {
    playerExt.team = 1;
    this.redTeam.push(playerExt);
    this.room.setPlayerTeam(playerExt.id, playerExt.team);
  }
  addPlayerToBlue(playerExt: PlayerData) {
    playerExt.team = 2;
    this.blueTeam.push(playerExt);
    this.room.setPlayerTeam(playerExt.id, playerExt.team);
  }
  addPlayerToSpec(playerExt: PlayerData) {
    playerExt.team = 0;
    this.specTeam.push(playerExt);
    this.room.setPlayerTeam(playerExt.id, playerExt.team);
  }
  isPlayerInRed(playerExt: PlayerData) {
    return this.redTeam.find(e => e.id == playerExt.id);
  }
  isPlayerInBlue(playerExt: PlayerData) {
    return this.blueTeam.find(e => e.id == playerExt.id);
  }
  isPlayerInSpec(playerExt: PlayerData) {
    return this.specTeam.find(e => e.id == playerExt.id);
  }
  removePlayerInRed(playerExt: PlayerData) {
    return this.removePlayerInTeam(playerExt, this.redTeam);
  }
  removePlayerInBlue(playerExt: PlayerData) {
    return this.removePlayerInTeam(playerExt, this.blueTeam);
  }
  removePlayerInSpec(playerExt: PlayerData) {
    return this.removePlayerInTeam(playerExt, this.specTeam);
  }
  removePlayerInTeam(playerExt: PlayerData, inTeam: PlayerData[]) {
    const index = inTeam.findIndex(e => e.id === playerExt.id);
    if (index === -1) return false;
    inTeam.splice(index, 1);
    return true;
  }
  moveAllRedToSpec() {
    for (let p of this.redTeam) {
      this.specTeam.push(p);
      p.team = 0;
      this.room.setPlayerTeam(p.id, p.team);
    }
    this.redTeam = [];
  }
  moveAllBlueToSpec() {
    for (let p of this.blueTeam) {
      this.specTeam.push(p);
      p.team = 0;
      this.room.setPlayerTeam(p.id, p.team);
    }
    this.blueTeam = [];
  }
  moveAllBlueToRed() {
    for (let p of this.blueTeam) {
      this.redTeam.push(p);
      p.team = 1;
      this.room.setPlayerTeam(p.id, p.team);
    }
    this.blueTeam = [];
  }
  movePlayerToRed(playerExt: PlayerData, fromTeam: PlayerData[], onTop = false) {
    playerExt.team = 1;
    this.movePlayer(playerExt.id, fromTeam, this.redTeam, playerExt.team, onTop);
  }
  movePlayerToBlue(playerExt: PlayerData, fromTeam: PlayerData[], onTop = false) {
    playerExt.team = 2;
    this.movePlayer(playerExt.id, fromTeam, this.blueTeam, playerExt.team, onTop);
  }
  movePlayerToSpec(playerExt: PlayerData, fromTeam: PlayerData[], onTop = false) {
    playerExt.team = 0;
    this.movePlayer(playerExt.id, fromTeam, this.specTeam, playerExt.team, onTop);
  }

  movePlayer(playerId: number, fromTeam: PlayerData[], toTeam: PlayerData[], toTeamNumbered: number, onTop = false): void {
    AMLog(`Moving id ${playerId} to ${toTeamNumbered} top:${onTop}`);
    this.changeAssignment(playerId, fromTeam, toTeam, onTop);
    this.room.setPlayerTeam(playerId, toTeamNumbered);
  }

  changeAssignment(playerId: number, fromTeam: PlayerData[], toTeam: PlayerData[], onTop = false): void {
    const index = fromTeam.findIndex(player => player.id === playerId);
    if (index !== -1) {
      const [player] = fromTeam.splice(index, 1);
      if (onTop) toTeam.unshift(player);
      else toTeam.push(player);
      AMLog(`change assignment ${player.name}`);
    } else {
      throw new Error(`Cannot change assignment ${playerId}`);
    }
  }

  topNonAfkSpec() {
    for (let spec of this.specTeam) {
      if (!spec.afk && !spec.afk_maybe) {
        AMLog(`topNonAfkSpec: ${spec.name} ${spec.id}`);
        return spec;
      }
    }
    return null;
  }

  getNonAfkAllCount() {
    let count = 0;
    count += this.specTeam.filter(e => !e.afk && !e.afk_maybe).length;
    count += this.redTeam.filter(e => !e.afk && !e.afk_maybe).length;
    count += this.blueTeam.filter(e => !e.afk && !e.afk_maybe).length;
    return count;
  }

  bottomNonAfkSpec() {
    for (let spec of [...this.specTeam].reverse()) {
      if (!spec.afk && !spec.afk_maybe) return spec;
    }
    return null;
  }
}

function AMLog(text: string) {
  console.log(`#AM# [${getTimestampHMS()}] ${text}`);
}

