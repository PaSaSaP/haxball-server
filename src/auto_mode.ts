import * as config from './config';
import { HaxballRoom } from "./hb_room";
import { PlayerData, Match, PlayerLeavedDueTo, RatingProcessingState, MatchType } from "./structs";
import { getTimestampHMS, sleep } from "./utils";
import { Colors } from "./colors";
import { AutoVoteHandler } from "./vote_kick";
import { randomInt } from "crypto";
import { MapPhysicsType } from './maps';
import { CurrentMatchState, MatchState } from './match_state';


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
  private redTeam: PlayerData[];
  private blueTeam: PlayerData[];
  private specTeam: PlayerData[];
  private shuffled: boolean;
  private matchState: CurrentMatchState;
  private ranked: boolean;
  private lastWinner: 0 | 1 | 2;
  private winStreak: number;
  private currentMatchLastGoalScorer: 0 | 1 | 2;
  private fullTimeMatchPlayed: boolean;
  private lastOneMatchLoserTeamIds: number[];
  private lastAutoSelectedPlayerIds: number[];

  private lobbyMonitoringTimer: any;
  private matchStartedTimer: any;
  private afterPositionsResetTimer: any;

  private currentLimit: number;
  static readonly LobbyMonitoringTimeout = 250; // [ms]
  static readonly MatchStartedTimeout = 20 * 1000; // [ms]
  static readonly AfterPositionsResetTimeout = 15 * 1000; // [ms]
  static MaxMatchTime = 6 * 60; // [s]
  static readonly WinStreakLimit = 100; // matches when winner moves to spec // TODO change to lower value in future
  matchHistory: MatchHistory;
  private currentMatch: Match;
  private pauseUsedByRed: boolean;
  private pauseUsedByBlue: boolean;
  private restartRequestedByRed: boolean;
  private restartRequestedByBlue: boolean;
  private restartedPrevMatch: boolean;
  private minuteLeftReminder: boolean;
  private chosingPlayerNextReminder: number;
  private adNextReminder: number;
  private tourneyMode: boolean;
  private tourneyModeMatchStarted: boolean;
  autoVoter: AutoVoteHandler;
  lobbyAction: () => boolean;

  constructor(hb_room: HaxballRoom) {
    this.hb_room = hb_room;
    this.room = this.hb_room.room;

    this.redTeam = [];
    this.blueTeam = [];
    this.specTeam = [];
    this.shuffled = false;
    this.matchState = hb_room.current_match_state;
    this.ranked = false;
    this.lastWinner = 0;
    this.winStreak = 0;
    this.currentMatchLastGoalScorer = 0;
    this.fullTimeMatchPlayed = false;
    this.lastOneMatchLoserTeamIds = [];
    this.lastAutoSelectedPlayerIds = [];

    this.lobbyMonitoringTimer = null;
    this.matchStartedTimer = null;
    this.afterPositionsResetTimer = null;
    this.currentLimit = hb_room.limit;
    this.matchHistory = new MatchHistory();
    this.currentMatch = new Match('none');
    this.currentMatch.setEnd(1, false);
    this.pauseUsedByRed = false;
    this.pauseUsedByBlue = false;
    this.restartRequestedByRed = false;
    this.restartRequestedByBlue = false;
    this.restartedPrevMatch = false;
    this.minuteLeftReminder = false;
    this.chosingPlayerNextReminder = 60;
    this.adNextReminder = 30 + randomInt(90);
    this.tourneyMode = false;
    this.tourneyModeMatchStarted = false;
    this.autoVoter = new AutoVoteHandler(this);
    this.lobbyAction = () => { return false; };
    this.prepareShortMatchHelp();
  }

  R() { return this.redTeam; }
  B() { return this.blueTeam; }
  S() { return this.specTeam; }
  M() { return this.currentMatch; }
  isRanked() { return this.ranked; }

  private resetLobbyAction() {
    this.lobbyAction = () => { return false; };
  }

  reset() {
    // AMLog("reset");
    this.clearAllTimers();
    this.redTeam = [];
    this.blueTeam = [];
    this.specTeam = [];
    this.ranked = false;
    this.fullTimeMatchPlayed = false;
    this.lastWinner = 0;
    this.winStreak = 0;
    this.tourneyModeMatchStarted = false;
    this.matchState.reset();
    this.autoVoter.resetOnMatchStarted();
    this.resetLobbyAction();
  }

  async resetAndStart() {
    this.reset();
    await sleep(500);
    this.stopAndGoToLobby();
    this.hb_room.getPlayersExtList(true).forEach(p => { this.handlePlayerJoin(p) });
  }

  addSpec(playerExt: PlayerData) {
    if (this.specTeam.find(e => e.id === playerExt.id)) return;
    let r = this.redTeam.find(e => e.id === playerExt.id);
    if (r) {
      this.movePlayerToSpec(r, this.redTeam);
      return;
    }
    let b = this.redTeam.find(e => e.id === playerExt.id);
    if (b) {
      this.movePlayerToSpec(b, this.blueTeam);
      return;
    }
    this.specTeam.push(playerExt);
  }

  setTourneyMode(tourneyMode: boolean) {
    this.tourneyMode = tourneyMode;
    this.tourneyModeMatchStarted = false;
    if (this.tourneyMode) {
      AutoBot.MaxMatchTime = 60 * 60;
    } else {
      AutoBot.MaxMatchTime = 6 * 60;
    }
  }

  startMatchOnce() {
    this.tourneyModeMatchStarted = true;
  }

  private clearAllTimers() {
    this.clearMatchStartedTimer();
    this.clearAfterPositionsResetTimer();
    this.stopLobbyMonitoringTimer();
  }

  private limit() {
    return this.currentLimit;
  }

  getCurrentLimit() {
    return this.currentLimit;
  }

  isLobbyTime(): boolean {
    return this.currentMatch.isEnded() || this.matchState.isLobbyTime();
  }

  isGameInProgress(): boolean {
    return this.matchState.isGameInProgress();
  }

  handlePlayerJoin(playerExt: PlayerData) {
    // AMLog(`${playerExt.name} joined`);
    this.addPlayerToSpec(playerExt);
    if (this.isLobbyTime()) return; // add to spec becaues no game in progress
    const limit = this.limit();
    let rl = this.redTeam.length;
    let bl = this.blueTeam.length;
    let added = true;
    if (playerExt.afk || playerExt.afk_maybe) {
      added = false;
    } else if (rl < limit && rl <= bl) {
      this.movePlayerToRed(playerExt, this.specTeam);
      rl++;
    } else if (bl < limit) {
      this.movePlayerToBlue(playerExt, this.specTeam);
      bl++;
    }  else {
      added = false;
    }
    if (added) {
      if (limit === 3) {
        if (rl === 3 && bl === 3) {
          if (this.hb_room.last_selected_map_name !== this.hb_room.map_name_big) { // start ranked
            this.justStopGame();
          } // else it was ranked and player joined
        } // they still should play at futsal map
      } // for now here handle only limit===3
    } // else player not added, do nothing
    this.switchVolleyballTrainingMode(rl + bl);
  }

  handlePlayerLeave(playerExt: PlayerData) {
    // AMLog(`${this.matchState} ${playerExt.name} ${playerExt.id} leaved`);
    // AMLog(`r:${this.redTeam.map(e => e.name).join(",")} b:${this.blueTeam.map(e => e.name).join(",")} s:${this.specTeam.map(e=>e.name).join(",")}`);
    this.autoVoter.handleChangeAssignment(playerExt);
    if (this.removePlayerInSpec(playerExt)) return; // don't care about him
    let redLeft = this.removePlayerInRed(playerExt);
    let blueLeft = false;
    if (!redLeft) blueLeft = this.removePlayerInBlue(playerExt);
    if (!redLeft && !blueLeft) {
      // AMLog(`${playerExt.name} leaved some other universum`); // when player was not in autobot inserted
      return;
    }
    if (this.isLobbyTime()) return; // add players only while game
    if (redLeft || blueLeft) {
      this.setPlayerLeftStatusTo(playerExt, PlayerLeavedDueTo.leftServer);
      this.handlePlayerLeaveTeam(redLeft);
    }
  }

  setPlayerLeftStatusTo(playerExt: PlayerData, dueTo: PlayerLeavedDueTo) {
    this.currentMatch.setPlayerLeftStatusTo(playerExt, this.matchState.getScores().time, dueTo);
  }

  switchVolleyballTrainingMode(nonAfk: number) {
    if (this.hb_room.volleyball.isEnabled()) {
      // const nonAfk = this.getNonAfkAllCount();
      if (nonAfk === 1) { // enable training mode
        // this.hb_room.volleyball.setTraining(true);
        this.justStopGame();
      } else if (nonAfk > 1 && this.hb_room.volleyball.isTrainingMode()) {
        // this.hb_room.volleyball.setTraining(false);
        this.justStopGame();
      }
    }
  }

  handlePlayerTeamChange(changedPlayer: PlayerData) {
    // AMLog(`${this.matchState} handle player team change ${changedPlayer.name} to team ${changedPlayer.team}`);
    let redLeft = false;
    let blueLeft = false;
    this.autoVoter.handleChangeAssignment(changedPlayer);
    if (this.isPlayerInSpec(changedPlayer) && changedPlayer.team) {
      this.changeAssignment(changedPlayer.id, this.specTeam, changedPlayer.team === 1 ? this.redTeam : this.blueTeam);
    } else if (this.isPlayerInRed(changedPlayer) && changedPlayer.team != 1) {
      this.changeAssignment(changedPlayer.id, this.redTeam, changedPlayer.team === 0 ? this.specTeam : this.blueTeam);
      if (changedPlayer.team === 0) redLeft = true;
    } else if (this.isPlayerInBlue(changedPlayer) && changedPlayer.team != 2) {
      this.changeAssignment(changedPlayer.id, this.blueTeam, changedPlayer.team === 0 ? this.specTeam : this.redTeam);
      if (changedPlayer.team === 0) blueLeft = true;
    }
    if (this.isLobbyTime()) return; // add players only while game
    if (redLeft || blueLeft) {
      if (changedPlayer.afk || changedPlayer.afk_maybe)
        this.setPlayerLeftStatusTo(changedPlayer, PlayerLeavedDueTo.afk);
      this.handlePlayerLeaveTeam(redLeft);
    }
  }

  private handlePlayerLeaveTeam(redLeft: boolean) {
    const limit = this.limit();
    if (limit === 1) {
      this.onPlayerLeaveEndMatch1vs1();
    } else {
      if (this.hb_room.volleyball.isEnabled()) {
        this.onPlayerLeaveVolleyball();
      } else {
        this.fillMissingGapsInTeams(redLeft);
      }
    }
  }

  handlePlayerBackFromAfk(playerExt: PlayerData) {
    // AMLog(`${this.matchState} handler player returning from AFK ${playerExt.name}`);
    if (this.isLobbyTime()) return; // add players only while game
    const limit = this.limit();
    let rl = this.redTeam.length;
    let bl = this.blueTeam.length;
    if (limit === 2 || limit === 3 || limit === 4) {
      if (rl === bl && bl === limit) return;
      if (rl === bl && rl < limit || rl < bl) {
        this.movePlayerToRed(playerExt, this.specTeam);
        rl++;
      }
      else {
        this.movePlayerToBlue(playerExt, this.specTeam);
        bl++;
      }
      if (limit === 3 && rl === 3 && bl === 3 && this.hb_room.last_selected_map_name !== this.hb_room.map_name_big) {
        this.justStopGame();
      }
      this.switchVolleyballTrainingMode(rl + bl);
    } else if (limit === 1) {
      if (rl === 0) {
        this.movePlayerToRed(playerExt, this.specTeam);
      } else if (bl === 0) {
        this.movePlayerToBlue(playerExt, this.specTeam);
      }
    }
  }

  private justStopGame(clear = false) {
    if (clear) {
      this.lastAutoSelectedPlayerIds = [];
    }
    this.room.stopGame();
  }

  private fillMissingGapsInTeams(redLeft: boolean) {
    const limit = this.limit();
    if (limit === 2 || limit === 3 || limit === 4) {
      // try to add
      // let spec = this.bottomNonAfkSpec();
      // if (spec) {
      //   if (redLeft) this.movePlayerToRed(spec, this.specTeam, true);
      //   else this.movePlayerToBlue(spec, this.specTeam, true);
      //   return;
      // }
      if (this.fillByPreparedSelection(true)) return;
      this.tryToRebalance3V3or4V4();
    }
  }

  private onPlayerLeaveEndMatch1vs1() {
    const limit = this.limit();
    if (limit !== 1) return;
    const rl = this.redTeam.length;
    const bl = this.blueTeam.length;
    if (rl === bl && bl === limit) return; // just in case
    if (!this.currentMatch.isEnded()) {
      let currentScores = this.matchState.getScores();
      if (!this.currentMatch.winnerTeam && currentScores) {
        if (rl > 0) this.setLastWinner(1);
        else this.setLastWinner(2);
      }
      this.currentMatch.setScore(currentScores);
      this.currentMatch.setEnd(currentScores.time, this.ranked);
    }
    this.hb_room.sendMsgToAll("Przeciwnik sobie poszedł, gramy następny mecz!", Colors.GameState, "italic");
    this.justStopGame(); // 2v2, 3v1, 2v1...
  }

  private onPlayerLeaveVolleyball() {
    const limit = this.limit();
    const rl = this.redTeam.length;
    const bl = this.blueTeam.length;
    if (rl === bl && bl === limit) return; // just in case
    if (rl > 0 && bl > 0) return;
    if (!this.currentMatch.isEnded()) {
      let currentScores = this.matchState.getScores();
      if (!this.currentMatch.winnerTeam && currentScores) {
        if (rl > 0) this.setLastWinner(1);
        else this.setLastWinner(2);
      }
      this.currentMatch.setScore(currentScores);
      this.currentMatch.setEnd(currentScores.time, this.ranked);
    }
    this.hb_room.sendMsgToAll("Przeciwnicy uciekli, gramy następny mecz!", Colors.GameState, "italic");
    this.justStopGame();
  }

  private tryToRebalance3V3or4V4() {
    // below if cannot add new player then check if it is still possible to play
    const limit = this.limit();
    let rl = this.redTeam.length;
    let bl = this.blueTeam.length;
    if (rl === bl && bl === limit) return;
    if (rl === limit && bl === limit-1 || rl === limit-1 && bl === limit) return;
    const currentMap = this.hb_room.last_selected_map_name;
    if (this.hb_room.handball.isEnabled() && limit === 4 && rl === 3 && bl === 3) {
      this.changeLimit(3);
      return;
    }
    if ((limit === 3 && currentMap === this.hb_room.map_name_big) || (limit === 4 && currentMap === this.hb_room.map_name_huge)) {
      if (!this.currentMatch.isEnded()) {
      let currentScores = this.matchState.getScores();
        if (!this.currentMatch.winnerTeam && currentScores) {
          if (currentScores.red > currentScores.blue) this.setLastWinner(1);
          else if (currentScores.blue > currentScores.red) this.setLastWinner(2);
          else this.setLastWinner(this.hb_room.pressure_right >= this.hb_room.pressure_left ? 1 : 2);
        }
        this.currentMatch.setScore(currentScores);
        this.currentMatch.setEnd(currentScores.time, this.ranked);
      }
      this.hb_room.sendMsgToAll("Zmiana na mniejszą mapę", Colors.GameState, "italic");
      this.justStopGame(); // 2v2, 3v1, 2v1...
      return;
    } // below is "futsal" map so try to fix balance
    if (Math.abs(rl - bl) > 1) {
      // AMLog("Przesuwamy podczas meczu bo 3vs1 albo 2vs0");
      if (rl > bl) this.movePlayerToBlue(this.redTeam[this.redTeam.length - 1], this.redTeam);
      else this.movePlayerToRed(this.blueTeam[this.blueTeam.length - 1], this.blueTeam);
      return;
    }
    if (rl + bl === 1) {
      this.hb_room.sendMsgToAll("Pozostał jeden gracz na boisku, reset!", Colors.GameState, "italic");
      this.justStopGame();
    } else if (rl + bl === 0) {
      this.hb_room.sendMsgToAll("Nikogo na boisku, wracamy do poczekalni!", Colors.GameState, "italic");
      this.justStopGame();
    }
  }

  handleGameStart(byPlayer: PlayerData | null) {
    // AMLog("handling game started");
    if (this.ranked) {
      const limit = this.limit();
      if (this.redTeam.length < limit || this.blueTeam.length < limit) {
        if (limit > 1)
          this.hb_room.sendMsgToAll("Niecierpliwi uciekli, dobieramy albo z listy albo z góry", Colors.GameState, "italic");
        this.fillByPreparedSelectionOrEnd1vs1();
      }
    }

    this.startMatchStartedTimer();
    // this.startMissingPlayersInTeamsTimer();
    this.currentMatchLastGoalScorer = 0;
    this.lastOneMatchLoserTeamIds = [];
    this.shuffled = false;
    this.pauseUsedByRed = false;
    this.pauseUsedByBlue = false;
    if (!this.restartedPrevMatch) {
      this.restartRequestedByRed = false;
      this.restartRequestedByBlue = false;
    }
    this.restartedPrevMatch = false;
    this.minuteLeftReminder = false;
    this.fullTimeMatchPlayed = false;
    this.chosingPlayerNextReminder = 60;
    this.adNextReminder = 30 + randomInt(90);
    this.autoVoter.resetOnMatchStarted();
    let matchType: MatchType = 'none';
    if (this.ranked) {
      const limit = this.limit();
      if (this.hb_room.volleyball.isEnabled()) matchType = 'volleyball';
      else if (this.hb_room.tennis.isEnabled()) matchType = 'tennis';
      else if (limit === 1) matchType = '1vs1';
      else if (limit === 2) matchType = '2vs2';
      else if (limit === 3) matchType = '3vs3';
      else if (limit === 4) matchType = '4vs4';
    }
    this.currentMatch = new Match(matchType);
    this.currentMatch.redTeam = [...this.redTeam.map(e=>e.id)];
    this.currentMatch.blueTeam = [...this.blueTeam.map(e=>e.id)];
    for (let id of this.currentMatch.redTeam) this.currentMatch.statInMatch(id);
    for (let id of this.currentMatch.blueTeam) this.currentMatch.statInMatch(id);
  }

  handleGameStop(byPlayer: PlayerData | null) {
    // AMLog("handling game stopped");
    this.clearMatchStartedTimer();
    this.autoVoter.handleGameStop();
    if (this.currentMatch.ratingState === RatingProcessingState.ranked) {
      this.hb_room.updateRatingsAndTop10(this.currentMatch);
      this.currentMatch.ratingState = RatingProcessingState.updated;
    }
    this.stopAndGoToLobby();
  }

  handleGamePause(byPlayer: PlayerData | null) {
    // AMLog("handling game paused");
    const state = this.matchState.getState();
    if (state == MatchState.started) {
      this.clearMatchStartedTimer();
    } else if (state == MatchState.afterReset) {
      this.clearAfterPositionsResetTimer();
    }
  }

  handleGameUnpause(byPlayer: PlayerData | null) {
    // AMLog("handling game unpaused");
    const state = this.matchState.getState();
    if (state == MatchState.started) {
      this.startMatchStartedTimer();
    } else if (state == MatchState.afterReset) {
      this.startAfterPositionsResetTimer();
    }
  }

  handleGameTick(scores: ScoresObject) {
    let currentScores = this.matchState.getScores();
    this.showMinuteLeftReminder(scores);
    this.showChosingPlayerReminder(scores);

    if (scores.time > AutoBot.MaxMatchTime) {
      if (!this.currentMatch.isEnded()) {
        // AMLog("Exceeded max match time");
        let lastWinner: 0 | 1 | 2 = 0;
        let matchEndedWithGoal = false;
        if (scores.red != scores.blue) { // idk why, but maybe?
          lastWinner = scores.red > scores.blue ? 1 : 2;
          matchEndedWithGoal = true;
        } else {
          lastWinner = this.hb_room.pressure_right >= this.hb_room.pressure_left ? 1 : 2;
          if (lastWinner == 1) {
            let red_pressure = (this.hb_room.pressure_right / this.hb_room.pressure_total) * 100;
            this.hb_room.sendMsgToAll(`🔴Red wygrywa po przekroczeniu max czasu poprzez przewagę presji na połowie przeciwnika ${Math.trunc(red_pressure)}%`, Colors.GameState, 'italic');
          } else {
            let blue_pressure = (this.hb_room.pressure_left / this.hb_room.pressure_total) * 100;
            this.hb_room.sendMsgToAll(`🔵Blue wygrywa po przekroczeniu max czasu poprzez przewagę presji na połowie przeciwnika ${Math.trunc(blue_pressure)}%`, Colors.GameState, 'italic');
          }
        }
        this.fullTimeMatchPlayed = true;
        this.setLastWinner(lastWinner);
        this.currentMatch.setScore(currentScores);
        this.currentMatch.setEnd(currentScores.time, this.ranked, true);
        this.lobbyAction = () => {
          this.moveSomeTeamToSpec();
          return true;
        }
        if (matchEndedWithGoal) {
          this.justStopGame();
          return;
        }
        // else, take ball out of game
        this.room.setDiscProperties(0, { "xspeed": 0, "yspeed": 0, "x": 0, "y": 0 , "cGroup": 0});
      } else if ( scores.time - AutoBot.MaxMatchTime > 3) {
        // give 3 seconds for happiness!
        this.justStopGame();
      }
    }
  }

  private showMinuteLeftReminder(scores: ScoresObject) {
    if (!this.minuteLeftReminder && scores.time > AutoBot.MaxMatchTime - 60) { // seconds
      this.hb_room.sendMsgToAll('Za minutę koniec meczu! Rozstrzygnie presja na połowie przeciwnika (mniejsza kulka u góry)!', Colors.DarkRed, 'bold');
      this.minuteLeftReminder = true;
    }
  }

  private showChosingPlayerReminder(scores: ScoresObject) {
    if (scores.time > this.chosingPlayerNextReminder) {
      this.specTeam.forEach(p => {
        if (!p.afk && !p.afk_maybe) {
          if (this.limit() !== 1)
            this.hb_room.sendMsgToPlayer(p, `Wybierz graczy do drużyny, wpisz: !wyb @anusiak @czesio @konieczko @maślana @zajkowski`, Colors.DarkGreen, 'bold');
        } else this.hb_room.sendMsgToPlayer(p, "Jesteś AFK! Chcesz zagrać? Wpisz !afk lub !back by wrócić do gry, !afks by sprawdzić kto afczy!", Colors.BrightGreen, 'bold');
      });
      this.chosingPlayerNextReminder += 60;
    }
    if (scores.time > this.adNextReminder) {
      if (this.hb_room.volleyball.isEnabled()) {
        this.hb_room.sendMsgToAll(`🏐 Serwowanie: ✋Z-wysokie 🎯A-niskie 🕳️Q-wsteczna rotacja 💨E-przednia rotacja`,
          Colors.BrightGreen, 'bold');
      } else if (this.hb_room.tennis.isEnabled()) {
        this.hb_room.sendMsgToAll(`🎾 Piłkę mozna odbic bez X, to jest normalne odbicie! 🐢 Wciskając X kopiesz z mniejszą siłą!`,
          Colors.BrightGreen, 'bold');
      } else if (this.hb_room.handball.isEnabled()) {
        this.hb_room.sendMsgToAll(`🤾‍♂️ Gracz najbliżej bramki staje się bramkarzem! Może biegać po linii bramkowej! 🧤`,
          Colors.BrightGreen, 'bold');
      }
      this.hb_room.sendMsgToAll(`🎉 Kup cieszynkę: !kup lub !vip |💬Discord: ${config.discordLink} |🌐Strona: ${config.webpageLink}`,
        Colors.OrangeTangelo, 'small-bold');
      this.adNextReminder = 9999; // send only once
    }
  }

  handlePositionsReset() {
    // AMLog("handling positions reset");
    this.clearAfterPositionsResetTimer();
    this.startAfterPositionsResetTimer();
  }

  handleTeamGoal(team: 0|1|2) {
    // AMLog("handling team goal");
    this.clearAfterPositionsResetTimer();
    this.currentMatchLastGoalScorer = team;
    if (team) this.currentMatch.goals.push([this.matchState.getScores().time, team]);
    let rl = this.redTeam.length;
    let bl = this.blueTeam.length;
    if (team == 1 && rl == 1 && bl == 0) this.justStopGame(); // the only player shot to blue goal
  }

  handleTeamVictory(scores: ScoresObject) {
    // AMLog("handling team victory");
    this.fullTimeMatchPlayed = true;
    this.currentMatch.setScore(scores); // TODO check
    this.currentMatch.setEnd(scores.time, this.ranked, true); // TODO check
    this.matchHistory.push(this.currentMatch);
    let lastWinner: 1|2 = scores.red > scores.blue ? 1 : 2;
    this.hb_room.sendMsgToAll(`${lastWinner === 1 ? '🔴Red' : '🔵Blue'} wygrywa mecz! Mecz kończy się wynikiem Red🔴 ${scores.red}:${scores.blue} 🔵Blue, Gratulacje!`, Colors.GameState, 'italic');
    this.setLastWinner(lastWinner);
    this.lobbyAction = () => {
      this.moveSomeTeamToSpec();
      return true;
    }
    if (!this.ranked) this.justStopGame();
  }

  handlePauseRequest(byPlayer: PlayerData) {
    if (this.isLobbyTime()) return;
    if (!this.pauseUsedByRed) {
      let p = this.redTeam.filter(e => e.id === byPlayer.id);
      if (p) {
        this.room.pauseGame(true);
        this.pauseUsedByRed = true;
        this.hb_room.sendMsgToAll(`(!p) ${byPlayer.name} jako gracz Red wykorzystał jedyną pauzę w meczu.`, Colors.GameState, 'italic');
        return;
      }
    }
    if (!this.pauseUsedByBlue) {
      let p = this.blueTeam.filter(e => e.id === byPlayer.id);
      if (p) {
        this.room.pauseGame(true);
        this.pauseUsedByBlue = true;
        this.hb_room.sendMsgToAll(`(!p) ${byPlayer.name} jako gracz Blue wykorzystał jedyną pauzę w meczu.`, Colors.GameState, 'italic');
        return;
      }
    }
  }

  handleRestartRequested(byPlayer: PlayerData) {
    if (this.isLobbyTime()) return; // add players only while game
    if (!this.ranked || this.matchState.getScores().time > 15) return;
    if (this.restartRequestedByRed && this.restartRequestedByBlue) return;
    if (!this.restartRequestedByRed) {
      let p = this.redTeam.find(e => e.id === byPlayer.id);
      if (p) {
        if (!this.restartRequestedByBlue) this.hb_room.sendMsgToAll(`(!r) ${byPlayer.name} jako gracz Red poprosił o restart meczu, ktoś z Blue musi się zgodzić`, Colors.BrightGreen, 'bold');
        else this.hb_room.sendMsgToAll(`(!r) ${byPlayer.name} jako gracz Red zgodził się na restart meczu`, Colors.BrightGreen, 'bold');
        this.restartRequestedByRed = true;
      }
    }
    if (!this.restartRequestedByBlue) {
      let p = this.blueTeam.find(e => e.id === byPlayer.id);
      if (p) {
        if (!this.restartRequestedByRed) this.hb_room.sendMsgToAll(`(!r) ${byPlayer.name} jako gracz Blue poprosił o restart meczu, ktoś z Red musi się zgodzić`, Colors.BrightGreen, 'bold');
        else this.hb_room.sendMsgToAll(`(!r) ${byPlayer.name} jako gracz Blue zgodził się na restart meczu`, Colors.BrightGreen, 'bold');
        this.restartRequestedByBlue = true;
      }
    }
    if (this.restartRequestedByBlue && this.restartRequestedByRed) {
      // this.restartRequestedByBlue = false;
      // this.restartRequestedByRed = false;
      this.restartedPrevMatch = true;
      this.justStopGame(false);
    }
  }

  wasFullTimeMatchPlayed() {
    return this.fullTimeMatchPlayed;
  }

  private moveSomeTeamToSpec() {
    if (this.winStreak >= AutoBot.WinStreakLimit) {
      if (this.lastWinner == 1) this.moveWinnerRedToSpec();
      else this.moveWinnerBlueToSpec();
      this.hb_room.sendMsgToAll(`Zwycięzcy (${this.lastWinner==1? '🔴Red': '🔵Blue'}) schodzą po ${this.winStreak} meczach by dać pograć teraz innym!`, Colors.GameState, 'italic');
      this.winStreak = 0;
    } else if (this.lastWinner == 1) this.moveLoserBlueToSpec();
    else this.moveLoserRedToSpec();
    this.moveWinnerBlueToRedIfRanked();
  }

  private moveWinnerBlueToRedIfRanked() {
    if (this.ranked && !this.redTeam.length && this.blueTeam.length && this.lastWinner === 2) {
      this.moveWinnerBlueToRed(); // move blue to red on ranked
      this.lastWinner = 1;
    }
  }

  private startMatchStartedTimer() {
    if (this.tourneyMode) return;
    // AMLog("Start match started timer");
    if (this.hb_room.volleyball.isEnabled() && this.hb_room.volleyball.isTrainingMode()) return; // no timer here
    this.matchStartedTimer = setTimeout(() => {
      const state = this.matchState.getState();
      let currentScores = this.matchState.getScores();
      if (state === MatchState.started) {
        if (this.hb_room.volleyball.isEnabled()) {
          this.hb_room.sendMsgToAll(`Druzyna Blue nie rozpoczęła meczu w przeciągu ${AutoBot.MatchStartedTimeout / 1000} sekund...`, Colors.GameState, 'italic');
          this.currentMatch.setScore(currentScores);
          this.currentMatch.setEnd(currentScores.time, false);
          this.setLastWinner(1);
          this.lobbyAction = () => {
            this.moveLoserBlueToSpec();
            return true;
          }
        } else {
          // AMLog(`Red don't play, why?`);
          this.hb_room.sendMsgToAll(`Druzyna Red nie rozpoczęła meczu w przeciągu ${AutoBot.MatchStartedTimeout / 1000} sekund...`, Colors.GameState, 'italic');
          this.currentMatch.setScore(currentScores);
          this.currentMatch.setEnd(currentScores.time, false); // if they don't want to play then... just let them
          this.setLastWinner(2);
          this.lobbyAction = () => {
            this.moveLoserRedToSpec();
            this.moveWinnerBlueToRedIfRanked();
            return true;
          }
        }
        this.justStopGame();
      }
    }, AutoBot.MatchStartedTimeout);
  }

  private clearMatchStartedTimer() {
    // AMLog("clearing match started timer");
    if (this.matchStartedTimer) {
      clearTimeout(this.matchStartedTimer);
      this.matchStartedTimer = null;
    }
  }

  private startAfterPositionsResetTimer() {
    if (this.tourneyMode) return;
    // AMLog("Start after positions reset timer");
    this.afterPositionsResetTimer = setTimeout(() => {
      const state = this.matchState.getState();
      let currentScores = this.matchState.getScores();
      if (state === MatchState.afterReset) {
        // AMLog('Why dont you play after goal');
        if (this.currentMatchLastGoalScorer == 1) {
          this.hb_room.sendMsgToAll(`Druzyna Blue nie kontynuuje meczu po zdobyciu bramki w ciągu ${AutoBot.AfterPositionsResetTimeout / 1000} sekund...`,
            Colors.GameState, 'italic');
          this.setLastWinner(1);
          this.lobbyAction = () => {
            this.moveLoserBlueToSpec();
            return true;
          }
        } else {
          this.hb_room.sendMsgToAll(`Druzyna Red nie kontynuuje meczu po zdobyciu bramki w ciągu ${AutoBot.AfterPositionsResetTimeout / 1000} sekund...`,
            Colors.GameState, 'italic');
          this.setLastWinner(2);
          this.lobbyAction = () => {
            this.moveLoserRedToSpec();
            this.moveWinnerBlueToRedIfRanked();
            return true;
          }
        }
        this.currentMatch.setScore(currentScores);
        this.currentMatch.setEnd(currentScores.time, this.ranked);
        this.justStopGame();
      }
    }, AutoBot.AfterPositionsResetTimeout);
  }

  private clearAfterPositionsResetTimer() {
    // AMLog("clearing after positions reset timer");
    if (this.afterPositionsResetTimer) {
      clearTimeout(this.afterPositionsResetTimer);
      this.afterPositionsResetTimer = null;
    }
  }

  private setLastWinner(lastWinner: 1|2) {
    if (!this.ranked || this.lastWinner != lastWinner) this.winStreak = 0;
    this.lastWinner = lastWinner;
    this.winStreak++;
    this.currentMatch.winnerTeam = lastWinner;
    this.currentMatch.winStreak = this.winStreak;
    this.currentMatch.pressureRed = (this.hb_room.pressure_right / this.hb_room.pressure_total) * 100;
    this.currentMatch.pressureBlue = (this.hb_room.pressure_left / this.hb_room.pressure_total) * 100;
    this.currentMatch.possessionRed = (this.hb_room.ball_possesion_tracker.getPossessionTime(1) / this.hb_room.ball_possesion_tracker.getTotalPossessionTime()) * 100;
    this.hb_room.sendMsgToAll(`Druzyna ${lastWinner == 1 ? "🔴Red" : "🔵Blue"} wygrała, jest to ich ${this.winStreak} zwycięstwo!`, Colors.GameState, 'italic');
  }

  stopAndGoToLobby() {
    if (this.lobbyMonitoringTimer) return; // only one monitoring timer!
    this.clearAllTimers();
    const pNames = (t: PlayerData[]) => { return t.map(e => e.name).join(",") };
    AMLog(`stopAndGoToLobby-A: r:${pNames(this.redTeam)} b:${pNames(this.blueTeam)} s:${pNames(this.specTeam)}`);
    this.room.stopGame(); // make sure game is stopped
    const nonDefaultAction = this.lobbyAction(); // call defined action
    this.resetLobbyAction(); // then reset to default one, which is empty action
    if (nonDefaultAction) AMLog(`stopAndGoToLobby+A: r:${pNames(this.redTeam)} b:${pNames(this.blueTeam)} s:${pNames(this.specTeam)}`);
    this.lobbyMonitoringTimer = setInterval(async () => {
      if (this.tourneyMode) {
        if (!this.tourneyModeMatchStarted) return;
        this.tourneyModeMatchStarted = false;
      }
      // mix a little bit if under limit
      this.shuffleIfNeeded();
      this.updateLimit();
      let limit = this.limit();
      let rl = this.redTeam.length;
      let bl = this.blueTeam.length;
      let added = false;
      if (rl < limit || bl < limit) {
        added = true;
        let spec = this.topNonAfkSpecAutoSelect();
        // AMLog(`rl=${rl} bl=${bl}`);
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
        // AMLog("Przesuwamy jedynego blue do red");
        this.movePlayerToRed(this.blueTeam[0], this.blueTeam);
        return;
      }
      if (Math.abs(rl - bl) > 1) {
        // AMLog("Przesuwamy bo 3vs1 albo 2vs0");
        if (rl > bl) this.movePlayerToBlue(this.redTeam[this.redTeam.length - 1], this.redTeam);
        else this.movePlayerToRed(this.blueTeam[this.blueTeam.length - 1], this.blueTeam);
        return;
      }
      if (limit === 4 && (rl === limit && bl === limit-1 || rl === limit-1 && bl === limit)) {
        if (rl < bl) {
          this.movePlayerToSpec(this.blueTeam[-1], this.blueTeam);
        } else this.movePlayerToSpec(this.redTeam[-1], this.redTeam, true);
        rl = 3;
        bl = 3;
        this.currentLimit = 3;
        limit = this.currentLimit;
        // and no return because we are going to play ranked 3vs3
      }
      // just in case
      if (rl > limit) {
        this.moveLastFromTeamToSpec(this.redTeam, true);
        rl--;
      } else if (bl > limit) {
        this.moveLastFromTeamToSpec(this.blueTeam, true);
        bl--;
      }

      // if no more players then go below
      if ([1, 2, 3, 4].includes(limit)) {
        // AMLog("NO I ZACZYNAMY GRE");
        AMLog(`ZACZYNAMY: r:${pNames(this.redTeam)} b:${pNames(this.blueTeam)} s:${pNames(this.specTeam)}`);
        this.clearMatchStartedTimer();
        this.stopLobbyMonitoringTimer();
        this.room.reorderPlayers(this.specTeam.map(e => e.id), true);
        // AMLog(`REORDERED: s:${this.specTeam.map(e=>e.name).join(",")}`);
        if (rl === limit && bl === limit) {
          if (!this.tourneyMode) {
            this.hb_room.setScoreTimeLimitByMode(this.getScoreTimeLimitMode(limit));
            this.hb_room.setMapByName(this.getMapNameByLimit(limit), 0, 0, this.getBallPhysics());
          }
          await sleep(500);
          if (!this.ranked) {
            this.lastWinner = 0;
            this.winStreak = 0;
          }
          this.ranked = true;
          this.room.startGame();
        } else {
          if (!this.tourneyMode) {
            this.hb_room.setScoreTimeLimitByMode(this.getScoreTimeLimitMode(2));
          }
          if (rl + bl === 1 && this.hb_room.volleyball.isEnabled()) {
            this.hb_room.volleyball.setTraining(true);
            this.hb_room.setMapByName("volleyball_training", 0, 0, this.getBallPhysics());
          } else {
            this.hb_room.volleyball.setTraining(false);
            this.hb_room.setMapByName(this.getMapNameByLimit(2), 0, 0, this.getBallPhysics());
          }
          await sleep(500);
          this.ranked = false;
          if (this.hb_room.ratings_for_all_games) this.ranked = true;
          this.room.startGame();
        }
      }
    }, AutoBot.LobbyMonitoringTimeout);
  }

  private getBallPhysics(): MapPhysicsType {
    let player = this.redTeam.at(0);
    if (!player) return 'vehax';
    return player.selected_ball;
  }

  private getMapNameByLimit(limit: number) {
    if (this.hb_room.volleyball.isEnabled()) return "volleyball";
    if (this.hb_room.tennis.isEnabled()) return "tennis";
    if (limit === 3) return this.hb_room.map_name_big;
    if (limit === 4) return this.hb_room.map_name_huge;
    return this.hb_room.map_name_classic;
  }

  private getScoreTimeLimitMode(limit: number) {
    if (this.hb_room.volleyball.isEnabled()) return "volleyball";
    if (this.hb_room.tennis.isEnabled()) return "tennis";
    if (limit === 3) return "3vs3";
    if (limit === 4) return "4vs4";
    if (limit === 2) return "2vs2";
    return "1vs1";
  }

  static ShortMatchHelp = 'Restart: !r, Pauza: !p, !votekick !votemute';

  private prepareShortMatchHelp() {
    AutoBot.ShortMatchHelp = 'Restart !r, Pauza !p, !votekick !votemute';
    if (this.hb_room.room_config.playersInTeamLimit === 4) AutoBot.ShortMatchHelp += ' !4';
    else if (this.hb_room.room_config.selector === 'volleyball') AutoBot.ShortMatchHelp += '|Serves: Z,A,Q,E';
  }

  private checkForPreparedSelection(spec: PlayerData) {
    let rl = this.redTeam.length;
    let redTeam = rl == 0;
    if (redTeam) this.movePlayerToRed(spec, this.specTeam);
    else this.movePlayerToBlue(spec, this.specTeam);
    let limit = this.limit() - 1;
    if (limit === 0) return;
    // AMLog(`${spec.name} CZY WYBRAŁ SOBIE DO SKŁADU KOGOŚ: ${spec.chosen_player_names.join(" ")}`);
    if (!spec.chosen_player_names.length) {
      this.hb_room.sendMsgToAll(`(!wyb) ${spec.name} nikogo nie wybrał, dostał pierwszych dostępnych z oczekujących! ${AutoBot.ShortMatchHelp}`, Colors.GameState, 'italic');
      return;
    }
    let foundPlayers = this.specTeam
      .filter(e => !e.isAfk() && spec.chosen_player_names.includes(e.name_normalized))
      .sort((a, b) => {
        return spec.chosen_player_names.indexOf(a.name_normalized) - spec.chosen_player_names.indexOf(b.name_normalized);
      });
    let txt = '';
    for (let p of foundPlayers) {
      if (limit <= 0) break;
      limit--;
      if (redTeam) this.movePlayerToRed(p, this.specTeam);
      else this.movePlayerToBlue(p, this.specTeam);
      txt += p.name + ' ';
    }
    if (txt.length) this.hb_room.sendMsgToAll(`(!wyb) ${spec.name} wybrał sobie do składu:: ${txt}! ${AutoBot.ShortMatchHelp}`, Colors.GameState, 'italic');
    else this.hb_room.sendMsgToAll(`(!wyb) ${spec.name} kogoś wybrał, lecz ich nie dostał! ${AutoBot.ShortMatchHelp}`, Colors.GameState, 'italic');
  }

  private fillByPreparedSelectionOrEnd1vs1() {
    const limit = this.limit();
    if (limit === 1) {
      this.onPlayerLeaveEndMatch1vs1();
    } else {
      this.fillByPreparedSelection();
    }
  }

  private fillByPreparedSelection(addedWhileGame = false) {
    // AMLog("fillByPreparedSelection");
    const limit = this.limit();
    if (this.redTeam.length < limit) {
      this.fillByPreparedSelectionTeam(this.redTeam, 1);
    }
    if (this.blueTeam.length < limit) {
      this.fillByPreparedSelectionTeam(this.blueTeam, 2);
    }
    if (this.redTeam.length == limit && this.blueTeam.length == limit) return true;
    // AMLog("fillByPreparedSelection było z listy, teraz z góry");
    const getSpec = () => {
      if (addedWhileGame) return this.bottomNonAfkSpecAutoSelect();
      return this.topNonAfkSpecAutoSelect();
    }
    let spec = getSpec();
    while (spec && (this.redTeam.length < limit || this.blueTeam.length < limit)) {
      if (this.lastWinner == 1 && this.blueTeam.length < limit) this.movePlayerToBlue(spec, this.specTeam);
      else if (this.lastWinner == 2 && this.redTeam.length < limit) this.movePlayerToRed(spec, this.specTeam);
      else if (this.blueTeam.length < this.redTeam.length) this.movePlayerToBlue(spec, this.specTeam);
      else if (this.redTeam.length < limit) this.movePlayerToRed(spec, this.specTeam);
      else break;

      spec = getSpec();
    }
    return this.redTeam.length == limit && this.blueTeam.length == limit;
    // AMLog("fillByPreparedSelection done");
  }

  private fillByPreparedSelectionTeam(inTeam: PlayerData[], teamNum: 1|2) {
    let limit = this.limit();
    let firstPlayer = inTeam[0];
    if (!firstPlayer) return;
    let chosen = firstPlayer.chosen_player_names;
    if (!chosen.length) return;
    let foundPlayers = this.specTeam.filter(e => !e.afk && !e.afk_maybe && chosen.includes(e.name_normalized));
    for (let p of foundPlayers) {
      if (inTeam.length == limit) break;
      if (teamNum == 1) this.movePlayerToRed(p, this.specTeam);
      else this.movePlayerToBlue(p, this.specTeam);
    }
  }

  private shuffleIfNeeded() {
    if (this.shuffled) return;
    if (!this.ranked) {
      let rb = [...this.redTeam, ...this.blueTeam];
      // AMLog(`MIESZAM ${rb.map(e=>e.name).join(",")}`);
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
      // AMLog(`MIESZAM REZULTAT: ${rb.map(e=>e.name).join(",")}`);
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
        // AMLog(`MIESZAM RANKEDA: ${rb.map(e=>e.name).join(',')}`);
        this.hb_room.shuffleAllPlayers(rb);
        // AMLog(`MIESZAM RANKEDA REZULTAT: ${rb.map(e=>e.name).join(',')}`);
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

  private updateLimit() {
    let nonAfkPlayers = this.getNonAfkAllCount();
    if (this.hb_room.limit === 4) {
      if (nonAfkPlayers >= 8 && this.currentLimit != 4) {
        AMLog(`Zmieniam limit na 4, bo mamy non afk: ${nonAfkPlayers}`);
        this.changeLimit(4);
      } else if (nonAfkPlayers < 8 && this.currentLimit === 4) {
        AMLog(`Zmieniam limit na 3, bo mamy non afk: ${nonAfkPlayers}`);
        this.changeLimit(3);
      }
    }
  }

  private changeLimit(limit: number) {
    this.currentLimit = limit;
  }

  private stopLobbyMonitoringTimer() {
    // AMLog("Stop lobby monitoring timer");
    clearInterval(this.lobbyMonitoringTimer);
    this.lobbyMonitoringTimer = null;
  }

  private addPlayerToSpec(playerExt: PlayerData) {
    playerExt.team = 0;
    this.specTeam.push(playerExt);
    this.room.setPlayerTeam(playerExt.id, playerExt.team);
  }
  private isPlayerInRed(playerExt: PlayerData) {
    return this.redTeam.find(e => e.id == playerExt.id);
  }
  private isPlayerInBlue(playerExt: PlayerData) {
    return this.blueTeam.find(e => e.id == playerExt.id);
  }
  private isPlayerInSpec(playerExt: PlayerData) {
    return this.specTeam.find(e => e.id == playerExt.id);
  }
  private getPlayerTeamId(playerExt: PlayerData) {
    if (this.isPlayerInRed(playerExt)) return 1;
    if (this.isPlayerInBlue(playerExt)) return 2;
    return 0;
  }
  private removePlayerInRed(playerExt: PlayerData) {
    return this.removePlayerInTeam(playerExt, this.redTeam);
  }
  private removePlayerInBlue(playerExt: PlayerData) {
    return this.removePlayerInTeam(playerExt, this.blueTeam);
  }
  private removePlayerInSpec(playerExt: PlayerData) {
    return this.removePlayerInTeam(playerExt, this.specTeam);
  }
  private removePlayerInTeam(playerExt: PlayerData, inTeam: PlayerData[]) {
    const index = inTeam.findIndex(e => e.id === playerExt.id);
    if (index === -1) return false;
    inTeam.splice(index, 1);
    return true;
  }
  private shiftChoserToBottom(playerIds: number[], inTeam: PlayerData[]): [number, number[]] {
    let choserIdx = -1;
    if (playerIds.length && inTeam.length) {
      choserIdx = inTeam.findIndex(e => e.id === playerIds[0]);
      if (choserIdx !== -1) {
        const [item] = inTeam.splice(choserIdx, 1);
        inTeam.push(item);
      }
      let inFavor = [playerIds[1], playerIds[2]]; // first, second and third original player
      inFavor = inFavor.filter(playerId => this.lastAutoSelectedPlayerIds.includes(playerId));
      // AMLog(`Przesuwam wybierającego id:${choserIdx} na dół, inFavor=${inFavor}`);
      return [choserIdx, inFavor];
    }
    return [-1, []];
  }
  private moveLoserRedToSpec() {
    // AMLog("Red przegrało, idą do spec");
    this.shiftChoserToBottom(this.currentMatch.getLoserTeamIds(), this.redTeam);
    // red has at least one win, no in favor
    this.moveAllRedToSpec([]);
  }
  private moveWinnerRedToSpec() {
    // AMLog("Red wygrało, ale! idą do spec");
    this.shiftChoserToBottom(this.currentMatch.getWinnerTeamIds(), this.redTeam);
    this.moveAllRedToSpec([]);
  }
  private moveAllRedToSpec(inFavor: number[]) {
    this.moveAllTeamToSpec(this.redTeam, inFavor);
    this.redTeam = [];
  }
  private moveLoserBlueToSpec() {
    // AMLog("Blue przegrało, idą do spec");
    let loserTeamIds = this.currentMatch.getLoserTeamIds();
    let [choserIdx, inFavor] = this.shiftChoserToBottom(loserTeamIds, this.blueTeam);
    // blue plays always first match so keep them in favor
    if (!this.ranked || this.hb_room.volleyball.isEnabled() || this.hb_room.tennis.isEnabled()) inFavor = [];
    if (inFavor.length) this.lastOneMatchLoserTeamIds = loserTeamIds.slice(0, 3);
    this.moveAllBlueToSpec(inFavor, loserTeamIds.slice(3));
  }
  private moveWinnerBlueToSpec() {
    // AMLog("Blue wygrało, ale! idą do spec");
    this.shiftChoserToBottom(this.currentMatch.getWinnerTeamIds(), this.blueTeam);
    this.moveAllBlueToSpec([]);
  }
  private moveAllBlueToSpec(inFavor: number[], addedWhileMatch: number[] = []) {
    this.moveAllTeamToSpec(this.blueTeam, inFavor, addedWhileMatch);
    this.blueTeam = [];
  }

  private moveAllTeamToSpec(inTeam: PlayerData[], inFavor: number[], addedWhileMatch: number[] = []) {
    // move AFK to the end of spec list!
    const afkFilter = (e: PlayerData) => { return !e.vip_data.afk_mode && (e.afk || e.afk_maybe) };
    let specAfk = this.specTeam.filter(e => afkFilter(e));
    let specNonAfk = this.specTeam.filter(e => !afkFilter(e));

    // anyway make that check to get insert idx
    let insertIdx = 0;
    for (let i = 0; i < specNonAfk.length; i++) {
      if (!specNonAfk[i].afk && !specNonAfk[i].afk_maybe) {
        insertIdx = i + 1;
        break;
      }
    }
    for (let p of inTeam) {
      if (inFavor.includes(p.id)) {
        specNonAfk.splice(insertIdx, 0, p); // insert after first or other in favor
        insertIdx++;
      } else {
        specNonAfk.push(p);
      }
      p.team = 0;
      this.room.setPlayerTeam(p.id, p.team);
    }
    this.specTeam = [...specNonAfk, ...specAfk];
  }

  private moveWinnerBlueToRed() {
    for (let p of this.blueTeam) {
      this.redTeam.push(p);
      p.team = 1;
      this.room.setPlayerTeam(p.id, p.team);
    }
    this.blueTeam = [];
  }
  private movePlayerToRed(playerExt: PlayerData, fromTeam: PlayerData[], onTop = false) {
    playerExt.team = 1;
    this.movePlayer(playerExt.id, fromTeam, this.redTeam, playerExt.team, onTop);
    if (!this.isLobbyTime()) { // if match in progress
      this.currentMatch.redTeam.push(playerExt.id);
      let stat = this.currentMatch.statInMatch(playerExt.id);
      stat.joinedAt = this.matchState.getScores().time;
    }
  }
  private movePlayerToBlue(playerExt: PlayerData, fromTeam: PlayerData[], onTop = false) {
    playerExt.team = 2;
    this.movePlayer(playerExt.id, fromTeam, this.blueTeam, playerExt.team, onTop);
    if (!this.isLobbyTime()) { // if match in progress
      this.currentMatch.blueTeam.push(playerExt.id);
      let stat = this.currentMatch.statInMatch(playerExt.id);
      stat.joinedAt = this.matchState.getScores().time;
    }
  }
  private movePlayerToSpec(playerExt: PlayerData, fromTeam: PlayerData[], onTop = false) {
    playerExt.team = 0;
    this.movePlayer(playerExt.id, fromTeam, this.specTeam, playerExt.team, onTop);
  }

  private moveLastFromTeamToSpec(fromTeam: PlayerData[], onTop = false) {
    if (!fromTeam.length) return;
    this.movePlayerToSpec(fromTeam[fromTeam.length - 1], fromTeam, onTop);
  }

  private movePlayer(playerId: number, fromTeam: PlayerData[], toTeam: PlayerData[], toTeamNumbered: number, onTop = false): void {
    // AMLog(`Moving id ${playerId} to ${toTeamNumbered} top:${onTop}`);
    this.changeAssignment(playerId, fromTeam, toTeam, onTop);
    this.room.setPlayerTeam(playerId, toTeamNumbered);
  }

  private changeAssignment(playerId: number, fromTeam: PlayerData[], toTeam: PlayerData[], onTop = false): void {
    const index = fromTeam.findIndex(player => player.id === playerId);
    if (index !== -1) {
      const [player] = fromTeam.splice(index, 1);
      if (onTop) toTeam.unshift(player);
      else toTeam.push(player);
      // AMLog(`change assignment ${player.name}`);
    } else {
      AMLog(`Cannot change assignment ${playerId}`);
    }
  }

  private topNonAfkSpecAutoSelect() {
    let spec = this.topNonAfkSpec();
    if (spec) this.lastAutoSelectedPlayerIds.push(spec.id);
    return spec;
  }

  private topNonAfkSpec() {
    let inFavorPlayers: PlayerData[] = [];
    for (let spec of this.specTeam) {
      if (!spec.afk && !spec.afk_maybe) {
        if (this.lastOneMatchLoserTeamIds.includes(spec.id)) {
          inFavorPlayers.push(spec);
          continue;
        }
        AMLog(`topNonAfkSpec: ${spec.name} ${spec.id}`);
        return spec;
      }
    }
    if (inFavorPlayers.length) {
      let spec = inFavorPlayers[0];
      AMLog(`topNonAfkSpec:inFavor ${spec.name} ${spec.id}`);
      return spec;
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

  private bottomNonAfkSpecAutoSelect() {
    let spec = this.bottomNonAfkSpec();
    return spec;
  }

  private bottomNonAfkSpec() {
    for (let spec of [...this.specTeam].reverse()) {
      if (!spec.afk && !spec.afk_maybe) return spec;
    }
    return null;
  }
}

function AMLog(text: string) {
  console.log(`#AM# [${getTimestampHMS()}] ${text}`);
}

