import express, { Request, Response } from "express";
import sqlite3 from 'sqlite3';
import {MatchStatsDB, MatchStatsEntry} from "../../../src/db/match_stats";
import * as config from "../../../src/config";
import * as secrets from "../../../src/secrets";
import { getTimestampHM } from "../../../src/utils";
import { getFirstMatchId1vs1, getFirstMatchId3vs3, getFirstMatchId4vs4 } from "./get_matches";

const router = express.Router();

type CacheData = [number, string, 0 | 1 | 2, number, number, number, number, number, number, number];
interface Cache {
  which: "1vs1"|"3vs3"|"4vs4";
  dbFile: string;
  matchStats: MatchStatsEntry[];
  matchStatsByMatchId: Map<number, MatchStatsEntry[]>;
  cache: CacheData[];
  lastRowId: number;
  lastFetchTime: number;
}

let matchStats1vs1Cache: Cache = {
  which: "1vs1", dbFile: config.AllOtherDbFiles["1vs1"], matchStats: [],
  matchStatsByMatchId: new Map<number, MatchStatsEntry[]>(), cache: [], lastRowId: -1, lastFetchTime: 0
};
let matchStats3vs3Cache: Cache = {
  which: "3vs3", dbFile: config.AllOtherDbFiles["3vs3"], matchStats: [],
  matchStatsByMatchId: new Map<number, MatchStatsEntry[]>(), cache: [], lastRowId: -1, lastFetchTime: 0
};
let matchStats4vs4Cache: Cache = {
  which: "4vs4", dbFile: config.AllOtherDbFiles["4vs4"], matchStats: [],
  matchStatsByMatchId: new Map<number, MatchStatsEntry[]>(), cache: [], lastRowId: -1, lastFetchTime: 0
};

const CACHE_DURATION = 1 * 60 * 1000; // 1 minute

function matchToArray(m: MatchStatsEntry): CacheData {
  return [m.match_id, m.auth_id, m.team, m.goals, m.assists, m.own_goals, m.clean_sheet, m.playtime, m.full_time, m.left_state];
}

function getCacheDataFromMatchId(cache: Cache, match_id: number): CacheData[] {
  const idx = cache.cache.findIndex(e => e[0] == match_id);
  if (idx === -1) return [];
  return cache.cache.slice(idx);
}

function getCacheDataBetween(cache: Cache, startMatchId: number, endMatchId: number): CacheData[] {
  const startIdx = cache.cache.findIndex(e => e[0] === startMatchId);
  if (startIdx === -1) return [];
  const endIdx = cache.cache.findIndex((e, i) => i >= startIdx && e[0] === endMatchId);
  if (endIdx !== -1) return cache.cache.slice(startIdx, endIdx+1);
  return []; // if no end idx found, argh...
}

