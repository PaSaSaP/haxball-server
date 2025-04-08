import * as fs from 'fs/promises';
import { Colors } from "./colors";
import { HaxballRoom } from "./hb_room";
import { hb_log } from "./log";
import { PlayersGameState, NetworksGameState, PlayerData } from "./structs";

export class PlayersGameStateManager {
  hb_room: HaxballRoom;
  players_game_state: Map<string, PlayersGameState>; // by auth
  networks_game_state: Map<string, NetworksGameState>; // by conn
  global_players_game_state: Map<string, PlayersGameState>; // by auth
  global_networks_game_state: Map<string, NetworksGameState>; // by conn
  private log_filename: string;

  constructor(hb_room: HaxballRoom) {
    this.hb_room = hb_room;
    this.players_game_state = new Map();
    this.networks_game_state = new Map();
    this.global_players_game_state = new Map();
    this.global_networks_game_state = new Map();
    this.log_filename = `./dynamic/kick_info.txt`;
  }

  initAllGameState() {
    this.hb_room.game_state.getAllPlayersGameState().then((result) => {
      this.players_game_state = result;
      PGLog(`playersGameState(${this.players_game_state.size})`);
    });
    this.hb_room.game_state.getAllNetworksGameState().then((result) => {
      this.networks_game_state = result;
      PGLog(`networksGameState(${this.networks_game_state.size})`);
    });
    this.hb_room.game_state.getGlobalAllPlayersGameState().then((result) => {
      this.global_players_game_state = result;
      PGLog(`global playersGameState(${this.global_players_game_state.size})`);
    });
    this.hb_room.game_state.getGlobalAllNetworksGameState().then((result) => {
      this.global_networks_game_state = result;
      PGLog(`global networksGameState(${this.global_networks_game_state.size})`);
    });
  }

  checkIfPlayerIsNotTimeKicked(player: PlayerData) {
    // it is when player is connecting so auth and conn are available here
    const now = this.hb_room.current_time;
    const kick = (state: PlayersGameState | NetworksGameState) => {
      this.hb_room.kickPlayerByServer(player, `Aj, ${Math.round((state.kicked_to - now) / 1000)} sekund!`, false);
    }
    let pgState = this.players_game_state.get(player.auth_id);
    if (pgState) {
      if (now < pgState.kicked_to) {
        kick(pgState);
        return true;
      }
    }
    let nState = this.networks_game_state.get(player.conn_id);
    if (nState) {
      if (now < nState.kicked_to) {
        kick(nState);
        return true;
      }
    }
    let globalPgState = this.global_players_game_state.get(player.auth_id);
    if (globalPgState) {
      if (now < globalPgState.kicked_to) {
        kick(globalPgState);
        this.hb_room.kickPlayerByServer(player, `Aj, ${Math.round((globalPgState.kicked_to - now) / 1000)} sekund!`, false);
        return true;
      }
    }
    let globalNState = this.global_networks_game_state.get(player.conn_id);
    if (globalNState) {
      if (now < globalNState.kicked_to) {
        kick(globalNState);
        return true;
      }
    }
    return false;
  }

  isPlayerTimeMuted(player: PlayerData, sendInfo=false) {
    const now = this.hb_room.current_time;
    const muteMsg = (state: PlayersGameState | NetworksGameState) => {
      if (sendInfo) this.hb_room.sendMsgToPlayer(player, `Aj, czasowy mute jeszcze przez ${Math.round((state.muted_to - now) / 1000)}`, Colors.Warning);
    }

    let pgState = this.players_game_state.get(player.auth_id);
    if (pgState) {
      if (now < pgState.muted_to) {
        muteMsg(pgState);
        return true;
      }
    }
    let nState = this.networks_game_state.get(player.conn_id);
    if (nState) {
      if (now < nState.muted_to) {
        muteMsg(nState);
        return true;
      }
    }
    let globalPgState = this.global_players_game_state.get(player.auth_id);
    if (globalPgState) {
      if (now < globalPgState.muted_to) {
        muteMsg(globalPgState);
        return true;
      }
    }
    let globalNState = this.global_networks_game_state.get(player.conn_id);
    if (globalNState) {
      if (now < globalNState.muted_to) {
        muteMsg(globalNState);
        return true;
      }
    }
    return false;
  }

