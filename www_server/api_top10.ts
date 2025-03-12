import express, { Request, Response } from "express";
import sqlite3 from 'sqlite3';
import {TopRatingsDB} from "../src/db/top_ratings";
import { TopRatingsDailyDB, TopRatingsWeeklyDB } from "../src/db/top_day_ratings";
import * as config from "../src/config";
import { PlayerTopRatingData } from "../src/structs";
import { getTimestampHM } from "../src/utils";

const router = express.Router();

let roomConfig = config.getRoomConfig("3vs3");

interface Cache {
  which: "global" | "weekly" | "daily";
  cache: [string, number, number, number, number, number, number, number][];
  lastFetchTime: number;
}
let globalRankCache: Cache = { which: "global", cache: [], lastFetchTime: 0 };
let weeklyRankCache: Cache = { which: "weekly", cache: [], lastFetchTime: 0 };
let dailyRankCache: Cache = { which: "daily", cache: [], lastFetchTime: 0 };

const CACHE_DURATION = 3 * 60 * 1000; // 3 minutes

async function fetchPlayers(cache: Cache) {
  console.log(`${getTimestampHM()} Pobieranie topki dla ${cache.which}`);
  let otherDb = new sqlite3.Database(roomConfig.otherDbFile, (err) => {
    if (err) console.error('Error opening database:', err.message);
  });
  let ratings: PlayerTopRatingData[] = [];
  if (cache.which === "global") {
    let topRatingsDB = new TopRatingsDB(otherDb);
    ratings = await topRatingsDB.getTopNPlayers(1000);
  } else if (cache.which == "weekly") {
    let topRatingsWeeklyDB = new TopRatingsWeeklyDB(otherDb);
    ratings = await topRatingsWeeklyDB.getTopNPlayers(1000);
  } else if (cache.which == "daily") {
    let topRatingsDailyDB = new TopRatingsDailyDB(otherDb);
    ratings = await topRatingsDailyDB.getTopNPlayers(1000);
  }
  let result: typeof globalRankCache.cache = [];
  for (let rating of ratings) {
    result.push([rating.player_name, rating.rating, rating.games, rating.wins, rating.goals, rating.assists,
      rating.own_goals, rating.clean_sheets]);
  }
  cache.cache = result;
  cache.lastFetchTime = Date.now();
}

async function getRankCached(cache: Cache) {
  if (!cache.cache.length || Date.now() - cache.lastFetchTime > CACHE_DURATION) {
    await fetchPlayers(cache);
  }
  return cache;
}
async function getGlobalRankCached() {
  return await getRankCached(globalRankCache);
}
async function getWeeklyRankCached() {
  return await getRankCached(weeklyRankCache);
}
async function getDailyRankCached() {
  return await getRankCached(dailyRankCache);
}

router.get("/", async (req, res) => {
  let cached = await getGlobalRankCached();
  res.json(cached.cache.slice(0, 10));
});

router.get("/:num", async (req: any, res: any) => {
  const { num } = req.params;
  let cached = await getGlobalRankCached();
  res.json(cached.cache.slice(0, num));
});

router.get("/weekly", async (req, res) => {
  let cached = await getWeeklyRankCached();
  res.json(cached.cache.slice(0, 10));
});

router.get("/weekly/:num", async (req: any, res: any) => {
  const { num } = req.params;
  let cached = await getWeeklyRankCached();
  res.json(cached.cache.slice(0, num));
});

router.get("/daily", async (req, res) => {
  let cached = await getDailyRankCached();
  res.json(cached.cache.slice(0, 10));
});

router.get("/daily/:num", async (req: any, res: any) => {
  const { num } = req.params;
  let cached = await getDailyRankCached();
  res.json(cached.cache.slice(0, num));
});

export default router;