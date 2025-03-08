import { PlayerData } from "./structs";
import { getTimestampHMS } from "./utils";

let hb_log_chat_to_console_enabled = true;
let hb_debug_enabled = true;

export function hb_log_to_console(player: PlayerObject | PlayerData, msg: string) {
  if (!hb_log_chat_to_console_enabled) return;
  console.debug(`[${getTimestampHMS()} ${player.name}][${player.id}] ${msg}`);
}

export function hb_log(msg: string, timestamp: boolean = false) {
  if (!hb_debug_enabled) return;
  let txt = msg;
  if (timestamp) txt = `[${getTimestampHMS()}] ${txt}`;
  console.debug(txt);
}
