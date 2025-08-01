import express, { Request, Response } from "express";
import sqlite3, { cached } from 'sqlite3';
import { MatchEntry, MatchesDB } from "../../../src/db/matches";
import * as config from "../../../src/config";
import * as secrets from "../../../src/secrets";
import { getTimestampHM } from "../../../src/utils";
import { GameModeType } from "../../../src/structs";

const router = express.Router();

//               matchId, date,   durati, full_ti, winner, red_sc, blu_sc, pressu, possession
type CacheData = [number, string, number, boolean, number, number, number, number, number];
interface Cache {
  which: "1vs1"|"3vs3"|"4vs4"|"tennis";
  dbFile: string;
  matches: MatchEntry[];
  matchByMatchId: Map<number, MatchEntry>;
  cache: CacheData[];
  lastMatchId: number;
  lastFetchTime: number;
}
let matches1vs1Cache: Cache = {
  which: "1vs1", dbFile: config.AllOtherDbFiles["1vs1"], matches: [],
  matchByMatchId: new Map<number, MatchEntry>(), cache: [], lastMatchId: -1, lastFetchTime: 0
};
let matches3vs3Cache: Cache = {
  which: "3vs3", dbFile: config.AllOtherDbFiles["3vs3"], matches: [],
  matchByMatchId: new Map<number, MatchEntry>(), cache: [], lastMatchId: -1, lastFetchTime: 0
};
let matches4vs4Cache: Cache = {
  which: "4vs4", dbFile: config.AllOtherDbFiles["4vs4"], matches: [],
  matchByMatchId: new Map<number, MatchEntry>(), cache: [], lastMatchId: -1, lastFetchTime: 0
};
let matchesTennisCache: Cache = {
  which: "tennis", dbFile: config.AllOtherDbFiles["tennis"], matches: [],
  matchByMatchId: new Map<number, MatchEntry>(), cache: [], lastMatchId: -1, lastFetchTime: 0
};

const CACHE_DURATION = 1 * 60 * 1000; // 1 minute

function matchToArray(m: MatchEntry): CacheData {
  return [m.match_id, m.date, m.duration, m.full_time, m.winner, m.red_score, m.blue_score, m.pressure, m.possession];
}

function getCacheDataFromMatchId(cache: Cache, match_id: number): CacheData[] {
  const idx = cache.cache.findIndex(e => e[0] >= match_id);
  if (idx === -1) return [];
  return cache.cache.slice(idx);
}

function getCacheDataByDate(cache: Cache, day: string): CacheData[] {
  const startIdx = cache.cache.findIndex(e => e[1] === day);
  if (startIdx === -1) return [];
  const endIdx = cache.cache.findIndex((e, i) => i > startIdx && e[1] !== day);
  if (endIdx !== -1) return cache.cache.slice(startIdx, endIdx);
  return cache.cache.slice(startIdx);
}

async function fetchMatches(cache: Cache) {
  console.log(`${getTimestampHM()} fetching matches ${cache.which}`);
  let otherDb = new sqlite3.Database(cache.dbFile, (err) => {
    if (err) console.error('Error opening database:', err.message);
  });
  let newLastMatchId = -1;
  try {
    let matchesDb = new MatchesDB(otherDb);
    let results = await matchesDb.getMatchesAfter(cache.lastMatchId);
    for (let result of results) {
      cache.matchByMatchId.set(result.match_id, result);
      cache.matches.push(result);
    }
    newLastMatchId = cache.matches.at(-1)?.match_id ?? -1;
    console.log(`Got ${results.length} new matches, now there is ${cache.matches.length} matches, lastMatchId=${cache.lastMatchId}, newLastMatchId=${newLastMatchId}`);

    const removeOlderMatches = true; // debug switch
    if (removeOlderMatches) {
      // also remove matches older than 7 days
      let currentDate = await matchesDb.getCurrentDate(); // for example 2025-03-12
      let currentDateObj = new Date(currentDate);
      currentDateObj.setDate(currentDateObj.getDate() - 6);
      let weekDate = currentDateObj.toISOString().split('T')[0];
      let foundIdx = -1;
      for (let i = 0; i < cache.matches.length; ++i) {
        let m = cache.matches[i];
        if (m.date < weekDate) foundIdx = i;
        else break;
      }
      if (foundIdx !== -1) {
        console.log(`Truncating first ${foundIdx} matches`);
        for (let idx = 0; idx <= foundIdx; ++idx) cache.matchByMatchId.delete(cache.matches[idx].match_id);
        cache.matches = cache.matches.slice(foundIdx + 1);
      }
    }
  } catch (e) { console.error(`Error for matches: ${e}`) };
  if (newLastMatchId !== -1) cache.lastMatchId = newLastMatchId;
  let data: typeof cache.cache = [];
  for (let m of cache.matches) {
    data.push(matchToArray(m));
  }
  cache.cache = data;
  cache.lastFetchTime = Date.now();
}

