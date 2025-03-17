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


// 3vs3
router.get("/3vs3", async (req, res) => {
  let cached = await cache3vs3.getGlobalRankCached();
  res.json(cached.cache.slice(0, 10));
});

router.get("/3vs3/:num", async (req: any, res: any) => {
  const { num } = req.params;
  let cached = await cache3vs3.getGlobalRankCached();
  res.json(cached.cache.slice(0, num));
});

router.get("/3vs3/weekly", async (req, res) => {
  let cached = await cache3vs3.getWeeklyRankCached();
  res.json(cached.cache.slice(0, 10));
});

router.get("/3vs3/weekly/:num", async (req: any, res: any) => {
  const { num } = req.params;
  let cached = await cache3vs3.getWeeklyRankCached();
  res.json(cached.cache.slice(0, num));
});

router.get("/3vs3/daily", async (req, res) => {
  let cached = await cache3vs3.getDailyRankCached();
  res.json(cached.cache.slice(0, 10));
});

router.get("/3vs3/daily/:num", async (req: any, res: any) => {
  const { num } = req.params;
  let cached = await cache3vs3.getDailyRankCached();
  res.json(cached.cache.slice(0, num));
});

// 4vs4

router.get("/4vs4", async (req, res) => {
  let cached = await cache4vs4.getGlobalRankCached();
  res.json(cached.cache.slice(0, 10));
});

router.get("/4vs4/:num", async (req: any, res: any) => {
  const { num } = req.params;
  let cached = await cache4vs4.getGlobalRankCached();
  res.json(cached.cache.slice(0, num));
});

router.get("/4vs4/weekly", async (req, res) => {
  let cached = await cache4vs4.getWeeklyRankCached();
  res.json(cached.cache.slice(0, 10));
});

router.get("/4vs4/weekly/:num", async (req: any, res: any) => {
  const { num } = req.params;
  let cached = await cache4vs4.getWeeklyRankCached();
  res.json(cached.cache.slice(0, num));
});

router.get("/4vs4/daily", async (req, res) => {
  let cached = await cache4vs4.getDailyRankCached();
  res.json(cached.cache.slice(0, 10));
});

router.get("/4vs4/daily/:num", async (req: any, res: any) => {
  const { num } = req.params;
  let cached = await cache4vs4.getDailyRankCached();
  res.json(cached.cache.slice(0, num));
});

export default router;