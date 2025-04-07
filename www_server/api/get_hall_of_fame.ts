import express, { Request, Response } from "express";
import sqlite3 from 'sqlite3';
import {HallOfFameDB, HallOfFameEntry} from "../../src/db/hall_of_fame";
import * as config from "../../src/config";
import { GameModeType} from "../../src/structs";
import { getTimestampHM } from "../../src/utils";

const router = express.Router();

type CacheTypeEntry = [string, number, number, number, number];
interface Cache {
  which: GameModeType;
  cache: CacheTypeEntry[];
  lastFetchTime: number;
}

class HallOfFameCache {
  otherDbFiles: config.OtherDbFiles;
  hofCache: Cache

  static CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

  constructor(selector: GameModeType) {
    this.otherDbFiles = config.AllOtherDbFiles;
    this.hofCache = { which: selector, cache: [], lastFetchTime: 0 };
  }

  private async fetchHallOfFame(cache: Cache) {
    console.log(`${getTimestampHM()} Pobieranie hall of fame dla ${cache.which}`);
    let otherDb = new sqlite3.Database(this.otherDbFiles[cache.which], (err) => {
      if (err) console.error('Error opening database:', err.message);
    });
    let hallOfFameDB = new HallOfFameDB(otherDb);
    let hallOfFameEntries: HallOfFameEntry[] = await hallOfFameDB.getHallOfFame();

    let result: typeof this.hofCache.cache = [];
    for (let h of hallOfFameEntries) {
      result.push([h.player_name, h.ratio, h.rank1, h.rank2, h.rank3]);
    }
    cache.cache = result;
    cache.lastFetchTime = Date.now();
  }

  private async getHofCachedFrom(cache: Cache) {
    if (!cache.cache.length || Date.now() - cache.lastFetchTime > HallOfFameCache.CACHE_DURATION) {
      await this.fetchHallOfFame(cache);
    }
    return cache;
  }
  async getHofCached() {
    return await this.getHofCachedFrom(this.hofCache);
  }
}

let cache1vs1 = new HallOfFameCache('1vs1');
let cache3vs3 = new HallOfFameCache('3vs3');
let cache4vs4 = new HallOfFameCache('4vs4');
let cacheTennis = new HallOfFameCache('tennis');

function getCacheObject(selector: GameModeType) {
  if (selector === '1vs1') return cache1vs1.getHofCached();
  if (selector === '3vs3') return cache3vs3.getHofCached();
  if (selector === '4vs4') return cache4vs4.getHofCached();
  if (selector === 'tennis') return cacheTennis.getHofCached();
  throw new Error(`invalid selector for hall of fame: ${selector}`);
}

router.get("/:selector", async (req, res) => {
  const selector = String(req.params.selector);
  try {
    let cached = await getCacheObject(selector as GameModeType);
    res.json(cached.cache.slice(0, 10));

  } catch (e) {
    res.status(500).json({ error: `Error hall of fame for ${selector}`});
  }
});

router.get("/:selector/:num", async (req, res) => {
  const selector = String(req.params.selector);
  const num = Number(req.params.num);
  console.log(`hall of fage for ${selector} ${num}`)
  try {
    let cached = await getCacheObject(selector as GameModeType);
    console.log(`hall of fage for ${selector} ${num} ${cached.cache.length}`)
    res.json(cached.cache.slice(0, num));

  } catch (e) {
    res.status(500).json({ error: `Error hall of fame for ${selector}`});
  }
});

export default router;
