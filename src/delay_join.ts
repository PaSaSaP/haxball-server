import { PlayerData } from "./structs";

export class DelayJoiner {
  playerTimers: Map<number, NodeJS.Timeout>;
  onDelayJoin: (player: PlayerData) => void;
  onGameStop: (player: PlayerData) => void;
  shouldBeDelayedInSeconds: (player: PlayerData) => number;
  shouldKickOnGameStop: () => boolean;
  enabled: boolean;
  kickZeroTrust: boolean;
  playersOnGameStop: PlayerData[];

  constructor(onDelayJoin: (player: PlayerData) => void,
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
  handlePlayerJoin(playerExt: PlayerData) {
    if (!this.enabled) return;
    const delayTime = this.shouldBeDelayedInSeconds(playerExt);
    if (delayTime === 0) return this.onDelayJoin(playerExt);
    this.playerTimers.set(playerExt.id, setTimeout(() => {
      this.onDelayJoin(playerExt);
      this.playerTimers.delete(playerExt.id);
    }, delayTime * 1000));
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
