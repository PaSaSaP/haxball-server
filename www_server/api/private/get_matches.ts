import express, { Request, Response } from "express";
import sqlite3, { cached } from 'sqlite3';
import { MatchEntry, MatchesDB } from "../../../src/db/matches";
import * as config from "../../../src/config";
import * as secrets from "../../../src/secrets";
import { getTimestampHM } from "../../../src/utils";

const router = express.Router();

let roomConfig3vs3 = config.getRoomConfig("3vs3");
let roomConfig1vs1 = config.getRoomConfig("1vs1");

type CacheData = [number, string, number, boolean, number, number, number, number, number];
interface Cache {
  which: "1vs1"|"3vs3";
  dbFile: string;
  matches: MatchEntry[];
  matchByMatchId: Map<number, MatchEntry>;
  cache: CacheData[];
  lastMatchId: number;
  lastFetchTime: number;
}
let matches1vs1Cache: Cache = {
  which: "1vs1", dbFile: roomConfig1vs1.otherDbFile, matches: [],
  matchByMatchId: new Map<number, MatchEntry>(), cache: [], lastMatchId: -1, lastFetchTime: 0
};
let matches3vs3Cache: Cache = {
  which: "3vs3", dbFile: roomConfig3vs3.otherDbFile, matches: [],
  matchByMatchId: new Map<number, MatchEntry>(), cache: [], lastMatchId: -1, lastFetchTime: 0
};

const CACHE_DURATION = 1 * 60 * 1000; // 1 minute

function matchToArray(m: MatchEntry): CacheData {
  return [m.match_id, m.date, m.duration, m.full_time, m.winner, m.red_score, m.blue_score, m.pressure, m.possession];
}

function getCacheDataFromMatchId(cache: Cache, match_id: number): CacheData[] {
  const idx = cache.cache.findIndex(e => e[0] == match_id);
  if (idx === -1) return [];
  return cache.cache.slice(idx);
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
    newLastMatchId = cache.matches.at(cache.matches.length-1)?.match_id ?? -1;
    console.log(`Got ${results.length} new matches, now there is ${cache.matches.length} matches, lastMatchId=${cache.lastMatchId}, newLastMatchId=${newLastMatchId}`);

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
  } catch (e) { console.error(`Error for matches: ${e}`) };
  cache.lastMatchId = newLastMatchId;
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

function getCacheBySelector(selector: string) {
  if (selector === '1vs1') return getMatches1vs1Cached();
  if (selector === '3vs3') return getMatches3vs3Cached();
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

router.get("/1vs1", async (req: any, res: any) => {
  if (!verify(req, res)) return;
  let cached = await getMatches1vs1Cached();
  res.json(cached.cache);
});
router.get("/3vs3", async (req: any, res: any) => {
  if (!verify(req, res)) return;
  let cached = await getMatches3vs3Cached();
  res.json(cached.cache);
});
router.get("/1vs1/id/:matchId", async (req: any, res: any) => {
  if (!verify(req, res)) return;
  const matchId = Number(req.params.matchId);
  let cached = await getMatches1vs1Cached();
  let m = cached.matchByMatchId.get(matchId as number);
  if (!m) return res.json([]);
  res.json(matchToArray(m));
});
router.get("/3vs3/id/:matchId", async (req: any, res: any) => {
  if (!verify(req, res)) return;
  const matchId = Number(req.params.matchId);
  let cached = await getMatches3vs3Cached();
  let m = cached.matchByMatchId.get(matchId as number);
  if (!m) return res.json([]);
  res.json(matchToArray(m));
});
router.get("/1vs1/from/:matchId", async (req: any, res: any) => {
  if (!verify(req, res)) return;
  const matchId = Number(req.params.matchId);
  let cached = await getMatches1vs1Cached();
  let selected = getCacheDataFromMatchId(cached, matchId);
  res.json(selected);
});
router.get("/3vs3/from/:matchId", async (req: any, res: any) => {
  if (!verify(req, res)) return;
  const matchId = Number(req.params.matchId);
  let cached = await getMatches3vs3Cached();
  let selected = getCacheDataFromMatchId(cached, matchId);
  res.json(selected);
});
router.get("/1vs1/first_match_id", async (req: any, res: any) => {
  if (!verify(req, res)) return;
  let cached = await getMatches1vs1Cached();
  res.json({match_id: cached.matches.at(0)?.match_id ?? 0});
});
router.get("/3vs3/first_match_id", async (req: any, res: any) => {
  if (!verify(req, res)) return;
  let cached = await getMatches3vs3Cached();
  res.json({match_id: cached.matches.at(0)?.match_id ?? 0});
});
router.get("/1vs1/last_match_id", async (req: any, res: any) => {
  if (!verify(req, res)) return;
  let cached = await getMatches1vs1Cached();
  res.json({match_id: cached.matches.at(cached.matches.length-1)?.match_id ?? -1});
});
router.get("/3vs3/last_match_id", async (req: any, res: any) => {
  if (!verify(req, res)) return;
  let cached = await getMatches3vs3Cached();
  res.json({match_id: cached.matches.at(cached.matches.length-1)?.match_id ?? -1});
});

export const getFirstMatchId1vs1 = () => {
  return matches1vs1Cache.matches.at(0)?.match_id ?? 0;
}
export const getFirstMatchId3vs3 = () => {
  return matches3vs3Cache.matches.at(0)?.match_id ?? 0;
}
export default router;
