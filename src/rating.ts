import { PlayerStat, PlayerStatInMatch, Match, PlayerLeavedDueTo } from "./structs";
import Glicko2 from 'glicko2';

interface RatingsOptions {
  scoreLimit: number;
  timeLimit: number; // [minutes]
  interruptedMatchBeta: number; // rescale by time
  interruptedMatchGamma: number; // rescale by goals
}

export class Ratings {
  static options: RatingsOptions;
  private glicko: Glicko2.Glicko2;
  expectedScoreRed: number;
  results: [number, number, number, number, number][];

  constructor(glicko: Glicko2.Glicko2, options: Partial<RatingsOptions> = {}) {
    this.glicko = glicko;
    this.expectedScoreRed = 0;
    this.results = [];
    Ratings.options = { 
      scoreLimit: 3,
      timeLimit: 3,
      interruptedMatchBeta: 0.8,
      interruptedMatchGamma: 0.15,
      ...options,
    };
  }

  private calculateWeightedExpectedScore(
    redTeam: number[],
    blueTeam: number[],
    weights: Map<number, number>,
    oldRatings: Map<number, number>
  ): number {
    let weightedRedRating = 0;
    let totalRedWeight = 0;
    for (const playerId of redTeam) {
      const weight = weights.get(playerId) ?? 1.0;
      const rating = oldRatings.get(playerId) ?? 1500; // Domyślna wartość rankingu
      weightedRedRating += rating * weight;
      totalRedWeight += weight;
    }

    let weightedBlueRating = 0;
    let totalBlueWeight = 0;
    for (const playerId of blueTeam) {
      const weight = weights.get(playerId) ?? 1.0;
      const rating = oldRatings.get(playerId) ?? 1500;
      weightedBlueRating += rating * weight;
      totalBlueWeight += weight;
    }

    const redAvgRating = totalRedWeight > 0 ? weightedRedRating / totalRedWeight : 1500;
    const blueAvgRating = totalBlueWeight > 0 ? weightedBlueRating / totalBlueWeight : 1500;
    this.expectedScoreRed = 100 / (1 + Math.pow(10, (blueAvgRating - redAvgRating) / 400));
    return this.expectedScoreRed;
  }

  private calculatePlayerWeight(stat: PlayerStatInMatch, match: Match, timePlayed: number, matchDuration: number): number {
    if (stat.joinedAt === 0 && stat.leftAt === -1) return 1.0;
    const safeMatchDuration = matchDuration > 0 ? matchDuration : 60 * 6;
    const timeFraction = Math.min(timePlayed / safeMatchDuration, 1.0);
    this.Log(`Player ${stat.id}: timePlayed=${timePlayed}, matchDuration=${safeMatchDuration}, timeFraction=${timeFraction}, weight=${timeFraction}`);
    return timeFraction;
  }

  private rate(match: Match, playerStats: Map<number, PlayerStat>, redTeam: number[], blueTeam: number[]): void {
    const matchDuration = match.matchEndTime;
    const redTeamPlayers: Glicko2.Player[] = [];
    const blueTeamPlayers: Glicko2.Player[] = [];

    for (const playerId of redTeam) {
      const playerStat = playerStats.get(playerId);
      if (!playerStat || !playerStat.glickoPlayer) {
        throw new Error(`Player ${playerId} from red team has no glickoPlayer initialized`);
      }
      redTeamPlayers.push(playerStat.glickoPlayer);
    }

    for (const playerId of blueTeam) {
      const playerStat = playerStats.get(playerId);
      if (!playerStat || !playerStat.glickoPlayer) {
        throw new Error(`Player ${playerId} from blue team has no glickoPlayer initialized`);
      }
      blueTeamPlayers.push(playerStat.glickoPlayer);
    }

    const matches: [Glicko2.Player, Glicko2.Player, number][] = [];
    for (const redPlayer of redTeamPlayers) {
      for (const bluePlayer of blueTeamPlayers) {
        const outcome = match.winnerTeam === 1 ? 1 : match.winnerTeam === 2 ? 0 : 0.5;
        matches.push([redPlayer, bluePlayer, outcome]);
      }
    }

    this.glicko.updateRatings(matches);
  }

  static calculateInterruptedMatchWeight(
    redScore: number,
    blueScore: number,
    limitScore: number,
    playedSeconds: number,
    limitMinutes: number
  ): number {
    const limitSeconds = 60 * limitMinutes;
    if (limitSeconds <= 0 || limitScore <= 0) return 1.0;  // Zabezpieczenie
    // Skalowanie po czasie - im krócej grano, tym niższa waga
    const beta = Ratings.options.interruptedMatchBeta;
    const timeWeight = Math.pow(playedSeconds / limitSeconds, beta);
    // Skalowanie po wyniku - liczymy proporcję strzelonych bramek względem możliwych
    const goalFactor = (redScore + blueScore) / (2 * limitScore);
    const gamma = Ratings.options.interruptedMatchGamma;  // Jak bardzo bramki wpływają na wagę
    let weight = timeWeight + gamma * goalFactor;
    // Ograniczenie do sensownego zakresu [0.01, 1.0]
    return Math.min(1.0, Math.max(0.01, weight));
  }