function getCacheMatchStatsByMatchId(cache: Cache, matchId: number) {
  if (!cache.matchStatsByMatchId.has(matchId)) cache.matchStatsByMatchId.set(matchId, []);
  return cache.matchStatsByMatchId.get(matchId)!;
}

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
      getCacheMatchStatsByMatchId(cache, result.match_id).push(result);
    }
    console.log(`(${cache.which}) Got ${results.length} new match stats, now there is ${cache.matchStats.length} matches, lastRowId=${cache.lastRowId}, rowId=${rowId}`);
    newRowId = rowId;

    let firstMatchId = -1;
    if (cache.which === "1vs1") firstMatchId = getFirstMatchId1vs1();
    else if (cache.which === "3vs3") firstMatchId = getFirstMatchId3vs3();
    else if (cache.which === "4vs4") firstMatchId = getFirstMatchId4vs4();
    else throw new Error("invalid selector");
    if (firstMatchId > 0) {
      let foundIdx = -1;
      for (let i = 0; i < cache.matchStats.length; ++i) {
        let m = cache.matchStats[i];
        if (m.match_id < firstMatchId) foundIdx = i;
        else break;
      }
      if (foundIdx !== -1) {
        console.log(`Truncating first ${foundIdx} match stats`);
        for (let idx = 0; idx <= foundIdx; ++idx) cache.matchStatsByMatchId.delete(cache.matchStats[idx].match_id);
        cache.matchStats = cache.matchStats.slice(foundIdx + 1);
      }
    }
  } catch (e) { console.error(`Error for match stats: ${e}`) };
  if (newRowId != -1)
    cache.lastRowId = newRowId;
  let data: typeof cache.cache = [];
  for (let m of cache.matchStats) {
    data.push(matchToArray(m));
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
async function getMatchStats4vs4Cached() {
  return await getMatchesCached(matchStats4vs4Cache);
}

function getCacheBySelector(selector: string) {
  if (selector === '1vs1') return getMatchStats1vs1Cached();
  if (selector === '3vs3') return getMatchStats3vs3Cached();
  if (selector === '4vs4') return getMatchStats4vs4Cached();
  throw new Error(`getCacheBySelecor() match stats invalid selector: ${selector}`);
}

export async function getMatchStatsBySelectorAndMatchId(selector: string, matchId: number): Promise<MatchStatsEntry[]|null> {
  let cache = await getCacheBySelector(selector);
  let match = cache.matchStatsByMatchId.get(matchId);
  return match ?? null;
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
router.get("/4vs4", async (req: any, res: any) => {
  if (!verify(req, res)) return;
  let cached = await getMatchStats4vs4Cached();
  res.json(cached.cache);
});

router.get("/1vs1/id/:matchId", async (req: any, res: any) => {
  if (!verify(req, res)) return;
  const matchId = Number(req.params.matchId);
  let cached = await getMatchStats1vs1Cached();
  let m = cached.matchStatsByMatchId.get(matchId);
  if (!m) return res.json([]);
  res.json(m.map(matchToArray));
});
router.get("/3vs3/id/:matchId", async (req: any, res: any) => {
  if (!verify(req, res)) return;
  const matchId = Number(req.params.matchId);
  let cached = await getMatchStats3vs3Cached();
  let m = cached.matchStatsByMatchId.get(matchId);
  if (!m) return res.json([]);
  res.json(m.map(matchToArray));
});
router.get("/4vs4/id/:matchId", async (req: any, res: any) => {
  if (!verify(req, res)) return;
  const matchId = Number(req.params.matchId);
  let cached = await getMatchStats4vs4Cached();
  let m = cached.matchStatsByMatchId.get(matchId);
  if (!m) return res.json([]);
  res.json(m.map(matchToArray));
});
router.get("/1vs1/from/:matchId", async (req: any, res: any) => {
  if (!verify(req, res)) return;
  const matchId = Number(req.params.matchId);
  let cached = await getMatchStats1vs1Cached();
  let selected = getCacheDataFromMatchId(cached, matchId);
  res.json(selected);
});
router.get("/3vs3/from/:matchId", async (req: any, res: any) => {
  if (!verify(req, res)) return;
  const matchId = Number(req.params.matchId);
  let cached = await getMatchStats3vs3Cached();
  let selected = getCacheDataFromMatchId(cached, matchId);
  res.json(selected);
});
router.get("/4vs4/from/:matchId", async (req: any, res: any) => {
  if (!verify(req, res)) return;
  const matchId = Number(req.params.matchId);
  let cached = await getMatchStats4vs4Cached();
  let selected = getCacheDataFromMatchId(cached, matchId);
  res.json(selected);
});
router.get("/1vs1/between/:startMatchId/:endMatchId", async (req: any, res: any) => {
  if (!verify(req, res)) return;
  const startMatchId = Number(req.params.startMatchId);
  const endMatchId = Number(req.params.endMatchId);
  let cached = await getMatchStats1vs1Cached();
  let selected = getCacheDataBetween(cached, startMatchId, endMatchId);
  console.log(`match stats 1vs1 between ${startMatchId} and ${endMatchId} = ${selected.length}`)
  res.json(selected);
});
router.get("/3vs3/between/:startMatchId/:endMatchId", async (req: any, res: any) => {
  if (!verify(req, res)) return;
  const startMatchId = Number(req.params.startMatchId);
  const endMatchId = Number(req.params.endMatchId);
  let cached = await getMatchStats3vs3Cached();
  let selected = getCacheDataBetween(cached, startMatchId, endMatchId);
  console.log(`match stats 3vs3 between ${startMatchId} and ${endMatchId} = ${selected.length}`)
  res.json(selected);
});
router.get("/4vs4/between/:startMatchId/:endMatchId", async (req: any, res: any) => {
  if (!verify(req, res)) return;
  const startMatchId = Number(req.params.startMatchId);
  const endMatchId = Number(req.params.endMatchId);
  let cached = await getMatchStats4vs4Cached();
  let selected = getCacheDataBetween(cached, startMatchId, endMatchId);
  console.log(`match stats 4vs4 between ${startMatchId} and ${endMatchId} = ${selected.length}`)
  res.json(selected);
});

export default router;
