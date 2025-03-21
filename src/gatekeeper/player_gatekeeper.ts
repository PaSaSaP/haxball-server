import * as fs from 'fs/promises';
import { HaxballRoom } from "../hb_room";
import { PlayerData } from "../structs";
import { getTimestampHMS } from '../utils';

export class PlayerGatekeeper {
  hbRoom: HaxballRoom;
  strategy: string;
  minRank: number;
  minPlayers: number;
  percentile: number;
  minTrustLevel: number;
  kickBelowRank: number;
  enabled: boolean;
  configPath: string;

  lastConfigMTime: number | null = null;
  monitorInterval: NodeJS.Timeout | null = null;
  constructor(hbRoom: HaxballRoom) {
    this.hbRoom = hbRoom;
    this.strategy = 'rank_limit';
    this.minRank = 1500;
    this.minPlayers = 6;
    this.percentile = 70;
    this.minTrustLevel = 1;
    this.kickBelowRank = 1400;
    this.enabled = false;
    this.configPath = `./src/gatekeeper/config_${hbRoom.room_config.selector}.json`;
    if (this.hbRoom.room_config.subselector == '1')
      this.startConfigMonitor();
  } 

  private async loadConfig(force: boolean = false) {
    try {
      const stats = await fs.stat(this.configPath);
      const mtime = stats.mtimeMs;

      if (!force && this.lastConfigMTime !== null && this.lastConfigMTime === mtime) {
        return;
      }

      const rawData = await fs.readFile(this.configPath, 'utf-8');
      const config = JSON.parse(rawData);
      this.strategy = config.strategy;
      this.minRank = config.minRank;
      this.minPlayers = config.minPlayers;
      this.percentile = config.percentile;
      this.minTrustLevel = config.minTrustLevel;
      this.kickBelowRank = config.kickBelowRank;
      this.enabled = config.enabled;
      this.lastConfigMTime = mtime;

      PGLog(`Updated gatekeeper config`);
    } catch (error) {
      PGLog(`Error loading config: ${error}`);
    }
  }

  private startConfigMonitor() {
    this.monitorInterval = setInterval(() => this.loadConfig(), 5000);
  }

  stopConfigMonitor() {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
  }

  handlePlayerJoin(playerExt: PlayerData) {
    if (!this.enabled) return false;
    let players = Array.from(this.hbRoom.getPlayersExt()).filter(e => this.filterAfk(e));
    if (players.length < this.minPlayers) return false;
    if (playerExt.trust_level < this.minTrustLevel) return this.kick(playerExt);
    if (!playerExt.stat.glickoPlayer) return this.kick(playerExt, "Poćwicz na Freestyle");
    if (this.strategy === 'rank_limit') {
      if (playerExt.R() < this.minRank) return this.kick(playerExt);
    } else if (this.strategy == 'percentile') {
      const ratings = players.map(e => e.stat.glickoPlayer!.getRating());
      const thr = this.calculatePercentileThreshold(ratings, this.percentile);
      if (playerExt.R() < thr) return this.kick(playerExt);
    }
    return false;
  }

  handleGameStop() {
    if (!this.enabled) return false;
    let players = Array.from(this.hbRoom.getPlayersExt()).filter(e => this.filterAfk(e));
    if (players.length < this.minPlayers + 1) return false;
    players.sort((a, b) => a.R() - b.R());
    let weakest = players.reduce((min, p) => (p.R() < min.R() ? p : min), players[0]);
    if (weakest.R() < this.kickBelowRank) return this.kick(weakest);
  }

  filterAfk(player: PlayerData) {
    return !player.afk && !player.afk_maybe && !this.hbRoom.isPlayerIdHost(player.id);
  }

  updateConfig() {
    this.loadConfig();
  }

  private kick(playerExt: PlayerData, reason: string = "Poćwicz na #2") {
    this.hbRoom.room.kickPlayer(playerExt.id, reason, false);
    return true;
  }

  private calculatePercentileThreshold(ratings: number[], percentile: number): number {
    if (ratings.length === 0) return 0;
    const sorted = ratings.slice().sort((a, b) => a - b);
    return sorted[Math.ceil((percentile / 100) * sorted.length) - 1];
  }
}

function PGLog(txt: string) {
  console.log(`#M# [${getTimestampHMS()}] ${txt}`);
}