  calculateNewPlayersRating(match: Match, playerStats: Map<number, PlayerStat>) {
    const matchDuration = match.matchEndTime;
    const fullTimeMatchPlayed = match.fullTimeMatchPlayed;
    const weights: Map<number, number> = new Map();
    let rescaler = 1.0;
    const oldRatings: Map<number, number> = new Map();
    // if player left at the beginning or player played less than 10 seconds
    const shouldNotRatePlayer = (stat: PlayerStatInMatch) => { return stat.leftAt === 0 || (stat.joinedAt > 0 && matchDuration - stat.joinedAt < 10) };
    const theOnlyRedTeam = match.redTeam.filter(id => !shouldNotRatePlayer(match.stat(id)));
    const theOnlyBlueTeam = match.blueTeam.filter(id => !shouldNotRatePlayer(match.stat(id)));
    const playerIdsInMatch: number[] = theOnlyRedTeam.concat(theOnlyBlueTeam).filter(id => match.stat(id).id == id);
    this.results = [];

    if (!fullTimeMatchPlayed) {
      rescaler = Ratings.calculateInterruptedMatchWeight(match.redScore, match.blueScore, Ratings.options.scoreLimit, matchDuration, Ratings.options.timeLimit);
      this.Log(`Rescaler = ${rescaler} because of ${match.redScore}:${match.blueScore}/${Ratings.options.scoreLimit} t:${matchDuration}/${Ratings.options.timeLimit}`);
    }
    for (const playerId of playerIdsInMatch) {
      const stat = match.stat(playerId);
      let player = playerStats.get(playerId);
      if (!player || !player.glickoPlayer) {
        throw new Error(`Player ${playerId} has null stat or glickoPlayer during update`); // there HAVE TO be set valid one
      }

      const timePlayed = stat.leftAt === -1 ? matchDuration - stat.joinedAt : stat.leftAt - stat.joinedAt;
      const weight = rescaler * this.calculatePlayerWeight(stat, match, timePlayed, matchDuration);
      weights.set(playerId, weight);
      oldRatings.set(playerId, player.glickoPlayer.getRating());
    }

    this.calculateWeightedExpectedScore(theOnlyRedTeam, theOnlyBlueTeam, weights, oldRatings);
    this.rate(match, playerStats, theOnlyRedTeam, theOnlyBlueTeam);

    for (const playerId of playerIdsInMatch) {
      const player = playerStats.get(playerId)!;
      const stat = match.stat(playerId);
      const oldMu = oldRatings.get(playerId)!;
      const newMu = player.glickoPlayer!.getRating();
      const oldRd = player.glickoPlayer!.getRd();
      const weight = weights.get(playerId)!;
      let penalty = 0;
      let adjustedRating = newMu;
      const isLoser = (match.winnerTeam === 1 && match.blueTeam.includes(playerId)) ||
        (match.winnerTeam === 2 && match.redTeam.includes(playerId));

      // Ochrona przed spadkiem dla graczy dołączających w trakcie, jeśli nie opuścili meczu
      if (stat.joinedAt > 0 && (stat.leftDueTo === PlayerLeavedDueTo.none || stat.leftAt === -1)) {
        adjustedRating = Math.max(adjustedRating, oldMu);
        this.Log(`Player ${playerId} joined late, no penalty, rating protected: ${adjustedRating}`);
      }
      if (!isLoser && weight < 1.0 && adjustedRating > oldMu) { // zwycięzca zagrał mecz do końca
        adjustedRating = oldMu + (adjustedRating - oldMu) * weight; // ale nie grał od początku, to skalujemy
      }

      // Kara dla wychodzących w trakcie
      if (stat.leftDueTo !== PlayerLeavedDueTo.none && stat.leftAt > 0 && stat.leftAt -3 < matchDuration) {
        const timeFraction = stat.leftAt / matchDuration;
        let penaltyPercent = 0;
        if (timeFraction < 0.95) {
          switch (stat.leftDueTo) {
            case PlayerLeavedDueTo.afk:
              // value below presents max percentage penalty
              penaltyPercent = 0.04 * (1 - timeFraction);
              break;
            case PlayerLeavedDueTo.voteKicked:
              penaltyPercent = 0.02 * (1 - timeFraction);
              break;
            case PlayerLeavedDueTo.leftServer:
              penaltyPercent = 0.05 * (1 - timeFraction);
              break;
          }
          if (!isLoser) penaltyPercent /= 2;
          penalty = newMu * penaltyPercent; // newMu or adjustedRating?
          adjustedRating = Math.max(adjustedRating - penalty, 0);
          this.Log(`Player ${playerId} penalized: reason=${stat.leftDueTo}, penaltyPercent=${penaltyPercent}, penalty=${penalty}, newRating=${adjustedRating}`);
        }
      }

      this.Log(`id=${player.id} o=${oldMu} n=${newMu} w=${weight} final=${adjustedRating}`);
      player.glickoPlayer!.setRating(adjustedRating);
      this.results.push([playerId, Math.round(oldRd), Math.round(oldMu), Math.round(adjustedRating), Math.round(penalty)]);
    }
  }

  clear() {
    this.glicko.removePlayers();
  }

  debug = false;

  Log(msg: string) {
    if (this.debug) console.log(msg);
  }

  LogTop(firstN?: number) {
    if (!this.debug) return;
    let players = this.glicko.getPlayers();
    let n = firstN ?? players.length;

    console.log(`Top for ${n} players`);
    for (let i = 0; i < n; ++i) {
      let player = players[i];
      console.log(`${i} - mu:${player.getRating()} s:${player.getRd()} v:${player.getVol()}`);
    }
  }
}
