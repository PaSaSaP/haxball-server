import * as fs from 'fs/promises';
import { PlayerData } from './structs';
import { HaxballRoom } from './hb_room';
import { hb_log } from './log';

export class PlayerJoinLogger {
  hbRoom: HaxballRoom;
  filename: string;
  positions: Map<number, [number, number][]>;
  positionsEnabled = false;
  constructor(hbRoom: HaxballRoom) {
    this.hbRoom = hbRoom;
    this.filename = `./dynamic/connected_players_${hbRoom.room_config.selector}_${hbRoom.room_config.subselector}.csv`;
    this.positions = new Map();
  }

  r() {
    return this.hbRoom.room;
  }

  pos(player: PlayerData) {
    return this.r().getPlayerDiscProperties(player.id);
  }

  handlePlayerJoin(playerExt: PlayerData) {
    const now = new Date().toISOString();
    this.appendLineToFile(this.filename, `${now},${playerExt.auth_id},${playerExt.conn_id},${playerExt.name},${playerExt.real_ip},${playerExt.name}`);
    this.hbRoom.game_state.probableBotExists(playerExt.auth_id, playerExt.conn_id).then((isBot) => {
      if (isBot) {
        playerExt.bot = true;
        console.log(`BOT AT ${now} WITH NAME: ${playerExt.name} AUTH: ${playerExt.auth_id} CONN: ${playerExt.conn_id} IP: ${playerExt.real_ip}`);
      }
    }).catch((e) => hb_log(`!! probableBotExists error ${e}`));
  }

  handleGameTick(players: PlayerData[]) {
    if (!this.positionsEnabled && !this.hbRoom.bot_stopping_enabled) return;
    for (let player of players) {
      // if (player.trust_level) continue; // person
      // if (player.bot) continue; // currently discovered
      // save for all players so we can compare players vs bots
      const pos = this.pos(player);
      if (!pos) continue;
      if (this.positionsEnabled) {
        if (!this.positions.has(player.id)) this.positions.set(player.id, [[-180, 0]]);
        let positions = this.positions.get(player.id)!;
        const last_pos = positions.at(-1)!;
        const new_pos: [number, number] = [pos.x, pos.y];
        if (last_pos[0] !== new_pos[0] || last_pos[1] !== new_pos[1]) {
          positions.push(new_pos);
        }
      }

      if (this.hbRoom.bot_stopping_enabled && player.bot  && Math.random() < 0.005) {
        this.hbRoom.room.setPlayerDiscProperties(player.id, { "xspeed": -pos.xspeed*2, "yspeed": -pos.yspeed*2 });
      }
    }
  }

  handleGameStart() {
    this.positions.clear();
  }

  handleGameStop() {
    if (!this.positionsEnabled) return;
    const fullSelector = `${this.hbRoom.room_config.selector}-${this.hbRoom.room_config.subselector}`;
    const now = new Date();
    const formattedDate = now.toISOString()
      .replace(/T/, '-')  // Zastępuje 'T' spacją
      .replace(/\..+/, '') // Usuwa milisekundy i strefę czasową
      .replace(/:/g, '-'); // Zamienia ":" na "-"
    for (let [playerId, positions] of this.positions) {
      if (positions.length < 1000) continue; // too low data to analyze
      let player = this.hbRoom.Pid(playerId);
      const fname = `./dynamic/positions/${fullSelector}-${formattedDate}-${player.auth_id}-${player.conn_id}.json`;
      this.saveTupleArrayToJson(fname, positions);
    }
    hb_log(`BOT zapisałem pliki dla ${this.positions.size}`);
  }

  async saveTupleArrayToJson(fileName: string, data: [number, number][]): Promise<void> {
    try {
      const json = JSON.stringify(data);
      await fs.writeFile(fileName, json, 'utf-8');
    } catch (error) {
      console.error(`Błąd podczas zapisywania JSON do pliku ${fileName}:`, error);
    }
  }

  async appendLineToFile(filePath: string, line: string): Promise<void> {
    try {
      await fs.appendFile(filePath, line + '\n');
    } catch (error) {
      console.error(`Błąd podczas zapisywania do pliku ${filePath}:`, error);
    }
  }
}
