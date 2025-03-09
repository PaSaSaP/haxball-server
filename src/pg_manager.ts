import { Colors } from "./colors";
import { HaxballRoom } from "./hb_room";
import { hb_log } from "./log";
import { PlayersGameState, NetworksGameState, PlayerData } from "./structs";

export class PlayersGameStateManager {
  hb_room: HaxballRoom;
  players_game_state: Map<string, PlayersGameState>; // by auth
  networks_game_state: Map<string, NetworksGameState>; // by conn

  constructor(hb_room: HaxballRoom) {
    this.hb_room = hb_room;
    this.players_game_state = new Map<string, PlayersGameState>();
    this.networks_game_state = new Map<string, NetworksGameState>();
  }

  initAllGameState() {
    this.hb_room.game_state.getAllPlayersGameState().then((result) => {
      this.players_game_state = result;
      hb_log(`#I# playersGameState(${this.players_game_state.size})`);
    });
    this.hb_room.game_state.getAllNetworksGameState().then((result) => {
      this.networks_game_state = result;
      hb_log(`#I# networksGameState(${this.networks_game_state.size})`);
    })
  }

  checkIfPlayerIsNotTimeKicked(player: PlayerObject) {
    // it is when player is connecting so auth and conn are available here
    let pgState = this.players_game_state.get(player.auth);
    if (pgState) {
      const now = Date.now();
      if (now < pgState.kicked_to) {
        this.hb_room.room.kickPlayer(player.id, `Aj, ${Math.round((pgState.kicked_to - now) / 1000)} sekund!`, false);
        return true;
      }
    }
    let nState = this.networks_game_state.get(player.conn);
    if (nState) {
      const now = Date.now();
      if (now < nState.kicked_to) {
        this.hb_room.room.kickPlayer(player.id, `Aj, ${Math.round((nState.kicked_to - now) / 1000)} sekund!`, false);
        return true;
      }
    }
    return false;
  }

  isPlayerTimeMuted(player: PlayerData, sendInfo=false) {
    let pgState = this.players_game_state.get(player.auth_id);
    if (pgState) {
      const now = Date.now();
      if (now < pgState.muted_to) {
        if (sendInfo) this.hb_room.sendMsgToPlayer(player, `Aj, czasowy mute jeszcze przez ${Math.round((pgState.muted_to - now) / 1000)}`, Colors.Warning);
        return true;
      }
    }
    let nState = this.networks_game_state.get(player.conn_id);
    if (nState) {
      const now = Date.now();
      if (now < nState.muted_to) {
        if (sendInfo) this.hb_room.sendMsgToPlayer(player, `Aj, czasowy mute jeszcze przez ${Math.round((nState.muted_to - now) / 1000)}`, Colors.Warning);
        return true;
      }
    }
    return false;
  }

  setPlayerTimeMuted(player: PlayerData, seconds: number) {
    const [now, upTo] = this.getNowAndUpTo(seconds);
    let pgState = this.getP(player.auth_id);
    pgState.muted_to = upTo;
    this.hb_room.game_state.updateOrInsertPlayerStateMuted(player.auth_id, upTo);
  }

  setPlayerTimeKicked(player: PlayerData, seconds: number, kick=false) {
    const [now, upTo] = this.getNowAndUpTo(seconds);
    let pgState = this.getP(player.auth_id);
    pgState.kicked_to = upTo;
    if (kick) this.hb_room.room.kickPlayer(player.id, `Na ${seconds} sekund!`, false);
    this.hb_room.game_state.updateOrInsertPlayerStateKicked(player.auth_id, upTo);
  }

  setNetworkTimeMuted(player: PlayerData, seconds: number) {
    const [now, upTo] = this.getNowAndUpTo(seconds);
    let nState = this.getN(player.conn_id);
    nState.muted_to = upTo;
    this.hb_room.game_state.updateOrInsertNetworkStateMuted(player.conn_id, upTo);
  }

  setNetworkTimeKicked(player: PlayerData, seconds: number, kick=false) {
    const [now, upTo] = this.getNowAndUpTo(seconds);
    let nState = this.getN(player.conn_id);
    nState.kicked_to = upTo;
    if (kick) this.hb_room.room.kickPlayer(player.id, `Na ${seconds} sekund!`, false);
    this.hb_room.game_state.updateOrInsertNetworkStateKicked(player.conn_id, upTo);
  }

  private getP(authId: string): PlayersGameState {
    if (!this.players_game_state.has(authId)) {
      this.players_game_state.set(authId, {"kicked_to": 0, "muted_to": 0});
    }
    return this.players_game_state.get(authId)!;
  }

  private getN(connId: string): NetworksGameState {
    if (!this.networks_game_state.has(connId)) {
      this.networks_game_state.set(connId, {"kicked_to": 0, "muted_to": 0});
    }
    return this.networks_game_state.get(connId)!;
  }

  private getNowAndUpTo(seconds: number): [number, number] {
    const now = Date.now();
    const upTo = now + seconds * 1000;
    return [now, upTo]; 
  }
}
