import { Colors } from "./colors";
import { HaxballRoom } from "./hb_room";
import { hb_log } from "./log";
import { PlayersGameState, PlayerData } from "./structs";

export class PlayersGameStateManager {
  hb_room: HaxballRoom;
  players_game_state: Map<string, PlayersGameState>; // by auth

  constructor(hb_room: HaxballRoom) {
    this.hb_room = hb_room;
    this.players_game_state = new Map<string, PlayersGameState>();
  }

  initPlayersGameState() {
    this.hb_room.game_state.getAllPlayersGameState().then((result) => {
      this.players_game_state = result;
      hb_log(`#I# initPlayersGameState(${this.players_game_state.size})`);
    })
  }

  checkIfPlayerIsNotTimeKicked(player: PlayerObject) {
    let pgState = this.players_game_state.get(player.auth);
    if (!pgState) return false;
    const now = Date.now();
    if (now < pgState.kicked_to) {
      this.hb_room.room.kickPlayer(player.id,`Aj, ${Math.round((pgState.kicked_to-now)/1000)} sekund!`, false);
      return true;
    }
    return false;
  }

  isPlayerTimeMuted(player: PlayerData, sendInfo=false) {
    let pgState = this.players_game_state.get(player.auth_id);
    if (!pgState) return false;
    const now = Date.now();
    if (now < pgState.muted_to) {
      if (sendInfo) this.hb_room.sendMsgToPlayer(player, `Aj, czasowy mute jeszcze przez ${Math.round((pgState.muted_to - now)/1000)}`, Colors.Warning);
      return true;
    }
    return false;
  }

  setPlayerTimeMuted(player: PlayerData, seconds: number) {
    const upTo = Date.now() + seconds * 1000;
    let pgState = this.get(player.auth_id);
    pgState.muted_to = upTo;
    this.hb_room.game_state.updateOrInsertPlayerStateMuted(player.auth_id, upTo);
  }

  setPlayerTimeKicked(player: PlayerData, seconds: number, kick=false) {
    const now = Date.now();
    const upTo = now + seconds * 1000;
    let pgState = this.get(player.auth_id);
    pgState.kicked_to = upTo;
    if (kick) this.hb_room.room.kickPlayer(player.id, `Na ${seconds} sekund!`, false);
    this.hb_room.game_state.updateOrInsertPlayerStateKicked(player.auth_id, upTo);
  }

  private get(authId: string): PlayersGameState {
    if (!this.players_game_state.has(authId)) {
      this.players_game_state.set(authId, {"kicked_to": 0, "muted_to": 0});
    }
    return this.players_game_state.get(authId)!;
  }
}
