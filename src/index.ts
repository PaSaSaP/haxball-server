require("global-agent/bootstrap");

console.log('HTTP_PROXY:', process.env.GLOBAL_AGENT_HTTP_PROXY);
console.log('HTTPS_PROXY:', process.env.GLOBAL_AGENT_HTTPS_PROXY);
console.log('NODE_TLS_REJECT_UNAUTHORIZED:', process.env.NODE_TLS_REJECT_UNAUTHORIZED);
console.log('HX_ROOM_CONFIG_SELECTOR:', process.env.HX_ROOM_CONFIG_SELECTOR);

if (!process.env.HX_ROOM_CONFIG_SELECTOR) {
  throw new Error("HX_ROOM_CONFIG_SELECTOR is not set!");
}

import { promises as fs } from "fs";
import HaxballJS from 'haxball.js';
import { hb_room_main } from './hb_room';
import * as config from './config';

async function getTokenFromFile(selector: string): Promise<string> {
  try {
    const filePath = `dynamic/token_${selector}.txt`;
    const data = (await fs.readFile(filePath, "utf8")).trim();
    return data;
  } catch (error: any) {
    if (error.code === "ENOENT") {
      return "";
    }
    throw error;
  }
}

const roomConfig = config.getRoomConfig(process.env.HX_ROOM_CONFIG_SELECTOR);

HaxballJS.then((HBInit) => {
  // Same as in Haxball Headless Host Documentation
  getTokenFromFile(roomConfig.selector).then((userToken) => {
    if (userToken.length) roomConfig.token = userToken;
    const room = HBInit({
      roomName: roomConfig.roomName,
      maxPlayers: roomConfig.maxPlayers,
      public: roomConfig.isPublic,
      geo: roomConfig.geo,
      noPlayer: roomConfig.noPlayer,
      token: roomConfig.token,
    });
    hb_room_main(room, roomConfig);
  })
}).catch((e) => {
  console.error(`Got error at MAIN: ${e}`);
});

import { tokenDatabase } from './token_database';
tokenDatabase.updateServerStatus(roomConfig.selector, false);