async function getMatchesCached(cache: Cache) {
  if (cache.matches.length === 0 || Date.now() - cache.lastFetchTime > CACHE_DURATION) {
    await fetchMatches(cache);
  }
  return cache;
}
async function getMatches1vs1Cached() {
  return await getMatchesCached(matches1vs1Cache);
}
async function getMatches3vs3Cached() {
  return await getMatchesCached(matches3vs3Cache);
}
async function getMatches4vs4Cached() {
  return await getMatchesCached(matches4vs4Cache);
}
async function getMatchesTennisCached() {
  return await getMatchesCached(matchesTennisCache);
}

function getCacheBySelector(selector: string) {
  if (selector === '1vs1') return getMatches1vs1Cached();
  if (selector === '3vs3') return getMatches3vs3Cached();
  if (selector === '4vs4') return getMatches4vs4Cached();
  if (selector === 'tennis') return getMatchesTennisCached();
  throw new Error(`getCacheBySelecor() matches invalid selector: ${selector}`);
}

export async function getMatchBySelectorAndMatchId(selector: string, matchId: number): Promise<MatchEntry|null> {
  let cache = await getCacheBySelector(selector);
  let match = cache.matchByMatchId.get(matchId);
  return match ?? null;
}

function verify(req: Request, res: Response) {
  if (req.header("x-api-key") !== secrets.PrivateApiKey) {
    res.status(403).send("Access Denied");
    return false;
  }
  return true;
}

async function getCacheObject(selector: GameModeType) {
  return getCacheBySelector(selector);
}

router.get("/:selector", async (req: any, res: any) => {
  if (!verify(req, res)) return;
  try {
    const selector = String(req.params.selector);
    let cached = await getCacheObject(selector as GameModeType);
    res.json(cached.cache);
  } catch (e) {
    console.error(`Error int get_matches by selector: ${e}`);
    res.status(500).json({ error: "An error occurred" });
  }
});
router.get("/:selector/id/:matchId", async (req: any, res: any) => {
  if (!verify(req, res)) return;
  try {
    const selector = String(req.params.selector);
    const matchId = Number(req.params.matchId);
    let cached = await getCacheObject(selector as GameModeType);
    let m = cached.matchByMatchId.get(matchId as number);
    if (!m) return res.json([]);
    res.json(matchToArray(m));
  } catch (e) {
    console.error(`Error int get_matches by selector/id/matchId: ${e}`);
    res.status(500).json({ error: "An error occurred" });
  }
});
router.get("/:selector/from/:matchId", async (req: any, res: any) => {
  if (!verify(req, res)) return;
  try {
    const selector = String(req.params.selector);
    const matchId = Number(req.params.matchId);
    let cached = await getCacheObject(selector as GameModeType);
    let selected = getCacheDataFromMatchId(cached, matchId);
    res.json(selected);
  } catch (e) {
    console.error(`Error int get_matches by selector/from/matchId: ${e}`);
    res.status(500).json({ error: "An error occurred" });
  }
});
router.get("/:selector/by/:day", async (req: any, res: any) => {
  if (!verify(req, res)) return;
  try {
    const selector = String(req.params.selector);
    const day = String(req.params.day);
    let cached = await getCacheObject(selector as GameModeType);
    let selected = getCacheDataByDate(cached, day);
    console.log(`matches 1vs1 by ${day} = ${selected.length}`)
    res.json(selected);
  } catch (e) {
    console.error(`Error int get_matches by selector/by/day: ${e}`);
    res.status(500).json({ error: "An error occurred" });
  }
});
router.get("/:selector/first_match_id", async (req: any, res: any) => {
  if (!verify(req, res)) return;
  try {
    const selector = String(req.params.selector);
    let cached = await getCacheObject(selector as GameModeType);
    res.json({ match_id: cached.matches.at(0)?.match_id ?? 0 });
  } catch (e) {
    console.error(`Error int get_matches first_match_id: ${e}`);
    res.status(500).json({ error: "An error occurred" });
  }
});
router.get("/:selector/last_match_id", async (req: any, res: any) => {
  if (!verify(req, res)) return;
  try {
    const selector = String(req.params.selector);
    let cached = await getCacheObject(selector as GameModeType);
    res.json({ match_id: cached.matches.at(cached.matches.length - 1)?.match_id ?? -1 });
  } catch (e) {
    console.error(`Error int get_matches last_match_id: ${e}`);
    res.status(500).json({ error: "An error occurred" });
  }
});

export const getFirstMatchId1vs1 = () => {
  return matches1vs1Cache.matches.at(0)?.match_id ?? 0;
}
export const getFirstMatchId3vs3 = () => {
  return matches3vs3Cache.matches.at(0)?.match_id ?? 0;
}
export const getFirstMatchId4vs4 = () => {
  return matches4vs4Cache.matches.at(0)?.match_id ?? 0;
}
export const getFirstMatchIdTennis = () => {
  return matchesTennisCache.matches.at(0)?.match_id ?? 0;
}
export default router;
