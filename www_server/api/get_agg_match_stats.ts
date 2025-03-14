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

const router = express.Router();

let roomConfig3vs3 = config.getRoomConfig("3vs3");
let roomConfig1vs1 = config.getRoomConfig("1vs1");

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
  which: "1vs1" | "3vs3";
  dbFile: string;
  aggregated: Map<number, AggregatedMatchStats>;
}

let matchStats1vs1Cache: Cache = { which: "1vs1", dbFile: roomConfig1vs1.otherDbFile, aggregated: new Map<number, AggregatedMatchStats>() };
let matchStats3vs3Cache: Cache = { which: "3vs3", dbFile: roomConfig3vs3.otherDbFile, aggregated: new Map<number, AggregatedMatchStats>() };

async function fetchAggregated(cache: Cache, matchId: number): Promise<AggregatedMatchStats|null> {
  console.log(`${getTimestampHM()} fetching match stats ${cache.which} matchId: ${matchId}`);
  let otherDb = new sqlite3.Database(cache.dbFile, (err) => {
    if (err) console.error('Error opening database:', err.message);
  });
  let playerNames = (await getAllPlayerNamesCached()).playerNames;

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
    let r = rankChanges.find(e => e.auth_id == m.auth_id);
    if (!r) {
      console.error(`No matching rank for match stat by auth_id: ${m.auth_id}`);
      continue;
    }
    let playerName = playerNames.get(m.auth_id) ?? 'GOD';
    aggPlayerStats.push({
      name: playerName, team: m.team, goals: m.goals, assists: m.assists, own_goals: m.own_goals, 
      clean_sheet: m.clean_sheet, playtime: m.playtime, full_time: m.full_time, left_state: m.left_state,
      old_rd: r.old_rd, old_mu: r.old_mu, new_mu: r.new_mu, penalty: r.penalty
    });
  }

  cache.aggregated.set(matchId, {
    match: match, matchStats: matchStats, rankChanges: rankChanges,
    data: { match: match, players: aggPlayerStats }
  });
  return cache.aggregated.get(matchId)!;
}

async function getAggStatsCached(cache: Cache, matchId: number) {
  let agg = cache.aggregated.get(matchId);
  if (agg) return agg;
  return await fetchAggregated(cache, matchId);
}
async function getAggStats1vs1Cached(matchId: number) {
  return await getAggStatsCached(matchStats1vs1Cache, matchId);
}
async function getAggStats3vs3Cached(matchId: number) {
  return await getAggStatsCached(matchStats3vs3Cache, matchId);
}

router.get("/1vs1/id/:matchId", async (req: any, res: any) => {
  const matchId = Number(req.params.matchId);
  let m = await getAggStats1vs1Cached(matchId);
  if (!m) return res.json({});
  res.json(m.data);
});
router.get("/3vs3/id/:matchId", async (req: any, res: any) => {
  const matchId = Number(req.params.matchId);
  let m = await getAggStats3vs3Cached(matchId);
  if (!m) return res.json({});
  console.log(`Mamy tutaj ${m.match.match_id}, data: ${m.data}`);
  res.json(m.data);
});

export default router;
