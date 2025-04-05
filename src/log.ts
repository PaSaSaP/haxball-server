import { getTimestampHMS } from "./utils";

let hb_debug_enabled = true;

export function hb_log(msg: string, timestamp: boolean = false) {
  if (!hb_debug_enabled) return;
  let txt = msg;
  if (timestamp) txt = `[${getTimestampHMS()}] ${txt}`;
  txt = '#HB# ' + msg;
  console.debug(txt);
}
