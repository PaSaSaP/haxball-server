import express, { Request, Response } from "express";
import sqlite3 from 'sqlite3';
import {MatchStatsDB, MatchStatsEntry} from "../../../src/db/match_stats";
import * as config from "../../../src/config";
import * as secrets from "../../../src/secrets";
import { getTimestampHM } from "../../../src/utils";
import { getFirstMatchId1vs1, getFirstMatchId3vs3 } from "./get_matches";

const router = express.Router();

let roomConfig3vs3 = config.getRoomConfig("3vs3");
let roomConfig1vs1 = config.getRoomConfig("1vs1");

interface Cache {
  which: "1vs1"|"3vs3";
  dbFile: string;
  matchStats: MatchStatsEntry[];
  cache: [number, string, 0|1|2, number, number, number, number, number, number, number][];
  lastRowId: number;
  lastFetchTime: number;
}
let matchStats1vs1Cache: Cache = { which: "1vs1", dbFile: roomConfig1vs1.otherDbFile, matchStats: [], cache: [], lastRowId: -1, lastFetchTime: 0 };
let matchStats3vs3Cache: Cache = { which: "3vs3", dbFile: roomConfig3vs3.otherDbFile, matchStats: [], cache: [], lastRowId: -1, lastFetchTime: 0 };

const CACHE_DURATION = 1 * 60 * 1000; // 1 minute

async function fetchMatchStats(cache: Cache) {
  console.log(`${getTimestampHM()} fetching match stats ${cache.which}`);
  let otherDb = new sqlite3.Database(cache.dbFile, (err) => {
    if (err) console.error('Error opening database:', err.message);
  });
  let newRowId = -1;
  try {
    let matchStatsDb = new MatchStatsDB(otherDb);
    let [results, rowId] = await matchStatsDb.getMatchStatsAfter(cache.lastRowId);
    for (let result of results) {
      cache.matchStats.push(result);
    }
    console.log(`(${cache.which}) Got ${results.length} new match stats, now there is ${cache.matchStats.length} matches, lastRowId=${cache.lastRowId}, rowId=${rowId}`);
    newRowId = rowId;

    let firstMatchId = cache.which === "1vs1" ? getFirstMatchId1vs1() : getFirstMatchId3vs3();
    if (firstMatchId > 0) {
      let foundIdx = -1;
      for (let i = 0; i < cache.matchStats.length; ++i) {
        let m = cache.matchStats[i];
        if (m.match_id < firstMatchId) foundIdx = i;
        else break;
      }
      if (foundIdx !== -1) {
        console.log(`Truncating first ${foundIdx} match stats`);
        cache.matchStats = cache.matchStats.slice(foundIdx + 1);
      }
    }
  } catch (e) { console.error(`Error: ${e}`) };
  cache.lastRowId = newRowId;
  let data: typeof cache.cache = [];
  for (let m of cache.matchStats) {
    data.push([m.match_id, m.auth_id, m.team, m.goals, m.assists, m.own_goals, m.clean_sheet, m.playtime, m.full_time, m.left_state]);
  }
  cache.cache = data;
  cache.lastFetchTime = Date.now();
}

async function getMatchesCached(cache: Cache) {
  if (cache.matchStats.length === 0 || Date.now() - cache.lastFetchTime > CACHE_DURATION) {
    await fetchMatchStats(cache);
  }
  return cache;
}
async function getMatchStats1vs1Cached() {
  return await getMatchesCached(matchStats1vs1Cache);
}
async function getMatchStats3vs3Cached() {
  return await getMatchesCached(matchStats3vs3Cache);
}

function verify(req: Request, res: Response) {
  if (req.header("x-api-key") !== secrets.PrivateApiKey) {
    res.status(403).send("Access Denied");
    return false;
  }
  return true;
}

router.get("/1vs1", async (req: any, res: any) => {
  if (!verify(req, res)) return;
  let cached = await getMatchStats1vs1Cached();
  res.json(cached.cache);
});
router.get("/3vs3", async (req: any, res: any) => {
  if (!verify(req, res)) return;
  let cached = await getMatchStats3vs3Cached();
  res.json(cached.cache);
});

export default router;
