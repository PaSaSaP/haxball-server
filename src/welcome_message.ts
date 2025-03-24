import { PlayerData } from "./structs";

class WelcomeMessage {
  private msgNonTrusted: string;
  private msg: string;
  callback: (player: PlayerData, msg: string) => void;
  constructor(callback: (player: PlayerData, msg: string) => void) {
    this.msgNonTrusted = '';
    this.msg = '';
    this.callback = callback;
  }
  setMessageNonTrusted(msg: string) {
    this.msgNonTrusted = msg;
  }
  setMessage(msg: string) {
    this.msg = msg;
  }
  sendWelcomeMessage(player: PlayerData) {
    if (player.trust_level && this.msg.length) this.callback(player, this.msg);
    else if (!player.trust_level && this.msgNonTrusted.length) {
      for (let i = 0; i < 3; ++i) this.callback(player, this.msgNonTrusted);
    }
  }
}

export default WelcomeMessage;
