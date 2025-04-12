export enum MatchState {
  lobby,
  started,
  ballInGame,
  afterGoal,
  afterReset,
  afterVictory,
}

export class CurrentMatchState {
  private currentScores: ScoresObject;
  private matchState: MatchState;
  constructor() {
    this.currentScores = this.getZeroedScores();
    this.matchState = MatchState.lobby;
  }

  getState() {
    return this.matchState;
  }

  getScores() {
    return this.currentScores;
  }

  reset() {
    this.matchState = MatchState.lobby;
    this.currentScores = this.getZeroedScores();
  }

  isLobbyTime(): boolean {
    return this.matchState === MatchState.lobby || this.matchState === MatchState.afterVictory;
  }

  isGameInProgress(): boolean {
    return this.matchState === MatchState.ballInGame || this.matchState === MatchState.afterReset || this.matchState === MatchState.started;
  }

  isBallInGame() {
    return this.matchState === MatchState.ballInGame;
  }

  handleGameStart() {
    this.matchState = MatchState.started;
    this.currentScores = this.getZeroedScores();
  }

  handleGameStop() {
    // TODO don't know if below will break anything
    // this.matchState = MatchState.lobby;
  }

  handleGameTick(scores: ScoresObject) {
    if (scores.time > this.currentScores.time) {
      if (this.matchState === MatchState.ballInGame || this.matchState === MatchState.afterReset || this.matchState === MatchState.started) {
        this.matchState = MatchState.ballInGame;
      }
    }
    this.currentScores = scores;
  }

  handlePositionsReset() {
    this.matchState = MatchState.afterReset;
  }

  handleTeamGoal() {
    this.matchState = MatchState.afterGoal;
  }

  handleTeamVictory() {
    this.matchState = MatchState.afterVictory;
  }

  private getZeroedScores(): ScoresObject {
    return { blue: 0, red: 0, scoreLimit: 3, timeLimit: 3, time: 0 };
  }
}