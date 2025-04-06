import { Colors } from "./colors";
import { HaxballRoom } from "./hb_room";

export class GhostPlayers {
  hbRoom: HaxballRoom;
  next_time_ghosted: number;
  current_ghosts: Map<number, number>;
  enabled: boolean;
  constructor(hbRoom: HaxballRoom) {
    this.hbRoom = hbRoom;
    this.next_time_ghosted = 0;
    this.current_ghosts = new Map();
    this.enabled = false;
  }

  handleGameTick(scores: ScoresObject, redTeam: number[], blueTeam: number[]) {
    if (!this.enabled) return;
    if (scores.time > this.next_time_ghosted) {
      this.ghostPlayers(redTeam, blueTeam);
      this.hbRoom.sendMsgToAll("Ha! Twój umysł został przejęty przez innego gracza!", Colors.OrangeTangelo, "bold", 2);
      this.updateNextTimeGhosted();
    }
  }

  handleGameStart() {
    if (!this.enabled) return;
    this.reset();
    this.next_time_ghosted = 0;
    this.updateNextTimeGhosted();
    this.next_time_ghosted = 0; // TODO trigger on start
  }

  handleGameStop() {
    this.reset();
  }

  private ghostPlayers(redTeam: number[], blueTeam: number[]) {
    let playerIds = redTeam.concat(blueTeam);

    let shuffledPlayerIds = playerIds.slice(0);
    for (let i = 0; i < shuffledPlayerIds.length; ++i) {
      let currentGhost = this.current_ghosts.get(shuffledPlayerIds[i]);
      if (currentGhost) shuffledPlayerIds[i] = currentGhost;
    }
    let attempts = 0;
    do {
      shuffledPlayerIds = this.shuffleArray([...shuffledPlayerIds]);
      attempts++;
    } while (shuffledPlayerIds.some((id, idx) => id === playerIds[idx]) && attempts < 10);

    this.current_ghosts.clear();
    for (let i = 0; i + 1 < shuffledPlayerIds.length; i += 2) {
      let playerA = shuffledPlayerIds[i];
      let playerB = shuffledPlayerIds[i + 1];
      this.hbRoom.room.setGhostPlayer(playerA, playerB);
      this.hbRoom.room.setGhostPlayer(playerB, playerA);
      this.current_ghosts.set(playerA, playerB);
      this.current_ghosts.set(playerB, playerA);
    }
  }

  private shuffleArray<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  private updateNextTimeGhosted() {
    const randomInt = Math.floor(Math.random() * (20 - 10 + 1)) + 10;
    this.next_time_ghosted += randomInt;
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  reset() {
    this.next_time_ghosted = 0;
    this.hbRoom.room.clearGhostPlayers();
  }
}