import { HaxballRoom } from "./hb_room";
import { PlayerData, PlayerMatchStatsData, PlayerMatchStatsDataImpl } from "./structs";

class Goal {
  time: number;
  team: 0 | 1 | 2;
  striker: number;
  assist: number;
  constructor(time: number, team: 0 | 1 | 2, striker: number, assist: number) {
    this.time = time;
    this.team = team;
    this.striker = striker;
    this.assist = assist;
  }
}

class Game {
  date: number; // TODO remove
  // playerComp: PlayerComposition[];
  // TODO maybe map id to PlayerComposition?
  redCompositions: PlayerComposition[];
  blueCompositions: PlayerComposition[];
  goals: Goal[];
  touchArray: BallTouch[];
  scores: ScoresObject | null;

  constructor() {
    this.date = Date.now();
    this.redCompositions = [];
    this.blueCompositions = [];
    this.goals = [];
    this.touchArray = [];
    this.scores = null;
  }

  reset() {
    this.date = Date.now();
    this.redCompositions = [];
    this.blueCompositions = [];
    this.goals = [];
    this.touchArray = [];
    this.scores = null;
  }

  initPlayerComp(redTeam: number[], blueTeam: number[], players: Map<number, PlayerData>) {
    for (let playerId of redTeam) {
      let player = players.get(playerId);
      if (!player) continue;
      this.redCompositions.push(new PlayerComposition(player));
    }
    for (let playerId of blueTeam) {
      let player = players.get(playerId);
      if (!player) continue;
      this.blueCompositions.push(new PlayerComposition(player));
    }
  }
}

class PlayerComposition {
  player: PlayerData;
  timeEntry: number[];
  timeExit: number[];
  GKTicks: number;

  constructor(player: PlayerData, gameTime: number = 0) {
    this.player = player;
    this.timeEntry = [gameTime];
    this.timeExit = [];
    this.GKTicks = 0;
  }
}

interface Position {
  x: number;
  y: number;
}
function pointDistance(p1: Position, p2: Position) {
  return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
}

class BallTouch {
  // player: PlayerData;
  playerId: number;
  time: number;
  goal: number; // TODO maybe team?
  position: Position;

  constructor(playerId: number, time: number = 0, goal: number = 0, position: Position = { x: 0, y: 0 }) {
    this.playerId = playerId;
    this.time = time;
    this.goal = goal;
    this.position = position;
  }
}

// const Situation = { STOP: 0, KICKOFF: 1, PLAY: 2, GOAL: 3 };
enum Situation {
  stop,
  kickoff,
  play,
  goal
}

enum Team {
  SPECTATORS = 0,
  RED = 1,
  BLUE = 2,
}


export class MatchStats {
  emptyBallTouch: BallTouch;
  lastTouches: BallTouch[];
  lastTeamTouched: number;
  lastWinner: 0 | 1 | 2;
  playSituation: Situation;
  speedCoefficient: number;
  ballSpeed: number;
  playerRadius: number;
  ballRadius: number;
  triggerDistance: number;
  game: Game;
  goals: Map<number, number> = new Map<number, number>();
  assists: Map<number, number> = new Map<number, number>();
  ownGoals: Map<number, number> = new Map<number, number>();

  constructor() {
    this.emptyBallTouch = new BallTouch(-1);
    this.lastTouches = [this.emptyBallTouch, this.emptyBallTouch];
    this.lastTeamTouched = 0;
    this.lastWinner = 0;
    this.playSituation = Situation.kickoff;
    // TODO init once at construction from Match
    this.speedCoefficient = 100 / (5 * (0.99 ** 60 + 1));
    this.ballSpeed = 0;
    this.playerRadius = 15;
    this.ballRadius = 6.5;
    this.triggerDistance = this.getTriggerDistance();
    this.game = new Game();

    this.goals = new Map<number, number>();
    this.assists = new Map<number, number>();
    this.ownGoals = new Map<number, number>();
  }