  setPlayerTimeMuted(player: PlayerData, byPlayer: PlayerData, seconds: number) {
    const [now, upTo] = this.getNowAndUpTo(seconds);
    let pgState = this.getP(player.auth_id);
    pgState.muted_to = upTo;
    this.hb_room.game_state.updateOrInsertPlayerStateMuted(player.auth_id, upTo).then(() => { }).catch((e) => {hb_log(`setPlayerTimeMuted error: ${e}`)});;
    const logTxt = this.getLogTxt(player, byPlayer, seconds, "time muted");
    PGLog(logTxt);
    this.logToFile(logTxt);
  }

  setPlayerTimeKicked(player: PlayerData, byPlayer: PlayerData, seconds: number, kick=false) {
    const [now, upTo] = this.getNowAndUpTo(seconds);
    let pgState = this.getP(player.auth_id);
    pgState.kicked_to = upTo;
    if (kick) this.hb_room.kickPlayer(player, byPlayer, `Na ${seconds} sekund!`);
    this.hb_room.game_state.updateOrInsertPlayerStateKicked(player.auth_id, upTo).then(() => { }).catch((e) => {hb_log(`setPlayerTimeKicked error: ${e}`)});;
    const logTxt = this.getLogTxt(player, byPlayer, seconds, "time kicked");
    PGLog(logTxt);
    this.logToFile(logTxt);
  }

  setNetworkTimeMuted(player: PlayerData, byPlayer: PlayerData, seconds: number) {
    const [now, upTo] = this.getNowAndUpTo(seconds);
    let nState = this.getN(player.conn_id);
    nState.muted_to = upTo;
    this.hb_room.game_state.updateOrInsertNetworkStateMuted(player.conn_id, upTo).then(() => { }).catch((e) => {hb_log(`setNetworkTimeMuted error: ${e}`)});;
    const logTxt = this.getLogTxt(player, byPlayer, seconds, "network muted");
    PGLog(logTxt);
    this.logToFile(logTxt);
  }

  setNetworkTimeKicked(player: PlayerData, byPlayer: PlayerData, seconds: number, kick=false) {
    const [now, upTo] = this.getNowAndUpTo(seconds);
    let nState = this.getN(player.conn_id);
    nState.kicked_to = upTo;
    if (kick) this.hb_room.kickPlayer(player, byPlayer, `Na ${seconds} sekund!`);
    this.hb_room.game_state.updateOrInsertNetworkStateKicked(player.conn_id, upTo).then(() => { }).catch((e) => {hb_log(`setNetworkTimeKicked error: ${e}`)});
    const logTxt = this.getLogTxt(player, byPlayer, seconds, "network kicked");
    PGLog(logTxt);
    this.logToFile(logTxt);
  }

  setGloballyPlayerTimeMuted(player: PlayerData, byPlayer: PlayerData, seconds: number) {
    const [now, upTo] = this.getNowAndUpTo(seconds);
    let pgState = this.getGP(player.auth_id);
    pgState.muted_to = upTo;
    this.hb_room.game_state.updateOrInsertGlobalPlayerStateMuted(player.auth_id, upTo).then(() => { }).catch((e) => {hb_log(`global setPlayerTimeMuted error: ${e}`)});;
    const logTxt = this.getLogTxt(player, byPlayer, seconds, "global time muted");
    PGLog(logTxt);
    this.logToFile(logTxt);
  }

