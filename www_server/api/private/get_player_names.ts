import express, { Request, Response } from "express";
import sqlite3 from 'sqlite3';
import { PlayerNamesDB } from "../../../src/db/player_names";
import * as config from "../../../src/config";
import * as secrets from "../../../src/secrets";
import { getTimestampHM } from "../../../src/utils";

const router = express.Router();

let roomConfig = config.getRoomConfig("3vs3");

interface Cache {
  which: "global";
  playerNames: Map<string, string>;
  cache: Record<string, string>;
  lastRowId: number;
  lastFetchTime: number;
}
let globalCache: Cache = { which: "global", playerNames: new Map<string, string>(), cache: {}, lastRowId: -1, lastFetchTime: 0 };

const CACHE_DURATION = 3 * 60 * 1000; // 3 minutes

async function fetchPlayerNames(cache: Cache) {
  console.log(`${getTimestampHM()} fetching player names ${cache.which}`);
  let playersDb = new sqlite3.Database(roomConfig.playersDbFile, (err) => {
    if (err) console.error('Error opening database:', err.message);
  });
  let newRowId = -1;
  if (cache.which === "global") {
    try {
      let playerNamesDb = new PlayerNamesDB(playersDb);
      let [results, rowId] = await playerNamesDb.getAllPlayerNamesAfter(cache.lastRowId);
      for (let [authId, playerName] of results) {
        cache.playerNames.set(authId, playerName);
      }
      console.log(`Got ${results.size} new names, now there is ${cache.playerNames.size} names, lastRowId=${cache.lastRowId}, rowId=${rowId}`);
      newRowId = rowId;
    } catch (e) { console.error(`Error for player names: ${e}`) };
  }
  cache.lastRowId = newRowId;
  cache.cache = Object.fromEntries(cache.playerNames);
  cache.lastFetchTime = Date.now();
}

async function getPlayerNamesCached(cache: Cache) {
  if (cache.playerNames.size === 0 || Date.now() - cache.lastFetchTime > CACHE_DURATION) {
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

router.get("/:authId", async (req: any, res: any) => {
  if (!verify(req, res)) return;
  const { authId } = req.params;
  let cached = await getAllPlayerNamesCached();
  let playerName = cached.playerNames.get(authId);
  if (playerName === undefined) {
    return res.status(400).send('No data');
  }
  res.json({[authId]: playerName});
});

export default router;
