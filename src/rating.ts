import { PlayerStat, PlayerStatInMatch, Match } from "./structs";
import Glicko2 from 'glicko2';

export class Ratings {
  private glicko: Glicko2.Glicko2;

  constructor(glicko: Glicko2.Glicko2) {
    this.glicko = glicko;
  }

  private calculatePlayerWeight(stat: PlayerStatInMatch, match: Match, timePlayed: number, matchDuration: number): number {
    if (stat.joinedAt === 0 && stat.leavedAt === -1) return 1.0;
    const safeMatchDuration = matchDuration > 0 ? matchDuration : 60*6; // Domyślna wartość, jeśli coś jest nie tak
    const timeFraction = Math.min(timePlayed / safeMatchDuration, 1.0);

    let scoreDifferenceAtJoin = 0;
    const isRedTeam = match.redTeam.includes(stat.id);
    for (const [time, team] of match.goals) {
      if (time <= stat.joinedAt) {
        scoreDifferenceAtJoin += (team === 1 ? 1 : -1) * (isRedTeam ? 1 : -1);
      }
    }
    const scoreAdjustment = Math.max(0.05, 1.0 - Math.abs(scoreDifferenceAtJoin) * 0.3);
    const weight = Math.min(1.0, timeFraction * scoreAdjustment * 0.3);

    this.Log(`Player ${stat.id}: timePlayed=${timePlayed}, matchDuration=${safeMatchDuration}, timeFraction=${timeFraction}, scoreAdjustment=${scoreAdjustment}, weight=${weight}`);

    return weight;
  }

  private rate(match: Match, playerStats: Map<number, PlayerStat>): void {
    const redTeamPlayers: Glicko2.Player[] = [];
    const blueTeamPlayers: Glicko2.Player[] = [];

    for (const playerId of match.redTeam) {
      const playerStat = playerStats.get(playerId);
      if (!playerStat || !playerStat.glickoPlayer) {
        throw new Error(`Player ${playerId} from red team has no glickoPlayer initialized`);
      }
      redTeamPlayers.push(playerStat.glickoPlayer);
    }

    for (const playerId of match.blueTeam) {
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

  updatePlayerStats(match: Match, playerStats: Map<number, PlayerStat>): number[] {
    const matchDuration = match.matchEndTime;
    const weights: Map<number, number> = new Map();
    const oldRatings: Map<number, number> = new Map();
    const playerIdsInMatch: number[] = match.redTeam.concat(match.blueTeam);

    for (const playerId of playerIdsInMatch) {
      const stat = match.stat(playerId);
      let player = playerStats.get(playerId);
      if (!player) {
        throw new Error(`Player ${playerId} has null stat during update`);
      }
      if (!player.glickoPlayer) {
        throw new Error(`Player ${playerId} has null glickoPlayer during update`);
      }

      const timePlayed = stat.leavedAt === -1 ? matchDuration - stat.joinedAt : stat.leavedAt - stat.joinedAt;
      const weight = this.calculatePlayerWeight(stat, match, timePlayed, matchDuration);
      weights.set(playerId, weight);

      oldRatings.set(playerId, player.glickoPlayer.getRating());

      player.totalGames++;
      if (stat.joinedAt === 0 && stat.leavedAt === -1) player.totalFullGames++;
      if ((match.winnerTeam === 1 && match.redTeam.includes(playerId)) || 
          (match.winnerTeam === 2 && match.blueTeam.includes(playerId))) {
        player.wonGames++;
      }
    }

    this.rate(match, playerStats);

    for (const playerId of playerIdsInMatch) {
      const player = playerStats.get(playerId)!;
      const oldMu = oldRatings.get(playerId)!;
      const newMu = player.glickoPlayer!.getRating();
      const weight = weights.get(playerId)!;
      const newRating = oldMu + (newMu - oldMu) * weight;
      this.Log(`id=${player.id} o=${oldMu} n=${newMu} w=${weight} n=${newRating}`);
      player.glickoPlayer!.setRating(newRating); // skalowanie zmiany
    }

    return playerIdsInMatch;
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
