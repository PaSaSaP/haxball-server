import { PlayerData } from "./structs";

export class DelayJoiner {
  playerTimers: Map<number, NodeJS.Timeout>;
  onDelayJoin: (player: PlayerData, kick: boolean) => boolean;
  onGameStop: (player: PlayerData) => void;
  shouldBeDelayedInSeconds: (player: PlayerData) => number;
  shouldKickOnGameStop: () => boolean;
  enabled: boolean;
  kickZeroTrust: boolean;
  playersOnGameStop: PlayerData[];

  constructor(onDelayJoin: (player: PlayerData, kick: boolean) => boolean,
    onGameStop: (player: PlayerData) => void,
    shouldBeDelayed: (player: PlayerData) => number,
    shouldKickOnGameStop: () => boolean,
    enabled: boolean) {
    this.playerTimers = new Map();
    this.enabled = enabled;
    this.kickZeroTrust = true;
    this.playersOnGameStop = [];
    this.onDelayJoin = onDelayJoin;
    this.onGameStop = onGameStop;
    this.shouldBeDelayedInSeconds = shouldBeDelayed;
    this.shouldKickOnGameStop = shouldKickOnGameStop;
  }

  addPlayerOnGameStop(player: PlayerData) {
    this.playersOnGameStop.push(player);
  }
  private createDelayJoinTimer(playerExt: PlayerData, delayTime: number) {
    return () => {
      const newDelay = Math.max(delayTime - 5, 0);
      const joined = this.onDelayJoin(playerExt, newDelay === 0);
      if (joined || newDelay === 0) {
        this.playerTimers.delete(playerExt.id);
      } else {
        this.playerTimers.set(playerExt.id, setTimeout(this.createDelayJoinTimer(playerExt, newDelay), 5 * 1000));
      }
    }
  }

  handlePlayerJoin(playerExt: PlayerData) {
    if (!this.enabled) return;
    const delayTime = this.shouldBeDelayedInSeconds(playerExt);
    if (delayTime === 0) return this.onDelayJoin(playerExt, true);
    this.playerTimers.set(playerExt.id, setTimeout(this.createDelayJoinTimer(playerExt, delayTime), 5 * 1000));
  }

  handlePlayerLeave(playerExt: PlayerData) {
    let timer = this.playerTimers.get(playerExt.id);
    if (timer) {
      clearTimeout(timer);
      this.playerTimers.delete(playerExt.id);
    }
  }

  handleGameStop() {
    if (!this.shouldKickOnGameStop()) return;
    this.playersOnGameStop.forEach(player => {
      this.onGameStop(player);
    })
    this.playersOnGameStop.length = 0;
  }
}
