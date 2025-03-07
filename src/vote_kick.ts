import { Colors } from "./colors";
import { AutoBot } from "./auto_mode";
import { PlayerData } from "./structs";
import { getTimestampHMS } from "./utils";

export class VoteKicker {
  autobot: AutoBot;
  team: 0 | 1 | 2;
  voted: PlayerData|null;
  agreedBy: Set<number>;
  disagreedBy: Set<number>;
  at: number;

  constructor(autobot: AutoBot) {
    this.autobot = autobot;
    this.team = 0;
    this.voted = null;
    this.agreedBy = new Set<number>();
    this.disagreedBy = new Set<number>();
    this.at = 0;
  }

  active() {
    return this.team != 0 && this.voted;
  }

  handle(votedPlayer: PlayerData|null, byPlayer: PlayerData) {
    if (this.autobot.isLobbyTime() || !this.autobot.ranked) return;
    if (this.team == 0) {
      if (!votedPlayer || !votedPlayer.team) return;
      if (byPlayer.team && votedPlayer.team == byPlayer.team) {
        this.at = Date.now();
        this.team = byPlayer.team as 0|1|2;
        this.voted = votedPlayer;
        this.agreedBy.add(byPlayer.id);
        this.autobot.hb_room.sendMsgToAll(`(!votekick) Rozpoczęto szkalowanie gracza ${votedPlayer.name} (!votekick !tak !yes !nie !no)`, Colors.BrightBlue, 'italic');
        AMLog(`votekick ${votedPlayer.name} by ${byPlayer.name}`);
      }
      return; // added new votekick so no more here
    }
    this.handleYes(byPlayer);
  }

  handleYes(byPlayer: PlayerData) {
    if (this.autobot.isLobbyTime() || !this.autobot.ranked) return;
    if (!this.voted || this.voted.id == byPlayer.id) return;
    this.agreedBy.add(byPlayer.id);
    this.check();
    AMLog(`votekick BY: ${byPlayer.name} YES`);
  }

  handleNo(byPlayer: PlayerData) {
    if (this.autobot.isLobbyTime() || !this.autobot.ranked) return;
    if (!this.voted || this.voted.id == byPlayer.id) return;
    this.disagreedBy.add(byPlayer.id);
    this.check();
    AMLog(`votekick BY: ${byPlayer.name} NO`);
  }

  handleChangeAssignment(player: PlayerData) {
    if (this.team != 0 && this.voted && player.id == this.voted.id && !player.team) this.reset();
  }

  check() {
    if (!this.team || !this.voted) return;
    if (Date.now() - this.at > 60_000) {
      this.autobot.hb_room.sendMsgToAll(`(!votekick) Upłynął limit czasu na szkalowanie gracza ${this.voted.name}`, Colors.BrightBlue, 'italic');
      this.reset();
      return;
    }
    const y = this.agreedBy.size;
    const n = this.disagreedBy.size;
    if (n >= y + 3) {
      this.autobot.hb_room.sendMsgToAll(`(!votekick) Wniosek o szkalowanie gracza ${this.voted.name} odrzucony (${y}/${n})`, Colors.BrightBlue, 'italic');
      this.reset();
      return;
    }
    if (y >= n + 3) {
      this.autobot.hb_room.sendMsgToAll(`(!votekick) Wniosek o szkalowanie gracza ${this.voted.name} przyjęty (${y}/${n})`, Colors.BrightBlue, 'italic');
      this.autobot.movePlayerToSpec(this.voted, this.team == 1 ? this.autobot.redTeam : this.autobot.blueTeam);
      this.autobot.fillByPreparedSelection();
      this.reset();
      return;
    }
  }

  reset() {
    this.team = 0;
    this.voted = null;
    this.agreedBy.clear();
    this.disagreedBy.clear();
  }
}


function AMLog(text: string) {
  console.log(`#VK# [${getTimestampHMS()}] ${text}`);
}
