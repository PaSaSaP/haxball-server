import { HaxballRoom } from "./hb_room";
import { hb_log } from "./log";
import { PlayerData } from "./structs";

export class VipOptionsHandler {
  hbRoom: HaxballRoom;
  playerVipOptions: Map<number, string[]>;
  constructor(hbRoom: HaxballRoom) {
    this.hbRoom = hbRoom;
    this.playerVipOptions = new Map();
  }

  async handlePlayerJoin(player: PlayerData): Promise<number> {
    try {
      let options = await this.hbRoom.game_state.getVipOptionsForPlayer(player.auth_id);
      if (!options) return 0;
      const now = Date.now();
      let newOptions = 0;
      for (let option of options) {
        if (option.time_to > now) {
          VIPLog(`${player.name} enabling ${option.option}`);
          if (!this.playerVipOptions.has(player.id)) this.playerVipOptions.set(player.id, []);
          else this.playerVipOptions.get(player.id)!.push(option.option);
          if (option.option === 'vip_afk') {
            player.vip_data.afk_mode = 1;
            ++newOptions;
          } else {
            VIPLog(`Unknown option ${option.option} for ${player.name}`);
          }
        }
      }
      return newOptions;
    } catch (e) { VIPLog(`!! handlePlayerJoin error: ${e}`); return 0; }
  }

  getOptionNames(playerId: number): string[] {
    if (!this.playerVipOptions.has(playerId)) return [];
    return this.playerVipOptions.get(playerId)!;
  }
}

function VIPLog(txt: string) {
  hb_log(`#VIP# ${txt}`);
}
