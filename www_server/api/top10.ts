import express, { Request, Response } from "express";
import sqlite3 from 'sqlite3';
import {TopRatingsDB} from "../../src/db/top_ratings";
import { TopRatingsDailyDB, TopRatingsWeeklyDB } from "../../src/db/top_day_ratings";
import * as config from "../../src/config";
import { GameModeType, PlayerTopRatingData } from "../../src/structs";
import { getTimestampHM } from "../../src/utils";

const router = express.Router();

interface Cache {
  which: "global" | "weekly" | "daily";
  cache: [string, number, number, number, number, number, number, number][];
  lastFetchTime: number;
}

class Top10Cache {
  selector: GameModeType;
  otherDbFiles: config.OtherDbFiles;
  globalRankCache: Cache;
  weeklyRankCache: Cache;
  dailyRankCache: Cache

  static CACHE_DURATION = 3 * 60 * 1000; // 3 minutes

  constructor(selector: GameModeType) {
    this.selector = selector;
    this.otherDbFiles = config.AllOtherDbFiles;
    this.globalRankCache = { which: "global", cache: [], lastFetchTime: 0 };
    this.weeklyRankCache = { which: "weekly", cache: [], lastFetchTime: 0 };
    this.dailyRankCache = { which: "daily", cache: [], lastFetchTime: 0 };
  }

  async fetchPlayers(cache: Cache) {
    console.log(`${getTimestampHM()} Pobieranie topki dla ${this.selector} ${cache.which}`);
    let otherDb = new sqlite3.Database(this.otherDbFiles[this.selector], (err) => {
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
    let result: typeof this.globalRankCache.cache = [];
    for (let rating of ratings) {
      result.push([rating.player_name, rating.rating, rating.games, rating.wins, rating.goals, rating.assists,
        rating.own_goals, rating.clean_sheets]);
    }
    cache.cache = result;
    cache.lastFetchTime = Date.now();
  }

  async getRankCached(cache: Cache) {
    if (!cache.cache.length || Date.now() - cache.lastFetchTime > Top10Cache.CACHE_DURATION) {
      await this.fetchPlayers(cache);
    }
    return cache;
  }
  async getGlobalRankCached() {
    return await this.getRankCached(this.globalRankCache);
  }
  async getWeeklyRankCached() {
    return await this.getRankCached(this.weeklyRankCache);
  }
  async getDailyRankCached() {
    return await this.getRankCached(this.dailyRankCache);
  }
}

let cache3vs3 = new Top10Cache('3vs3');
let cache4vs4 = new Top10Cache('4vs4');
let cacheTennis = new Top10Cache('tennis');

function getCacheObject(selector: GameModeType) {
  if (selector === '3vs3') {
    return cache3vs3;
  } else if (selector === '4vs4') {
    return cache4vs4;
  } else if (selector === 'tennis') {
    return cacheTennis;
  } else {
    throw new Error(`Invalid selector: ${selector}`);
  }
}

export async function getGlobalPlayersRankCached(selector: GameModeType) {
  return getCacheObject(selector).getGlobalRankCached();
}

export async function getWeeklyPlayersRankCached(selector: GameModeType) {
  return getCacheObject(selector).getWeeklyRankCached();
}

export async function getDailyPlayersRankCached(selector: GameModeType) {
  return getCacheObject(selector).getDailyRankCached();
}

router.get("/:selector", async (req, res) => {
  try {
    const selector = String(req.params.selector);
    let cached = await getGlobalPlayersRankCached(selector as GameModeType);
    res.json(cached.cache.slice(0, 10));
  } catch (err) {
    console.error("Error fetching global rank:", err);
    res.status(500).json({ error: "An error occurred" });
  }
});

router.get("/:selector/:num", async (req: any, res: any) => {
  try {
    const selector = String(req.params.selector);
    const num = Number(req.params.num);
    let cached = await getGlobalPlayersRankCached(selector as GameModeType);
    res.json(cached.cache.slice(0, num));
  } catch (err) {
    console.error("Error fetching global rank:", err);
    res.status(500).json({ error: "An error occurred" });
  }
});

router.get("/:selector/weekly", async (req, res) => {
  try {
    const selector = String(req.params.selector);
    let cached = await getWeeklyPlayersRankCached(selector as GameModeType);
    res.json(cached.cache.slice(0, 10));
  } catch (err) {
    console.error("Error fetching weekly rank:", err);
    res.status(500).json({ error: "An error occurred" });
  }
});

router.get("/:selector/weekly/:num", async (req: any, res: any) => {
  try {
    const selector = String(req.params.selector);
    const num = Number(req.params.num);
    let cached = await getWeeklyPlayersRankCached(selector as GameModeType);
    res.json(cached.cache.slice(0, num));
  } catch (err) {
    console.error("Error fetching weekly rank:", err);
    res.status(500).json({ error: "An error occurred" });
  }
});

router.get("/:selector/daily", async (req, res) => {
  try {
    const selector = String(req.params.selector);
    let cached = await getDailyPlayersRankCached(selector as GameModeType);
    res.json(cached.cache.slice(0, 10));
  } catch (err) {
    console.error("Error fetching daily rank:", err);
    res.status(500).json({ error: "An error occurred" });
  }
});

router.get("/:selector/daily/:num", async (req: any, res: any) => {
  try {
    const selector = String(req.params.selector);
    const num = Number(req.params.num);
    let cached = await getDailyPlayersRankCached(selector as GameModeType);
    res.json(cached.cache.slice(0, num));
  } catch (err) {
    console.error("Error fetching daily rank:", err);
    res.status(500).json({ error: "An error occurred" });
  }
});

export default router;