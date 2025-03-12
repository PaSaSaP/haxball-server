import { PlayerData } from "./structs";

class WelcomeMessage {
  msg: string;
  callback: (player: PlayerData, msg: string) => void;
  constructor(callback: (player: PlayerData, msg: string) => void) {
    this.msg = '';
    this.callback = callback;
  }
  setMessage(msg: string) {
    this.msg = msg;
  }
  sendWelcomeMessage(player: PlayerData) {
    if (this.msg.length) this.callback(player, this.msg);
  }
}

export default WelcomeMessage;