  private addGoalFor(playerId: number) {
    if (!this.goals.has(playerId)) this.goals.set(playerId, 0);
    this.goals.set(playerId, this.goals.get(playerId)! + 1);
  }
  private addAssistFor(playerId: number) {
    if (!this.assists.has(playerId)) this.assists.set(playerId, 0);
    this.assists.set(playerId, this.assists.get(playerId)! + 1);
  }
  private addOwnGoalFor(playerId: number) {
    if (!this.ownGoals.has(playerId)) this.ownGoals.set(playerId, 0);
    this.ownGoals.set(playerId, this.ownGoals.get(playerId)! + 1);
  }

  private resetLastTouches() {
    this.lastTouches = [this.emptyBallTouch, this.emptyBallTouch];
    this.lastTeamTouched = 0;
  }

  handleGameTick(scores: ScoresObject, ballPostion: Position, players: Map<number, PlayerData>, redTeam: number[], blueTeam: number[]) {
    this.game.scores = scores;
    this.getLastTouchOfTheBall(ballPostion, players, redTeam, blueTeam);
    this.handleGK(players, redTeam, blueTeam);
  }

  handleGameStart(anyPlayerProperties: DiscPropertiesObject|null, ballProperties: DiscPropertiesObject|null, redTeam: number[], blueTeam: number[], players: Map<number, PlayerData>) {
    this.lastWinner = 0;
    this.game.reset();
    this.goals.clear();
    this.assists.clear();
    this.ownGoals.clear();

    this.game.initPlayerComp(redTeam, blueTeam, players);
    this.playSituation = Situation.kickoff;
    this.resetLastTouches();
    this.ballRadius = ballProperties?.radius ?? 6.5;
    this.playerRadius = anyPlayerProperties?.radius ?? 15;
    this.triggerDistance = this.getTriggerDistance();
    this.speedCoefficient = this.getSpeedCoefficient(ballProperties);
  }

  handlePlayerBallKick(byPlayer: PlayerData, ballPosition: Position) {
    if (this.playSituation != Situation.goal) {
      if (this.game.touchArray.length == 0 || byPlayer.id != this.game.touchArray[this.game.touchArray.length - 1].playerId) {
        if (this.playSituation === Situation.kickoff) this.playSituation = Situation.play;
        this.lastTeamTouched = byPlayer.team;
        this.game.touchArray.push(new BallTouch(byPlayer.id, this.game.scores?.time ?? 0, this.getGoalGame(), ballPosition));
        this.lastTouches[0] = this.checkGoalKickTouchLast();
        this.lastTouches[1] = this.checkGoalKickTouchPrev();
        // STLog(`handlePlayerBallKick last=${this.lastTouches[0].playerId} prev=${this.lastTouches[1].playerId}`);
      }
    }
  }

  handleTeamGoal(team: 1 | 2, ballProperties: DiscPropertiesObject, players: Map<number, PlayerData>,
      redTeam: number[], blueTeam: number[]): [string, number, number, number] {
    this.playSituation = Situation.goal;
    this.ballSpeed = this.getBallSpeed(ballProperties);
    let [goalString, scorer, assister, ownGoal] = this.getGoalString(team, players, redTeam, blueTeam); // here stats are updated
    return [goalString, scorer, assister, ownGoal];
  }

  handlePositionsReset() {
    this.resetLastTouches();
    this.playSituation = Situation.kickoff;
  }

  handlePlayerTeamChange(changedPlayer: PlayerData, redTeam: number[], blueTeam: number[]) {
    // STLog(`handlePlayerTeamChange ${changedPlayer.name} to ${changedPlayer.team}`);
    this.handleLineupChangeTeamChange(changedPlayer, redTeam, blueTeam);
  }

  handlePlayerLeave(player: PlayerData) {
    // STLog(`handlePlayerLeave ${player.name}`);
    this.handleLineupChangeLeave(player);
  }

