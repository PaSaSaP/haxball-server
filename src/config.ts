
export interface RoomServerConfig {
  playersDbFile: string;
  otherDbFile: string;
  vipDbFile: string;
  chatLogDbFile: string;
  roomName: string;
  isPublic: boolean;
  geo: { code: string; lat: number; lon: number };
  scoreLimit: number;
  timeLimit: number; // minutes
  playersInTeamLimit: number;
  maxPlayers: number;
  maxPlayersOverride: number;
  noPlayer: boolean;
  autoModeEnabled: boolean;
  token: string;
  selector: string;
}

export const dbDir = "./db";
const mainDbFile = `${dbDir}/main_futsal_players.db`;
const vipDbFile = `${dbDir}/main_vip.db`;
export const hostAuthId = 'QrInL5KJCKDFUyBjgPxMeq392ZB0XjYksePfN6cm3BY';
export const discordLink = 'https://discord.gg/8xFctajU';
export const webpageLink = 'https://haxball.ovh';
export const StripeKey = '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';

const futsal_3vs3: RoomServerConfig = {
  playersDbFile: mainDbFile,
  otherDbFile: `${dbDir}/other_futsal_3vs3.db`,
  vipDbFile: vipDbFile,
  chatLogDbFile: "./haxball_player_chat.mpk",
  roomName: "🍌 FUTSAL 3vs3 XxX Banana League!",
  isPublic: true,
  geo: { code: "it", lat: 40.0, lon: 14.0 },
  scoreLimit: 3,
  timeLimit: 3,
  playersInTeamLimit: 3,
  maxPlayers: 16,
  maxPlayersOverride: 11,
  noPlayer: true,
  autoModeEnabled: true,
  token: 'thr1.AAAAAGfRgpF5Xym695vc8w.Od_L3av3SKA',
  selector: '3vs3',
};

const futsal_1vs1: RoomServerConfig = {
  playersDbFile: mainDbFile,
  otherDbFile: `${dbDir}/other_futsal_1vs1.db`,
  vipDbFile: vipDbFile,
  chatLogDbFile: "./haxball_player_chat_1vs1.mpk",
  roomName: "🍌 FUTSAL FreeStYLe XxX",
  isPublic: true,
  geo: { code: "it", lat: 40.0, lon: 14.0 },
  scoreLimit: 3,
  timeLimit: 2 * 60,
  playersInTeamLimit: 3,
  maxPlayers: 16,
  maxPlayersOverride: 11,
  noPlayer: true,
  autoModeEnabled: false,
  token: 'thr1.AAAAAGfRgg94PJnblP7Z0w.XRxnhcUmp14',
  selector: '1vs1',
};

export const getRoomConfig = (name: string): RoomServerConfig => {
  if (name == '3vs3') return futsal_3vs3;
  if (name == '1vs1') return futsal_1vs1;
  throw new Error(`There is no config with name ${name}`);
}
