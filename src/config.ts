
type LimitsEntry = {
  score: number,
  time: number, // [minutes]
}
interface RoomLimits {
  '1vs1': LimitsEntry;
  '2vs2': LimitsEntry;
  '3vs3': LimitsEntry;
  '4vs4': LimitsEntry;
};

const roomLimits: RoomLimits = {
  '1vs1': {score: 3, time: 1},
  '2vs2': {score: 3, time: 2},
  '3vs3': {score: 3, time: 3},
  '4vs4': {score: 4, time: 4},
}

export interface OtherDbFiles {
  '1vs1': string;
  '2vs2': string;
  '3vs3': string;
  '4vs4': string;
}

export interface RoomServerConfig {
  playersDbFile: string;
  otherDbFiles: OtherDbFiles;
  vipDbFile: string;
  chatLogDbFile: string;
  roomName: string;
  isPublic: boolean;
  geo: { code: string; lat: number; lon: number };
  limits: RoomLimits;
  playersInTeamLimit: number;
  maxPlayers: number;
  maxPlayersOverride: number;
  noPlayer: boolean;
  autoModeEnabled: boolean;
  token: string;
  selector: '1vs1'|'3vs3'|'4vs4';
  subselector: string;
}

export const dbDir = "./db";
const mainDbFile = `${dbDir}/main_futsal_players.db`;
const vipDbFile = `${dbDir}/main_vip.db`;
export const hostAuthId = 'QrInL5KJCKDFUyBjgPxMeq392ZB0XjYksePfN6cm3BY';
export const discordLink = 'https://discord.gg/XrtXvMNKZT';
export const webpageLink = 'https://haxball.ovh';
export const localBackendService = 'http://www-server:3000';
export const StripeKey = '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';

export const AllOtherDbFiles: OtherDbFiles = {
    '1vs1':  `${dbDir}/other_futsal_1vs1.db`,
    '2vs2':  `${dbDir}/other_futsal_2vs2.db`,
    '3vs3':  `${dbDir}/other_futsal_3vs3.db`,
    '4vs4':  `${dbDir}/other_futsal_4vs4.db`,
}

const futsal_4vs4: RoomServerConfig = {
  playersDbFile: mainDbFile,
  otherDbFiles: {
    '1vs1':  ``,
    '2vs2':  ``,
    '3vs3':  ``,
    // '3vs3':  `${dbDir}/other_futsal_3vs3.db`,
    '4vs4':  AllOtherDbFiles['4vs4'],
  },
  vipDbFile: vipDbFile,
  chatLogDbFile: "./haxball_player_chat_4vs4.mpk",
  roomName: "🍌 FUTSAL 4vs4 XxX Banana League!",
  isPublic: false,
  geo: { code: "it", lat: 40.0, lon: 14.0 },
  limits: roomLimits,
  playersInTeamLimit: 4,
  maxPlayers: 20,
  maxPlayersOverride: 13,
  noPlayer: true,
  autoModeEnabled: true,
  token: 'thr1.AAAAAGfSC6jERkIwkXt2Iw.4kIK2P1gTUc',
  selector: '4vs4',
  subselector: '1',
};

const futsal_3vs3: RoomServerConfig = {
  playersDbFile: mainDbFile,
  otherDbFiles: {
    '1vs1':  ``,
    '2vs2':  ``,
    '3vs3':  AllOtherDbFiles['3vs3'],
    '4vs4':  ``,
  },
  vipDbFile: vipDbFile,
  chatLogDbFile: "./haxball_player_chat.mpk",
  roomName: "🍌 FUTSAL 3vs3 XxX Banana League!",
  isPublic: true,
  geo: { code: "it", lat: 40.0, lon: 14.0 },
  limits: roomLimits,
  playersInTeamLimit: 3,
  maxPlayers: 16,
  maxPlayersOverride: 11,
  noPlayer: true,
  autoModeEnabled: true,
  token: 'thr1.AAAAAGfSC6jERkIwkXt2Iw.4kIK2P1gTUc',
  selector: '3vs3',
  subselector: '1',
};

const futsal_1vs1: RoomServerConfig = {
  playersDbFile: mainDbFile,
  otherDbFiles: {
    '1vs1':  AllOtherDbFiles["1vs1"],
    '2vs2':  ``,
    '3vs3':  ``,
    '4vs4':  ``,
  },
  vipDbFile: vipDbFile,
  chatLogDbFile: "./haxball_player_chat_1vs1.mpk",
  roomName: "🍌 FUTSAL FreeStYLe XxX",
  isPublic: true,
  geo: { code: "it", lat: 40.0, lon: 14.0 },
  limits: roomLimits,
  playersInTeamLimit: 6,
  maxPlayers: 24,
  maxPlayersOverride: 17,
  noPlayer: true,
  autoModeEnabled: false,
  token: 'thr1.AAAAAGfS-uGauY5INpzeTA.QX8667z7Xvo',
  selector: '1vs1',
  subselector: '1',
};

function getChatLogDbFile(selector: string, subselector: string) {
  return `./haxball_player_chat_${selector}_${subselector}.mpk`;
}

export const getRoomConfig = (selector: string, subselector: string = '1'): RoomServerConfig => {
  let config: RoomServerConfig;
  if (selector === '4vs4') config = futsal_4vs4;
  else if (selector === '3vs3') config = futsal_3vs3;
  else if (selector === '1vs1') config = futsal_1vs1;
  else throw new Error(`There is no config with name ${selector}`);
  config.chatLogDbFile = getChatLogDbFile(selector, subselector);
  config.subselector = subselector;
  if (['3vs3', '4vs4'].includes(selector) && subselector !== '1') {
    config.roomName += ` #${subselector}`;
  }
  return config;
}