  private handleLineupChangeTeamChange(changedPlayer: PlayerData, redTeam: number[], blueTeam: number[]) {
    let currentGameTime = this.game.scores?.time ?? 0;
    if (changedPlayer.team == Team.RED) {
      // player gets in red team
      let idx = this.game.redCompositions.findIndex(c => c.player.auth_id == changedPlayer.auth_id);
      if (idx != -1) {
        // Player goes back in
        let composition = this.game.redCompositions[idx];
        if (composition.timeExit.includes(currentGameTime)) {
          // gets subbed off then in at the exact same time -> no sub
          composition.timeExit = composition.timeExit.filter(e => e != currentGameTime);
        } else {
          composition.timeEntry.push(currentGameTime)
        }
      } else {
        this.game.redCompositions.push(new PlayerComposition(changedPlayer, currentGameTime));
      }
    } else if (changedPlayer.team == Team.BLUE) {
      // player gets in blue team
      let idx = this.game.blueCompositions.findIndex(c => c.player.auth_id == changedPlayer.auth_id);
      if (idx != -1) {
        // Player goes back in
        let composition = this.game.blueCompositions[idx];
        if (composition.timeExit.includes(currentGameTime)) {
          // gets subbed off then in at the exact same time -> no sub
          composition.timeExit = composition.timeExit.filter(e => e != currentGameTime);
        } else {
          composition.timeEntry.push(currentGameTime)
        }
      } else {
        this.game.blueCompositions.push(new PlayerComposition(changedPlayer, currentGameTime));
      }
    }
    if (redTeam.includes(changedPlayer.id)) {
      // player leaves red team
      let compositionIndex = this.game.redCompositions.findIndex(e => e.player.auth_id == changedPlayer.auth_id);
      if (compositionIndex != -1) {
        let composition = this.game.redCompositions[compositionIndex];
        if (composition.timeEntry.includes(currentGameTime)) {
          // gets subbed off then in at the exact same time -> no sub
          if (currentGameTime == 0) {
            this.game.redCompositions.splice(compositionIndex, 1);
          } else {
            composition.timeEntry = composition.timeEntry.filter(e => e != currentGameTime);
          }
        } else {
          composition.timeExit.push(currentGameTime);
        }
      }
    } else if (blueTeam.includes(changedPlayer.id)) {
      // player leaves blue team
      let compositionIndex = this.game.blueCompositions.findIndex(e => e.player.auth_id == changedPlayer.auth_id);
      if (compositionIndex != -1) {
        let composition = this.game.blueCompositions[compositionIndex];
        if (composition.timeEntry.includes(currentGameTime)) {
          // gets subbed off then in at the exact same time -> no sub
          if (currentGameTime == 0) {
            this.game.blueCompositions.splice(compositionIndex, 1);
          } else {
            composition.timeEntry = composition.timeEntry.filter(e => e != currentGameTime);
          }
        } else {
          composition.timeExit.push(currentGameTime);
        }
      }
    }
  }

  private handleLineupChangeLeave(leavingPlayer: PlayerData) {
    let currentGameTime = this.game.scores?.time ?? 0;
    if (leavingPlayer.team == Team.RED) {
      // player gets in red team
      let compositionIndex = this.game.redCompositions.findIndex(e => e.player.auth_id == leavingPlayer.auth_id);
      if (compositionIndex != -1) {
        let composition = this.game.redCompositions[compositionIndex];
        if (composition.timeEntry.includes(currentGameTime)) {
          // gets subbed off then in at the exact same time -> no sub
          if (currentGameTime == 0) {
            this.game.redCompositions.splice(compositionIndex, 1);
          } else {
            composition.timeEntry = composition.timeEntry.filter(e => e != currentGameTime);
          }
        } else {
          composition.timeExit.push(currentGameTime);
        }
      }
    } else if (leavingPlayer.team == Team.BLUE) {
      // player gets in blue team
      let compositionIndex = this.game.blueCompositions.findIndex(e => e.player.auth_id == leavingPlayer.auth_id);
      if (compositionIndex != -1) {
        let composition = this.game.blueCompositions[compositionIndex];
        if (composition.timeEntry.includes(currentGameTime)) {
          // gets subbed off then in at the exact same time -> no sub
          if (currentGameTime == 0) {
            this.game.blueCompositions.splice(compositionIndex, 1);
          } else {
            composition.timeEntry = composition.timeEntry.filter(e => e != currentGameTime);
          }
        } else {
          composition.timeExit.push(currentGameTime);
        }
      }
    }
  }