  setGloballyPlayerTimeKicked(player: PlayerData, byPlayer: PlayerData, seconds: number, kick=false) {
    const [now, upTo] = this.getNowAndUpTo(seconds);
    let pgState = this.getGP(player.auth_id);
    pgState.kicked_to = upTo;
    if (kick) this.hb_room.kickPlayer(player, byPlayer, `Na ${seconds} sekund!`);
    this.hb_room.game_state.updateOrInsertGlobalPlayerStateKicked(player.auth_id, upTo).then(() => { }).catch((e) => {hb_log(`global setPlayerTimeKicked error: ${e}`)});;
    const logTxt = this.getLogTxt(player, byPlayer, seconds, "global time kicked");
    PGLog(logTxt);
    this.logToFile(logTxt);
  }

  setGloballyNetworkTimeMuted(player: PlayerData, byPlayer: PlayerData, seconds: number) {
    const [now, upTo] = this.getNowAndUpTo(seconds);
    let nState = this.getGN(player.conn_id);
    nState.muted_to = upTo;
    this.hb_room.game_state.updateOrInsertGlobalNetworkStateMuted(player.conn_id, upTo).then(() => { }).catch((e) => {hb_log(`global setNetworkTimeMuted error: ${e}`)});;
    const logTxt = this.getLogTxt(player, byPlayer, seconds, "global network muted");
    PGLog(logTxt);
    this.logToFile(logTxt);
  }

  setGloballyNetworkTimeKicked(player: PlayerData, byPlayer: PlayerData, seconds: number, kick=false) {
    const [now, upTo] = this.getNowAndUpTo(seconds);
    let nState = this.getGN(player.conn_id);
    nState.kicked_to = upTo;
    if (kick) this.hb_room.kickPlayer(player, byPlayer, `Na ${seconds} sekund!`);
    this.hb_room.game_state.updateOrInsertGlobalNetworkStateKicked(player.conn_id, upTo).then(() => { }).catch((e) => {hb_log(`global setNetworkTimeKicked error: ${e}`)});
    const logTxt = this.getLogTxt(player, byPlayer, seconds, "global network kicked");
    PGLog(logTxt);
    this.logToFile(logTxt);
  }

  logKicked(player: PlayerData, byPlayer: PlayerData) {
    const logTxt = this.getLogTxt(player, byPlayer, 0, "just kicked");
    PGLog(logTxt);
    this.logToFile(logTxt);
  }

  private getLogTxt(player: PlayerData, byPlayer: PlayerData, seconds: number, action: string) {
    return `${player.name} [${player.id}] auth: ${player.auth_id} conn: ${player.conn_id} ip: ${player.real_ip} ${action} `
      + `by ${byPlayer.name} [${byPlayer.id}] auth: ${byPlayer.auth_id} for ${seconds} seconds`;
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

  private getGP(authId: string): PlayersGameState {
    if (!this.global_players_game_state.has(authId)) {
      this.global_players_game_state.set(authId, {"kicked_to": 0, "muted_to": 0});
    }
    return this.global_players_game_state.get(authId)!;
  }

  private getGN(connId: string): NetworksGameState {
    if (!this.global_networks_game_state.has(connId)) {
      this.global_networks_game_state.set(connId, {"kicked_to": 0, "muted_to": 0});
    }
    return this.global_networks_game_state.get(connId)!;
  }

  private getNowAndUpTo(seconds: number): [number, number] {
    const now = Date.now();
    const upTo = now + seconds * 1000;
    return [now, upTo];
  }

  private async logToFile(txt: string) {
    const now = this.hb_room.current_date_obj.toISOString();
    const selector = this.hb_room.getSselector();
    this.appendLineToFile(this.log_filename, `${now},${selector},${txt}`);
  }

  private async appendLineToFile(filePath: string, line: string): Promise<void> {
    try {
      await fs.appendFile(filePath, line + '\n');
    } catch (error) {
      PGLog(`Błąd podczas zapisywania do pliku ${filePath}: ${error}`);
    }
  }
}

function PGLog(txt: string) {
  hb_log(`#PG# ${txt}`, true);
}
