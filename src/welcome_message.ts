import { PlayerData } from "./structs";

class WelcomeMessage {
  private msgNonTrusted: string[];
  private msg: string;
  callback: (player: PlayerData, msg: string) => void;
  constructor(callback: (player: PlayerData, msg: string) => void) {
    this.msgNonTrusted = [];
    this.msg = '';
    this.callback = callback;
  }
  setMessageNonTrusted(msgs: string[]) {
    this.msgNonTrusted = msgs;
  }
  setMessage(msg: string) {
    this.msg = msg;
  }
  sendWelcomeMessage(player: PlayerData, players: Map<number, PlayerData>) {
    if (player.trust_level && this.msg.length) this.callback(player, this.msg);
    else if (!player.trust_level && this.msgNonTrusted.length) {
      for (const msg of this.msgNonTrusted) {
        this.callback(player, msg);
      }
    }
    this.sendAboutNonTrustedToOthers(player, players);
  }
  private sendAboutNonTrustedToOthers(player: PlayerData, players: Map<number, PlayerData>) {
    if (player.trust_level) return;
    const txt = `Nowy gracz z zerowym poziomem zaufania! Daj mu tymczasowy trust: !xt @${player.name}| stały trust: !t @${player.name}`;
    players.forEach(p => {
      if (p.id !== player.id && p.trust_level) {
        this.callback(p, txt);
      }
    });
  }
}

export default WelcomeMessage;
