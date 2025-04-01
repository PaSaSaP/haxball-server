import express, { Request, Response } from "express";
import sqlite3 from 'sqlite3';
import { PlayerNameEntry, PlayerNamesDB } from "../../../src/db/player_names";
import * as config from "../../../src/config";
import * as secrets from "../../../src/secrets";
import { getTimestampHM, normalizeNameString } from "../../../src/utils";

const router = express.Router();

let roomConfig = config.getRoomConfig("3vs3");

interface Cache {
  which: "global";
  playerNamesByAuth: Map<string, string>;
  playerIdsByNormalizedName: Map<string, number>;
  playerEntryByAuth: Map<string, PlayerNameEntry>;
  playerEntryById: Map<number, PlayerNameEntry>;
  cache: Record<string, string>; // authId -> playerName
  cacheAll: Record<string, [number, string]>; // authId -> [userId, playerName]
  lastPlayerGlobalId: number;
  lastFetchTime: number;
}
let globalCache: Cache = {
  which: "global",
  playerNamesByAuth: new Map(),
  playerIdsByNormalizedName: new Map(),
  playerEntryByAuth: new Map(),
  playerEntryById: new Map(),
  cache: {}, cacheAll: {}, lastPlayerGlobalId: -1, lastFetchTime: 0
};

const CACHE_DURATION = 3 * 60 * 1000; // 3 minutes

async function fetchPlayerNames(cache: Cache) {
  console.log(`${getTimestampHM()} fetching player names ${cache.which}`);
  let playersDb = new sqlite3.Database(roomConfig.playersDbFile, (err) => {
    if (err) console.error('Error opening database:', err.message);
  });
  let newLastPlayerGlobalId = -1;
  if (cache.which === "global") {
    try {
      let playerNamesDb = new PlayerNamesDB(playersDb);
      let results = await playerNamesDb.getAllPlayerNamesAfter(cache.lastPlayerGlobalId);
      for (let playerNameEntry of results) {
        // TODO add some preprocessing to disallow name claiming
        cache.playerNamesByAuth.set(playerNameEntry.auth_id, playerNameEntry.name);
        cache.playerIdsByNormalizedName.set(normalizeNameString(playerNameEntry.name), playerNameEntry.id);
        cache.playerEntryByAuth.set(playerNameEntry.auth_id, playerNameEntry);
        cache.playerEntryById.set(playerNameEntry.id, playerNameEntry);
      }
      if (results.length) newLastPlayerGlobalId = results.at(-1)!.id;
      console.log(`Got ${results.length} new names, now there is ${cache.playerNamesByAuth.size} names, lastId=${cache.lastPlayerGlobalId}, newId=${newLastPlayerGlobalId}`);
    } catch (e) { console.error(`Error for player names: ${e}`) };
  }
  if (newLastPlayerGlobalId !== -1) cache.lastPlayerGlobalId = newLastPlayerGlobalId;
  let cacheAllMap: Map<string, [number, string]> = new Map();
  for (let [authId, p] of cache.playerEntryByAuth) {
    cacheAllMap.set(authId, [p.id, p.name]);
  }
  cache.cache = Object.fromEntries(cache.playerNamesByAuth);
  cache.cacheAll = Object.fromEntries(cacheAllMap);
  cache.lastFetchTime = Date.now();
}

async function getPlayerNamesCached(cache: Cache) {
  if (cache.playerNamesByAuth.size === 0 || Date.now() - cache.lastFetchTime > CACHE_DURATION) {
    await fetchPlayerNames(cache);
  }
  return cache;
}
export async function getAllPlayerNamesCached() {
  return await getPlayerNamesCached(globalCache);
}

function verify(req: Request, res: Response) {
  if (req.header("x-api-key") !== secrets.PrivateApiKey) {
    res.status(403).send("Access Denied");
    return false;
  }
  return true;
}

router.get("/", async (req: any, res: any) => {
  if (!verify(req, res)) return;
  let cached = await getAllPlayerNamesCached();
  res.json(cached.cache);
});
router.get("/all", async (req: any, res: any) => {
  if (!verify(req, res)) return;
  let cached = await getAllPlayerNamesCached();
  res.json(cached.cacheAll);
});

router.get("/auth/:authId", async (req: any, res: any) => {
  if (!verify(req, res)) return;
  const { authId } = req.params;
  let cached = await getAllPlayerNamesCached();
  let playerName = cached.playerNamesByAuth.get(authId);
  if (playerName === undefined) {
    return res.status(400).send('No data');
  }
  res.json({[authId]: playerName});
});
router.get("/id_by_nname/:nname", async (req: any, res: any) => {
  if (!verify(req, res)) return;
  const nname: string = normalizeNameString(String(req.params.nname));
  let cached = await getAllPlayerNamesCached();
  let playerId = cached.playerIdsByNormalizedName.get(nname);
  if (playerId === undefined) {
    return res.status(400).send('No data');
  }
  res.json({[nname]: playerId});
});
router.get("/id_by_auth/:authId", async (req: any, res: any) => {
  if (!verify(req, res)) return;
  const { authId } = req.params;
  let cached = await getAllPlayerNamesCached();
  let entry = cached.playerEntryByAuth.get(authId);
  if (entry === undefined) {
    return res.status(400).send('No data');
  }
  res.json({[authId]: entry.id});
});

export default router;