  private getLastTouchOfTheBall(ballPosition: Position, players: Map<number, PlayerData>, redTeam: number[], blueTeam: number[]) {
    let currentGameTime = this.game.scores?.time ?? 0;
    let closestPlayer: PlayerData | null = null;
    let closestDistance = Infinity;
    for (let playerId of redTeam.concat(blueTeam)) {
      let player = players.get(playerId)!;
      if (!player.position) continue;
      const distanceToBall = pointDistance(player.position, ballPosition);
      if (distanceToBall < this.triggerDistance) {
        if (this.playSituation === Situation.kickoff) this.playSituation = Situation.play;
        if (closestPlayer === null || distanceToBall < closestDistance) {
          closestPlayer = player;
          closestDistance = distanceToBall;
        }
      }
    }
    if (closestPlayer) {
      if (this.lastTeamTouched === closestPlayer.team || this.lastTeamTouched === Team.SPECTATORS) {
        // last touch init is [-1, -1]
        if (this.lastTouches[0].playerId === -1 || this.lastTouches[0].playerId != closestPlayer.id) {
          this.game.touchArray.push(new BallTouch(closestPlayer.id, currentGameTime, this.getGoalGame(), ballPosition));
          this.lastTouches[0] = this.checkGoalKickTouchLast();
          this.lastTouches[1] = this.checkGoalKickTouchPrev();
          // STLog(`getLastTouchOfTheBall last=${this.lastTouches[0].playerId} prev=${this.lastTouches[1].playerId}`);
        }
      }
      this.lastTeamTouched = closestPlayer.team;
    }
  }

  private getGoalAttribution(team: 1 | 2, redTeam: number[], blueTeam: number[]): number[] {
    let goalAttribution = [-1, -1];
    let lastTouch = this.lastTouches[0];
    let prevTouch = this.lastTouches[1];
    if (lastTouch.playerId !== -1) {
      if (team === 1 && redTeam.includes(lastTouch.playerId)) {
        // Direct goal scored by RED player
        if (prevTouch.playerId !== -1 && redTeam.includes(prevTouch.playerId)) {
          goalAttribution = [lastTouch.playerId, prevTouch.playerId];
        } else {
          goalAttribution = [lastTouch.playerId, -1];
        }
      } else if (team === 2 && blueTeam.includes(lastTouch.playerId)) {
        // Direct goal scored by BLUE player
        if (prevTouch.playerId !== -1 && blueTeam.includes(prevTouch.playerId)) {
          goalAttribution = [lastTouch.playerId, prevTouch.playerId];
        } else {
          goalAttribution = [lastTouch.playerId, -1];
        }
      } else {
        // Own goal
        goalAttribution = [lastTouch.playerId, -1];
      }
    }
    if (goalAttribution[0] !== -1 && goalAttribution[0] === goalAttribution[1]) goalAttribution[1] = -1; // cannot be also scorer and assister
    return goalAttribution;
  }

