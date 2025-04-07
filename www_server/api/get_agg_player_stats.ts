import express, { Request, Response } from "express";
import sqlite3 from 'sqlite3';
import * as config from "../../src/config";
import { getTimestampHM, normalizeNameString } from "../../src/utils";
import { getAllPlayerNamesCached } from "./private/get_player_names";
import { PlayerMatchStatsDB } from "../../src/db/player_match_stats";
import { GameModeType } from "../../src/structs";

const router = express.Router();

interface AggregatedPlayerStat {
  name: string;

  // match related
  games: number;
  full_games: number;
  wins: number;
  full_wins: number;
  goals: number;
  assists: number;
  own_goals: number;
  clean_sheet: number;
  playtime: number;
}

interface Cache {
  which: "1vs1"| "3vs3"|"4vs4"|'tennis';
  dbFile: string;
  aggregated: Map<number, AggregatedPlayerStat>; // userId -> data
  lastFetchTime: Map<number, number>;
}


class AggregatedCache {
  CACHE_DURATION = 15 * 60 * 1000;
  otherDbFiles: config.OtherDbFiles;
  playerStats1vs1Cache: Cache;
  playerStats3vs3Cache: Cache;
  playerStats4vs4Cache: Cache;
  playerStatsTennisCache: Cache;
  constructor() {
    this.otherDbFiles = config.AllOtherDbFiles;
    this.playerStats1vs1Cache = { which: "1vs1", dbFile: this.otherDbFiles["1vs1"], aggregated: new Map(), lastFetchTime: new Map() };
    this.playerStats3vs3Cache = { which: "3vs3", dbFile: this.otherDbFiles["3vs3"], aggregated: new Map(), lastFetchTime: new Map() };
    this.playerStats4vs4Cache = { which: "4vs4", dbFile: this.otherDbFiles["4vs4"], aggregated: new Map(), lastFetchTime: new Map() };
    this.playerStatsTennisCache = { which: "tennis", dbFile: this.otherDbFiles["tennis"], aggregated: new Map(), lastFetchTime: new Map() };
  }

  async fetchAggregated(cache: Cache, userId: number): Promise<AggregatedPlayerStat|null> {
    console.log(`${getTimestampHM()} fetching player stats ${cache.which} userId: ${userId}`);
    let otherDb = new sqlite3.Database(cache.dbFile, (err) => {
      if (err) console.error('Error opening database:', err.message);
    });
    let playerNamesCache = await getAllPlayerNamesCached();


    try {
      const playerNameEntry = playerNamesCache.playerEntryById.get(userId)!;
      const authId = playerNameEntry.auth_id;
      let playerMatchStatsDb = new PlayerMatchStatsDB(otherDb);
      let result = await playerMatchStatsDb.loadTotalPlayerMatchStats(authId);
      if (!result) return null;
      cache.lastFetchTime.set(userId, Date.now());
      cache.aggregated.set(userId, {
        name: playerNameEntry.name,
        games: result.games,
        full_games: result.full_games,
        wins: result.wins,
        full_wins: result.full_wins,
        goals: result.goals,
        assists: result.assists,
        own_goals: result.own_goals,
        clean_sheet: result.clean_sheets,
        playtime: result.playtime,
      });
      console.log(`(${cache.which}) Got update for player uid: ${userId}, matchId: ${userId}`);
    } catch (e) { console.error(`Error for get player uid ${userId}: ${e}`) };

    return cache.aggregated.get(userId)!;
  }

  async getAggStatsCached(cache: Cache, userId: number) {
    let agg = cache.aggregated.get(userId);
    if (agg) {
      let lastFetchTime = cache.lastFetchTime.get(userId);
      if (lastFetchTime && Date.now() - lastFetchTime < this.CACHE_DURATION) {
        return agg;
      }
    }
    return await this.fetchAggregated(cache, userId);
  }
  async getAggStats1vs1Cached(userId: number) {
    return await this.getAggStatsCached(this.playerStats1vs1Cache, userId);
  }
  async getAggStats3vs3Cached(userId: number) {
    return await this.getAggStatsCached(this.playerStats3vs3Cache, userId);
  }
  async getAggStats4vs4Cached(userId: number) {
    return await this.getAggStatsCached(this.playerStats4vs4Cache, userId);
  }
  async getAggStatsTennisCached(userId: number) {
    return await this.getAggStatsCached(this.playerStatsTennisCache, userId);
  }

  async getAggStatsCachedBySelector(selector: GameModeType, userId: number) {
    if (selector === '1vs1') return await this.getAggStats1vs1Cached(userId);
    if (selector === '3vs3') return await this.getAggStats3vs3Cached(userId);
    if (selector === '4vs4') return await this.getAggStats4vs4Cached(userId);
    if (selector === 'tennis') return await this.getAggStatsTennisCached(userId);
    throw new ErrorEvent(`getAggStatsCachedBySelector(), Invalid selector: ${selector}`);
  }
}

let cache = new AggregatedCache();

router.get("/by_name/:name", async (req: any, res: any) => {
  const name: string = normalizeNameString(String(req.params.name));
  let cached = await getAllPlayerNamesCached();
  let userId = cached.playerIdsByNormalizedName.get(name);
  if (userId === undefined) {
    return res.status(400).send('No data');
  }
  try {
    let cachedV3 = await cache.getAggStatsCachedBySelector('3vs3', userId);
    let cachedV4 = await cache.getAggStatsCachedBySelector('4vs4', userId);
    let cachedTennis = await cache.getAggStatsCachedBySelector('tennis', userId);
    res.json({
      '3vs3': cachedV3,
      '4vs4': cachedV4,
      'tennis': cachedTennis,
    });
  } catch (e) {
    return res.status(400).send(`Error: ${e}`);
  }
});

router.get("/by_id/:userId", async (req: any, res: any) => {
  const userId: number = Number.parseInt(req.params.userId);
  if (userId === undefined) {
    return res.status(400).send('No data');
  }
  try {
    let cachedV3 = await cache.getAggStatsCachedBySelector('3vs3', userId);
    let cachedV4 = await cache.getAggStatsCachedBySelector('4vs4', userId);
    let cachedTennis = await cache.getAggStatsCachedBySelector('tennis', userId);
    res.json({
      '3vs3': cachedV3,
      '4vs4': cachedV4,
      'tennis': cachedTennis,
    });
  } catch (e) {
    return res.status(400).send(`Error: ${e}`);
  }
});

router.get("/:selector/by_name/:name", async (req: any, res: any) => {
  const selector: string = String(req.params.selector);
  const name: string = normalizeNameString(String(req.params.name));
  let cached = await getAllPlayerNamesCached();
  let userId = cached.playerIdsByNormalizedName.get(name);
  if (userId === undefined) {
    return res.status(400).send('No data');
  }
  try {
    let cached = await cache.getAggStatsCachedBySelector(selector as GameModeType, userId);
    res.json(cached);
  } catch (e) {
    return res.status(400).send(`Error: ${e}`);
  }
});

router.get("/:selector/by_id/:userId", async (req: any, res: any) => {
  const selector: string = String(req.params.selector);
  const userId: number = Number.parseInt(req.params.userId);
  if (userId === undefined) {
    return res.status(400).send('No data');
  }
  try {
    let cached = await cache.getAggStatsCachedBySelector(selector as GameModeType, userId);
    res.json(cached);
  } catch (e) {
    return res.status(400).send(`Error: ${e}`);
  }
});

export default router;
