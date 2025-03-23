import { PlayerData } from "./structs";

export class DelayJoiner {
  playerTimers: Map<number, NodeJS.Timeout>;
  onDelayJoin: (player: PlayerData) => void;
  shouldBeDelayed: () => boolean;
  enabled: boolean;
  kickZeroTrust: boolean;
  DelayTimeZeroTrust: number = 60 * 1000;
  DelayTimeOneTrust: number = 15 * 1000;
  DelayTime: number = 5 * 1000;

  constructor(onDelayJoin: (player: PlayerData) => void, shouldBeDelayed: () => boolean, enabled: boolean) {
    this.playerTimers = new Map();
    this.enabled = enabled;
    this.kickZeroTrust = true;
    this.onDelayJoin = onDelayJoin;
    this.shouldBeDelayed = shouldBeDelayed;
  }

  handlePlayerJoin(playerExt: PlayerData) {
    if (!this.enabled || this.DelayTime <= 0 || !this.shouldBeDelayed()) return this.onDelayJoin(playerExt);
    const delayTime = playerExt.trust_level > 1 ? this.DelayTime : playerExt.trust_level ? this.DelayTimeOneTrust : this.DelayTimeZeroTrust;
    this.playerTimers.set(playerExt.id, setTimeout(() => {
      this.onDelayJoin(playerExt);
      this.playerTimers.delete(playerExt.id);
    }, delayTime));
  }

  handlePlayerLeave(playerExt: PlayerData) {
    let timer = this.playerTimers.get(playerExt.id);
    if (timer) {
      clearTimeout(timer);
      this.playerTimers.delete(playerExt.id);
    }
  }
}
