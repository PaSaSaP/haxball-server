import { randomInt } from "crypto";
import { Colors } from "./colors";
import { HaxballRoom } from "./hb_room";
import { PlayerData } from "./structs";

export class TimingReaction {
  private hbRoom: HaxballRoom;
  private lastStarted: number;
  private moveBallAt: number;
  private endAt: number;
  private selectedSide: number;
  private inProgress: boolean;
  private reactions: Map<number, number>;
  private static startMsg = 'Za chwilę pojawi się piłka! Naciśnij strzałkę w lewo lub prawo! Bądź czujny...';
  private enabled: boolean;
  constructor(hbRoom: HaxballRoom) {
    this.hbRoom = hbRoom;
    this.lastStarted = 0;
    this.moveBallAt = 0;
    this.endAt = 0;
    this.selectedSide = 0;
    this.inProgress = false;
    this.reactions = new Map();
    this.enabled = false;
  }

  handleGameStart() {
    this.enabled = this.hbRoom.feature_pressure_stadium;
    this.lastStarted = this.hbRoom.current_time + 10_000;
  }

  handleGameTick(currentTime: number, players: Map<number, PlayerData>) {
    if (!this.enabled) return;
    if (!this.inProgress && currentTime > this.lastStarted) {
      this.sendMsg(players, TimingReaction.startMsg);
      this.moveBallAt = 1000 + randomInt(2000);
      this.selectedSide = this.moveBallAt % 2 === 0 ? 100 : -100;
      this.reactions.clear();
      this.inProgress = true;
    } else if (this.inProgress) {
      if (this.moveBallAt > 0 && currentTime > this.moveBallAt) {
        this.hbRoom.room.setDiscProperties(7, { x: this.selectedSide });
        this.moveBallAt = 0;
        this.endAt = this.moveBallAt + 2000;
      } else if (this.moveBallAt === 0 && currentTime < this.moveBallAt) {
        players.forEach(p => {
          if (!this.reactions.has(p.id) && !p.team && p.finger_game) {
            const input = this.hbRoom.room.getPlayerInput(p.id);
          }
        })
      }
    }
  }

  sendMsg(players: Map<number, PlayerData>, txt: string) {
    players.forEach(p => {
      if (!p.team && p.finger_game) {
        this.hbRoom.sendMsgToPlayer(p, txt, Colors.BrightBlue, 'italic');
      }
    })
  }
}
