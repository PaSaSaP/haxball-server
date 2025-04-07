import express, { Request, Response } from "express";
import sqlite3 from 'sqlite3';
import { MatchStatsEntry } from "../../src/db/match_stats";
import { MatchEntry } from "../../src/db/matches";
import { MatchRankChangesDB, MatchRankChangesEntry } from "../../src/db/match_rank_changes";
import * as config from "../../src/config";
import { getTimestampHM } from "../../src/utils";
import { getAllPlayerNamesCached } from "./private/get_player_names";
import { getMatchBySelectorAndMatchId } from "./private/get_matches";
import { getMatchStatsBySelectorAndMatchId } from "./private/get_match_stats";
import { GameModeType } from "../../src/structs";

const router = express.Router();

interface AggregatedMatchStats {
  match: MatchEntry;
  matchStats: MatchStatsEntry[];
  rankChanges: MatchRankChangesEntry[];
  data: any; // post processed ready to send as json
}

interface AggregatedPlayerStat {
  name: string;

  // match related
  team: 0|1|2;
  goals: number;
  assists: number;
  own_goals: number;
  clean_sheet: number;
  playtime: number;
  full_time: number;
  left_state: number;

  // rating related
  old_rd: number;
  old_mu: number;
  new_mu: number;
  penalty: number;
}

interface Cache {
  which: "1vs1"|"3vs3"|"4vs4"|"tennis";
  dbFile: string;
  aggregated: Map<number, AggregatedMatchStats>;
}

class AggregatedCache {
  // selector: GameModeType;
  otherDbFiles: config.OtherDbFiles;
  matchStats1vs1Cache: Cache;
  matchStats3vs3Cache: Cache;
  matchStats4vs4Cache: Cache;
  matchStatsTennisCache: Cache;
  constructor() {
  // constructor(selector: GameModeType) {
    // this.selector = selector;
    this.otherDbFiles = config.AllOtherDbFiles;
    this.matchStats1vs1Cache = { which: "1vs1", dbFile: this.otherDbFiles["1vs1"], aggregated: new Map<number, AggregatedMatchStats>() };
    this.matchStats3vs3Cache = { which: "3vs3", dbFile: this.otherDbFiles["3vs3"], aggregated: new Map<number, AggregatedMatchStats>() };
    this.matchStats4vs4Cache = { which: "4vs4", dbFile: this.otherDbFiles["4vs4"], aggregated: new Map<number, AggregatedMatchStats>() };
    this.matchStatsTennisCache = { which: "tennis", dbFile: this.otherDbFiles["tennis"], aggregated: new Map<number, AggregatedMatchStats>() };
  }

  async fetchAggregated(cache: Cache, matchId: number): Promise<AggregatedMatchStats|null> {
    console.log(`${getTimestampHM()} fetching match stats ${cache.which} matchId: ${matchId}`);
    let otherDb = new sqlite3.Database(cache.dbFile, (err) => {
      if (err) console.error('Error opening database:', err.message);
    });
    let playerNames = (await getAllPlayerNamesCached()).playerNamesByAuth;

    let match: MatchEntry|null = null;
    await getMatchBySelectorAndMatchId(cache.which, matchId).then((result) => {
      match = result;
    }).catch((e) => console.error(`getMatchBySelectorAndMatchId, error: ${e}`));
    if (!match) return null;
    let matchStats: MatchStatsEntry[] = [];
    await getMatchStatsBySelectorAndMatchId(cache.which, matchId).then((result) => {
      if (result) matchStats = result;
    }).catch((e) => console.error(`getMatchStatsBySelectorAndMatchId, error: ${e}`));
    if (matchStats.length === 0) return null;

    let rankChanges: MatchRankChangesEntry[] = [];
    try {
      let rankChangesDb = new MatchRankChangesDB(otherDb);
      let results = await rankChangesDb.getMatchRankChangesFor(matchId);
      for (let result of results) {
        rankChanges.push(result);
      }
      console.log(`(${cache.which}) Got ${results.length} rank changes, matchId: ${matchId}`);
    } catch (e) { console.error(`Error for aggregated match stats: ${e}`) };
    if (rankChanges.length === 0) return null;

    let aggPlayerStats: AggregatedPlayerStat[] = [];
    for (let m of matchStats) {
      let r = rankChanges.find(e => e.auth_id === m.auth_id);
      let oldRd = 0;
      let oldMu = 0;
      let newMu = 0
      let penalty = 0;
      if (r) {
        oldRd = r.old_rd;
        oldMu = r.old_mu;
        newMu = r.new_mu;
        penalty = r.penalty;
      }
      let playerName = playerNames.get(m.auth_id) ?? 'GOD';
      aggPlayerStats.push({
        name: playerName, team: m.team, goals: m.goals, assists: m.assists, own_goals: m.own_goals,
        clean_sheet: m.clean_sheet, playtime: m.playtime, full_time: m.full_time, left_state: m.left_state,
        old_rd: oldRd, old_mu: oldMu, new_mu: newMu, penalty: penalty
      });
    }

    cache.aggregated.set(matchId, {
      match: match, matchStats: matchStats, rankChanges: rankChanges,
      data: { match: match, players: aggPlayerStats }
    });
    return cache.aggregated.get(matchId)!;
  }

  async getAggStatsCached(cache: Cache, matchId: number) {
    let agg = cache.aggregated.get(matchId);
    if (agg) return agg;
    return await this.fetchAggregated(cache, matchId);
  }
  async getAggStats1vs1Cached(matchId: number) {
    return await this.getAggStatsCached(this.matchStats1vs1Cache, matchId);
  }
  async getAggStats3vs3Cached(matchId: number) {
    return await this.getAggStatsCached(this.matchStats3vs3Cache, matchId);
  }
  async getAggStats4vs4Cached(matchId: number) {
    return await this.getAggStatsCached(this.matchStats4vs4Cache, matchId);
  }
  async getAggStatsTennisCached(matchId: number) {
    return await this.getAggStatsCached(this.matchStatsTennisCache, matchId);
  }
}

async function getCacheObject(selector: GameModeType, matchId: number) {
  if (selector === '3vs3') {
    return await cache.getAggStats3vs3Cached(matchId);
  } else if (selector === '4vs4') {
    return await cache.getAggStats4vs4Cached(matchId);
  } else if (selector === '1vs1') {
    return await cache.getAggStats1vs1Cached(matchId);
  } else if (selector === 'tennis') {
    return await cache.getAggStatsTennisCached(matchId);
  } else {
    throw new Error(`Invalid selector: ${selector}`);
  }
}

let cache = new AggregatedCache();

router.get("/:selector/id/:matchId", async (req: any, res: any) => {
  try {
    const selector = String(req.params.selector);
    const matchId = Number(req.params.matchId);
    let m = await getCacheObject(selector as GameModeType, matchId);
    if (!m) return res.json({});
    res.json(m.data);
  } catch (e) {
    console.error(`Error int get_agg_match_stats: ${e}`);
    res.status(500).json({ error: "An error occurred" });
  }
});

export default router;