  private getGoalString(team: 1 | 2, players: Map<number, PlayerData>, redTeam: number[], blueTeam: number[]): [string, number, number, number] {
    let currentGameTime = this.game.scores!.time ?? 0;
    let goalString: string = '';
    let goalAttribution = this.getGoalAttribution(team, redTeam, blueTeam);
    let scoringPlayer: PlayerData | null = null;
    let assistingPlayer: PlayerData | null = null;
    let scoringPlayerId = -1;
    let assistingPlayerId = -1;
    let ownGoalPlayerId = -1;
    if (goalAttribution[0] !== -1) scoringPlayer = players.get(goalAttribution[0])!;
    if (goalAttribution[1] !== -1) assistingPlayer = players.get(goalAttribution[1])!;

    if (scoringPlayer) {
      if (scoringPlayer.team === team) {
        if (assistingPlayer && assistingPlayer.team == team) {
          goalString = `⚽ Gol dla ${scoringPlayer.name}! Asysta dla ${assistingPlayer.name}! Prędkość kulki: ${this.ballSpeed.toFixed(2)}km/h`;
          this.game.goals.push(new Goal(currentGameTime, team, scoringPlayer.id, assistingPlayer.id));
          scoringPlayerId = scoringPlayer.id;
          assistingPlayerId = assistingPlayer.id;
          this.addGoalFor(scoringPlayerId);
          this.addAssistFor(assistingPlayerId);
        } else {
          goalString = `⚽ Gol dla ${scoringPlayer.name}! Prędkość kulki: ${this.ballSpeed.toFixed(2)}km/h`;
          this.game.goals.push(new Goal(currentGameTime, team, scoringPlayer.id, -1));
          scoringPlayerId = scoringPlayer.id;
          this.addGoalFor(scoringPlayerId);
        }
      } else {
        goalString = `😂 Samobój dla ${scoringPlayer.name}! Prędkość kulki: ${this.ballSpeed.toFixed(2)}km/h`;
        this.game.goals.push(new Goal(currentGameTime, team, scoringPlayer.id, -1));
        ownGoalPlayerId = scoringPlayer.id;
        this.addOwnGoalFor(ownGoalPlayerId);
      }
    } else {
      goalString = `⚽ Gol dla ${team === 1 ? 'Red' : 'Blue'}! Prędkość kulki: ${this.ballSpeed.toFixed(2)}km/h`;
      this.game.goals.push(new Goal(currentGameTime, team, -1, -1));
    }
    return [goalString, scoringPlayerId, assistingPlayerId, ownGoalPlayerId];
  }

  setWinner(winner: 1 | 2) {
    this.lastWinner = winner;
  }

  updatePlayerStats(players: Map<number, PlayerData>, fullTimeMatchPlayed: boolean): Map<number, PlayerMatchStatsData> {
    const matchFullTime = this.game.scores?.time ?? 0;
    const winner = this.lastWinner;
    let playerMatchStats: Map<number, PlayerMatchStatsData> = new Map<number, PlayerMatchStatsData>();
    const getP = (playerId: number): PlayerMatchStatsData => {
      let currentMatch = players.get(playerId)!.stat.currentMatch;
      if (!playerMatchStats.has(playerId)) playerMatchStats.set(playerId, currentMatch);
      return currentMatch;
    }
    let redGK = this.getGKRed();
    let blueGK = this.getGKBlue();

    for (let composition of this.game.redCompositions.concat(this.game.blueCompositions)) {
      players.get(composition.player.id)!.stat.currentMatch.reset();
    }

    for (let composition of this.game.redCompositions.concat(this.game.blueCompositions)) {
      let d = getP(composition.player.id);
      let tEntry = composition.timeEntry;
      let tExit = composition.timeExit;
      for (let i = 0; i < tEntry.length; i++) {
        if (tExit.length < i + 1) {
          d.playtime += matchFullTime - tEntry[i];
        } else {
          d.playtime += tExit[i] - tEntry[i];
        }
      }
    }
    for (let composition of this.game.redCompositions) {
      let d = getP(composition.player.id);
      if (!d.games) d.games++;
      if (winner === 1 && !d.wins) d.wins++;
      if (fullTimeMatchPlayed && composition.timeEntry[0] == 0 && matchFullTime - d.playtime < 1) {
        if (!d.full_games) d.full_games++;
        if (winner === 1 && !d.full_wins) d.full_wins++;
      }
    }
    for (let composition of this.game.blueCompositions) {
      let d = getP(composition.player.id);
      if (!d.games) d.games++;
      if (winner === 2 && !d.wins) d.wins++;
      if (fullTimeMatchPlayed && composition.timeEntry[0] == 0 && matchFullTime - d.playtime < 1) {
        if (!d.full_games) d.full_games++;
        if (winner === 2 && !d.full_wins) d.full_wins++;
      }
    }
    if (this.game.scores) {
      if (this.game.scores.blue === 0 && redGK) getP(redGK.player.id).clean_sheets++;
      if (this.game.scores.red === 0 && blueGK) getP(blueGK.player.id).clean_sheets++;
    }
    for (let [playerId, goals] of this.goals) {
      getP(playerId).goals += goals;
    }
    for (let [playerId, assists] of this.assists) {
      getP(playerId).assists += assists;
    }
    for (let [playerId, ownGoals] of this.ownGoals) {
      getP(playerId).own_goals += ownGoals;
    }

    for (let [playerId, p] of playerMatchStats) {
      let stat = players.get(playerId)!.stat;
      stat.games += p.games;
      stat.fullGames += p.full_games;
      stat.wins += p.wins;
      stat.fullWins += p.full_wins;
      stat.goals += p.goals;
      stat.assists += p.assists;
      stat.ownGoals += p.own_goals;
      stat.playtime += p.playtime;
      stat.cleanSheets += p.clean_sheets;
    }
    return playerMatchStats;
  }

