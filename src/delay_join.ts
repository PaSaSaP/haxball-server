import { SyntheticModule } from "vm";
import { PlayerData } from "./structs";

export class DelayJoiner {
  playerTimers: Map<number, NodeJS.Timeout>;
  onDelayJoin: (player: PlayerData) => void;
  shouldBeDelayed: () => boolean;
  enabled: boolean;
  DelayTime: number = 5 * 1000;

  constructor(onDelayJoin: (player: PlayerData) => void, shouldBeDelayed: () => boolean, enabled: boolean) {
    this.playerTimers = new Map();
    this.enabled = enabled;
    this.onDelayJoin = onDelayJoin;
    this.shouldBeDelayed = shouldBeDelayed;
  }

  handlePlayerJoin(playerExt: PlayerData) {
    if (!this.enabled || this.DelayTime <= 0 || !this.shouldBeDelayed()) return this.onDelayJoin(playerExt);
    this.playerTimers.set(playerExt.id, setTimeout(() => {
      this.onDelayJoin(playerExt);
      this.playerTimers.delete(playerExt.id);
    }, this.DelayTime));
  }

  handlePlayerLeave(playerExt: PlayerData) {
    let timer = this.playerTimers.get(playerExt.id);
    if (timer) {
      clearTimeout(timer);
      this.playerTimers.delete(playerExt.id);
    }
  }
}
