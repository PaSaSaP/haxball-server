import { Colors } from "./colors";
import { HaxballRoom } from "./hb_room";

export class Fouls {
  hbRoom: HaxballRoom;
  foulsByRed: number;
  foulsByBlue: number;
  red: number;
  blue: number;
  constructor(hbRoom: HaxballRoom) {
    this.hbRoom = hbRoom;
    this.foulsByRed = 0;
    this.foulsByBlue = 0;
    this.red = 0;
    this.blue = 0;
  }

  incFoulByRed(inc: number) {
    this.foulsByRed += inc;
    if (this.foulsByRed < 0) this.foulsByRed = 0;
    return this.foulsByRed;
  }
  incFoulByBlue(inc: number) {
    this.foulsByBlue += inc;
    if (this.foulsByBlue < 0) this.foulsByBlue = 0;
    return this.foulsByBlue;
  }

  handleGameStart() {
    this.foulsByRed = 0;
    this.foulsByBlue = 0;
    this.red = 0;
    this.blue = 0;
  }

  handleTeamGoal(team: TeamID) {
    if (team === 1) this.red++;
    else if (team === 2) this.blue++;
    const red = this.red - this.foulsByRed;
    const blue = this.blue - this.foulsByBlue;
    this.hbRoom.sendMsgToAll(`Wynik meczu: ${red}:${blue}, faule: ${this.foulsByRed}:${this.foulsByBlue}`, Colors.OrangeTangelo, 'bold');
  }
}
