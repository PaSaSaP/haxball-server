import { Colors } from "./colors";
import { HaxballRoom } from "./hb_room";
import { PlayerData } from "./structs";
import { getTimestampHMS } from "./utils";

export class StepMove {
  private hbRoom: HaxballRoom;
  private currentTick: number;
  private logsEnabled: boolean;
  private enabled: boolean;
  constructor(hbRoom: HaxballRoom) {
    this.hbRoom = hbRoom;
    this.currentTick = 0;
    this.logsEnabled = false;
    this.enabled = false;
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    this.hbRoom.room.setStepMove(enabled);
    // this.setLogsEnabled(enabled);
  }

  setLogsEnabled(enabled: boolean) {
    this.logsEnabled = enabled;
  }

  handleGameStart() {
    this.currentTick = 0;
  }

  handleGameTick(currentTime: number, players: PlayerData[]) {
    if (!this.enabled) return;
    this.currentTick++;

    const StepSpeed = 2;
    for (let player of players) {
      if (!player.team) continue;
      // up=1, down=2, left=4, right=8, x=16
      const diff = this.hbRoom.room.getPlayerInputDiff(player.id);
      if (this.logsEnabled && this.currentTick % 60 === 0) TNLog(`${player.name} [${player.id}] diff=${diff}`);
      // if (this.logsEnabled) TNLog(`${player.name} [${player.id}] diff=${diff}`);
      if (!diff) continue;
      const noMoveX = diff & 12;
      const noMoveY = diff & 3;
      if (noMoveX === 12 || noMoveY === 3) continue;
      const up = diff & 1;
      const down = diff & 2;
      const left = diff & 4;
      const right = diff & 8;
      let xspeed = 0;
      let yspeed = 0;
      if (up) yspeed = -StepSpeed;
      else if (down) yspeed = StepSpeed;
      if (left) xspeed = -StepSpeed;
      else if (right) xspeed = StepSpeed;
      if (xspeed && yspeed) {
        this.hbRoom.room.setPlayerDiscProperties(player.id, { xspeed, yspeed });
      } else if (xspeed) {
        xspeed *= 2;
        this.hbRoom.room.setPlayerDiscProperties(player.id, { xspeed });
      } else if (yspeed) {
        yspeed *= 2;
        this.hbRoom.room.setPlayerDiscProperties(player.id, { yspeed });
      }
    }
  }
}

function TNLog(txt: string) {
  console.log(`[${getTimestampHMS()}] #STEP# ${txt}`);
}

