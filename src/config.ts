
export interface RoomServerConfig {
  playersDbFile: string;
  otherDbFile: string;
  chatLogDbFile: string;
  roomName: string;
  isPublic: boolean;
  geo: { code: string; lat: number; lon: number };
  playersInTeamLimit: number;
  maxPlayers: number;
  maxPlayersOverride: number;
  noPlayer: boolean;
  token: string;
}

export const dbDir = "./db";
const mainDbFile = `${dbDir}/main_futsal_players.db`;
export const hostAuthId = 'QrInL5KJCKDFUyBjgPxMeq392ZB0XjYksePfN6cm3BY';
export const discordLink = 'https://discord.gg/8xFctajU';
export const webpageLink = 'https://haxball.ovh';

const futsal_3vs3: RoomServerConfig = {
  playersDbFile: mainDbFile,
  otherDbFile: `${dbDir}/other_futsal_3vs3.db`,
  chatLogDbFile: "./haxball_player_chat.mpk",
  roomName: "🍌 FUTSAL 3vs3 XxX",
  isPublic: true,
  geo: { code: "it", lat: 40.0, lon: 14.0 },
  playersInTeamLimit: 3,
  maxPlayers: 16,
  maxPlayersOverride: 11,
  noPlayer: true,
  token: 'thr1.AAAAAGfL8CGWA6FmpOQviQ.lmFpr-AYe-I',
};

const futsal_1vs1: RoomServerConfig = {
  playersDbFile: mainDbFile,
  otherDbFile: `${dbDir}/other_futsal_1vs1.db`,
  chatLogDbFile: "./haxball_player_chat_1vs1.mpk",
  roomName: "🍌 FUTSAL FreeStYLe XxX",
  isPublic: true,
  geo: { code: "it", lat: 40.0, lon: 14.0 },
  playersInTeamLimit: 1,
  maxPlayers: 16,
  maxPlayersOverride: 11,
  noPlayer: true,
  token: 'thr1.AAAAAGfL8NYyt2qtgiDOng.GfvmxTi9Ngo',
};

export const getRoomConfig = (name: string): RoomServerConfig => {
  if (name == '3vs3') return futsal_3vs3;
  if (name == '1vs1') return futsal_1vs1;
  throw new Error(`There is no config with name ${name}`);
}