  private getBallSpeed(ballProperties: DiscPropertiesObject) {
    return Math.sqrt(ballProperties.xspeed ** 2 + ballProperties.yspeed ** 2) * this.speedCoefficient;
  }
  private handleGK(players: Map<number, PlayerData>, redTeam: number[], blueTeam: number[]) {
    if (this.playSituation !== Situation.play) return;
    let redGK: PlayerData | null = null;
    let blueGK: PlayerData | null = null;
    for (let playerId of redTeam.concat(blueTeam)) {
      let player = players.get(playerId)!;
      if (redTeam.includes(playerId)) {
        if (redGK === null) {
          redGK = player;
          continue;
        }
        if (player.position.x < redGK.position.x) {
          redGK = player;
          continue;
        }
      } else if (blueTeam.includes(playerId)) {
        if (blueGK === null) {
          blueGK = player;
          continue;
        }
        if (player.position.x > blueGK?.position.x) {
          blueGK = player;
          continue;
        }
      }
    }
    if (redGK) this.game.redCompositions.filter(e => e.player.id == redGK.id).forEach(e => e.GKTicks++);
    if (blueGK) this.game.blueCompositions.filter(e => e.player.id == blueGK.id).forEach(e => e.GKTicks++);
  }
  private getGKRed() {
    return this.getGK(this.game.redCompositions);
  }
  private getGKBlue() {
    return this.getGK(this.game.blueCompositions);
  }
  private getGK(compositions: PlayerComposition[]): PlayerComposition | null {
    let gk: PlayerComposition | null = compositions.reduce((prev, curr) => {
      return (prev.GKTicks > curr.GKTicks) ? prev : curr
    }, compositions[0] ?? null);
    return gk;
  }

  private checkGoalKickTouchLast() {
    return this.checkGoalKickTouch(this.game.touchArray.length - 1);
  }
  private checkGoalKickTouchPrev() {
    return this.checkGoalKickTouch(this.game.touchArray.length - 2);
  }
  private checkGoalKickTouch(index: number): BallTouch {
    let goal = this.getGoalGame();
    if (this.game.touchArray.length >= index + 1) {
      let obj = this.game.touchArray[index];
      if (obj != null && obj.goal != null && obj.goal == goal) return obj;
    }
    return this.emptyBallTouch;
  }

  private getGoalGame() {
    return this.game.goals.length;
    // return this.game.scores.red + this.game.scores.blue;
  }
  private getSpeedCoefficient(ballDisc: DiscPropertiesObject|null) {
    return 100 / (5 * (ballDisc?.invMass ?? 1.4) * ((ballDisc?.damping ?? 0.99) ** 60 + 1));
  }
  private getTriggerDistance() {
    return this.playerRadius + this.ballRadius + 0.01;
  }
}

function STLog(txt: string) {
  // console.log('#ST#' + txt);
}
