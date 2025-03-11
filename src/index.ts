require("global-agent/bootstrap");

console.log('HTTP_PROXY:', process.env.GLOBAL_AGENT_HTTP_PROXY);
console.log('HTTPS_PROXY:', process.env.GLOBAL_AGENT_HTTPS_PROXY);
console.log('NODE_TLS_REJECT_UNAUTHORIZED:', process.env.NODE_TLS_REJECT_UNAUTHORIZED);
console.log('HX_ROOM_CONFIG_SELECTOR:', process.env.HX_ROOM_CONFIG_SELECTOR);

if (!process.env.HX_ROOM_CONFIG_SELECTOR) {
  throw new Error("HX_ROOM_CONFIG_SELECTOR is not set!");
}

import HaxballJS from 'haxball.js';
import { hb_room_main } from './hb_room';
import * as config from './config';

const roomConfig = config.getRoomConfig(process.env.HX_ROOM_CONFIG_SELECTOR);

HaxballJS.then((HBInit) => {
  // Same as in Haxball Headless Host Documentation
  const room = HBInit({
    roomName: roomConfig.roomName,
    maxPlayers: roomConfig.maxPlayers,
    public: roomConfig.isPublic,
    geo: roomConfig.geo,
    noPlayer: roomConfig.noPlayer,
    token: roomConfig.token,
  });

  hb_room_main(room, roomConfig);
});

import { tokenDatabase } from './token_database';
tokenDatabase.updateServerStatus(roomConfig.selector, false);
