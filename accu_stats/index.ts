// setup for example to be started by cron:
// 5,20,35,50 * * * * docker start puppeteer_accu-stats_1
import sqlite3 from 'sqlite3';
import * as config from "../src/config";
import * as secrets from "../src/secrets";
import { MatchAccumulatedStatsDB } from '../src/db/match_accumulated_stats';
import { TopRatingDaySetings, TopRatingsDailyDB, TopRatingsWeeklyDB } from '../src/db/top_day_ratings';
import { TopRatingsDB } from '../src/db/top_ratings';
import { MatchEntry } from '../src/db/matches';
import { MatchStatsEntry } from '../src/db/match_stats';
import { Match, PlayerStat, PlayerLeavedDueTo, PlayerTopRatingData } from '../src/structs';
import { Ratings } from '../src/rating';
import Glicko2 from 'glicko2';
import { getTimestampHM } from '../src/utils';
import { promises as fs } from "fs";


if (!process.env.HX_SELECTOR) throw new Error("HX_SELECTOR is not set");
const selector = process.env.HX_SELECTOR;

console.log('HX_SELECTOR:', process.env.HX_SELECTOR);
if (selector == '1vs1') {
  // OK, do nothing
} else if (selector == '3vs3') {
  // OK, do nothing
} else throw new Error(`Invalid HX_SELECTOR: ${selector}`);

console.log(`${getTimestampHM()} Zaczynamy akumulowanie!`);
let roomConfig = config.getRoomConfig(selector);
let otherDb = new sqlite3.Database(roomConfig.otherDbFile, (err) => {
  if (err) console.error('Error opening database:', err.message);
});
let matchAccuStatsDb = new MatchAccumulatedStatsDB(otherDb);
let topRatingsDaily = new TopRatingsDailyDB(otherDb);
let topRatingsWeekly = new TopRatingsWeeklyDB(otherDb);
let topRatingsTotal = new TopRatingsDB(otherDb);
topRatingsDaily.setupDatabase();
topRatingsWeekly.setupDatabase();
topRatingsTotal.setupDatabase();

function createPlayerStat(id: number, glicko: Glicko2.Glicko2, rating: number = PlayerStat.DefaultRating,
    rd: number = PlayerStat.DefaultRd, vol: number = PlayerStat.DefaultVol) {
  let stat = new PlayerStat(id);
  stat.glickoPlayer = glicko.makePlayer(rating, rd, vol);
  return stat;
}

function calculateRatingFor(playerNames: Map<string, string>, matchEntries: MatchEntry[],
    matchStatEntries: MatchStatsEntry[], minGames: number, playersLimit: number): PlayerTopRatingData[] {
  let glicko = new Glicko2.Glicko2();
  let ratings = new Ratings(glicko);
  let playerStats = new Map<number, PlayerStat>();
  let playerIdByAuth = new Map<string, number>();
  let nextPlayerId = 1;
  const getPlayerIdByAuth = (authId: string) => {
    if (!playerIdByAuth.has(authId)) {
      playerIdByAuth.set(authId, nextPlayerId);
      playerStats.set(nextPlayerId, createPlayerStat(nextPlayerId, glicko));
      nextPlayerId++;
    }
    return playerIdByAuth.get(authId)!;
  }
  let matches = new Map<number, { match: MatchEntry, stats: MatchStatsEntry[] }>();
  for (let m of matchEntries) {
    matches.set(m.match_id, {match: m, stats: []});
  }
  let playerTopRatings = new Map<number, PlayerTopRatingData>();
  for (let s of matchStatEntries) {
    if (!matches.get(s.match_id)) continue; // if match stat not related to match, out of range or sth
    let playerId = getPlayerIdByAuth(s.auth_id);
    if (!playerTopRatings.has(playerId)) {
      const playerName = playerNames.get(s.auth_id) ?? 'GOD'; 
      playerTopRatings.set(playerId, {
        rank: 0,
        auth_id: s.auth_id,
        player_name: playerName,
        rating: 0,
        games: 0,
        wins: 0,
        goals: 0,
        assists: 0,
        own_goals: 0,
        clean_sheets: 0
      });
      // console.log(`new ptr for ${playerId} ${s.auth_id} => ${playerName}`);
    }
    let ptr = playerTopRatings.get(playerId)!;
    if (s.full_time) ptr.games++;
    ptr.goals += s.goals;
    ptr.assists += s.assists;
    ptr.own_goals += s.own_goals;
    ptr.clean_sheets += s.clean_sheet;
    let m = matches.get(s.match_id);
    if (!m) {
      console.error(`Nie moge znaleźć match dla match_id ${s.match_id}`);
      continue;
    }
    if (m.match.full_time && s.full_time && s.team == m.match.winner) ptr.wins++;
    m.stats.push(s);
  }
  for (let [matchId, m] of matches) {
    let match = new Match();
    const matchDuration = m.match.duration;
    for (let s of m.stats) {
      let playerId = playerIdByAuth.get(s.auth_id)!;
      if (s.team === 1) match.redTeam.push(playerId);
      else if (s.team === 2) match.blueTeam.push(playerId);
      let stat = match.stat(playerId);
      if (!s.full_time) {
        if (!s.left_state) {
          stat.joinedAt = matchDuration - s.playtime;
        } else {
          stat.leftAt = s.playtime;
          if (s.left_state === 1) stat.leftDueTo = PlayerLeavedDueTo.afk;
          else if (s.left_state === 2) stat.leftDueTo = PlayerLeavedDueTo.voteKicked;
          else if (s.left_state === 3) stat.leftDueTo = PlayerLeavedDueTo.leftServer;
        }
      }
    }
    match.winnerTeam = m.match.winner as 0|1|2;
    match.matchEndTime = matchDuration;
    match.redScore = m.match.red_score;
    match.blueScore = m.match.blue_score;
    match.pressureRed = m.match.pressure;
    match.pressureBlue = 100 - match.pressureRed;
    match.setEnd(matchDuration, true, m.match.full_time);
    ratings.calculateNewPlayersRating(match, playerStats);
  }
  console.log(`player ID count: ${playerStats.size}`);
  for (let [playerId, stat] of playerStats) {
    let ptr = playerTopRatings.get(playerId)!;
    ptr.rating = stat.glickoPlayer!.getRating();
    // console.log(`${playerId} => ${stat.id} games:${stat.games}/${ptr.games} goals:${stat.goals}/${ptr.goals}`)
  }
  let playerTopRatingsArray = Array.from(playerTopRatings.values());
  playerTopRatingsArray = playerTopRatingsArray.sort((lhs: PlayerTopRatingData, rhs: PlayerTopRatingData) => rhs.rating - lhs.rating);
  const nAll = playerTopRatingsArray.length;
  playerTopRatingsArray = playerTopRatingsArray.filter(e => e.games >= minGames);
  const nGames = playerTopRatingsArray.length;
  playerTopRatingsArray = playerTopRatingsArray.slice(0, playersLimit);
  const nLimit = playerTopRatingsArray.length;
  for (let i = 0; i < playerTopRatingsArray.length; i++) {
    playerTopRatingsArray[i].rank = i + 1;
  }
  console.log(`Done, all:${nAll} games:${nGames} limit:${nLimit}, settings.min=${minGames} settings.limit=${playersLimit}`);
  return playerTopRatingsArray;
}

async function getSettings(): Promise<TopRatingDaySetings> {
  let settings: TopRatingDaySetings = { min_full_games_daily: 5, min_full_games_weekly: 10, players_limit: 1000 };
  await topRatingsDaily.getTopRatingDaySettings().then((result) => {
    console.log("settings z tabeli");
    settings = result;
  }).catch((e) => e && console.error(`getTopRatingDaySettings error: ${e}`))
  return settings;
}

async function fetchData() {
  const response = await fetch("https://example.com/api/data", {
    method: "GET",
    headers: {
      "x-api-key": "your-secret-api-key",
      "Content-Type": "application/json"
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP error! Status: ${response.status}`);
  }

  const data = await response.json();
  console.log(data);
}

async function fetchPrivateData(name: string) {
  const response = await fetch(`${config.webpageLink}/api/private/${name}`, {
    method: "GET",
    headers: {
      "x-api-key": secrets.PrivateApiKey,
      "Content-Type": "application/json",
    }
  });
  if (!response.ok) {
    throw new Error(`HTTP error getting ${name}! Staus ${response.status}`);
  }
  return response;
}

async function getLastMatchId() {
  const response = await fetchPrivateData(`matches/${selector}/last_match_id`);
  const data: { match_id: number } = await response.json();
  return data.match_id;
}

async function getPlayerNames() {
  const response = await fetchPrivateData('player_names');
  const data: Record<string, string> = await response.json();
  let playerNames = new Map<string, string>(Object.entries(data));
  return playerNames;
}

async function getMatches() {
  const response = await fetchPrivateData(`matches/${selector}`);
  const data: [number, string, number, boolean, number, number, number, number, number][] = await response.json();
  let matches: MatchEntry[] = data.map(row => ({
    match_id: row[0],
    date: row[1],
    duration: row[2],
    full_time: row[3],
    winner: row[4],
    red_score: row[5],
    blue_score: row[6],
    pressure: row[7],
    possession: row[8]
  }));
  return matches;
}

async function getMatchStats() {
  const response = await fetchPrivateData(`match_stats/${selector}`);
  const data: [number, string, 0|1|2, number, number, number, number, number, number, number][] = await response.json();
  let matchStats: MatchStatsEntry[] = data.map(row => ({
    match_id: row[0],
    auth_id: row[1],
    team: row[2],
    goals: row[3],
    assists: row[4],
    own_goals: row[5],
    clean_sheet: row[6],
    playtime: row[7],
    full_time: row[8],
    left_state: row[9],
  }));
  return matchStats;
}

async function readIntegerFromFile(filePath: string): Promise<number> {
  try {
    const data = await fs.readFile(filePath, "utf8");
    if (data.trim() === "") {
      return -1;
    }
    const parsedNumber = parseInt(data.trim(), 10);
    return isNaN(parsedNumber) ? -1 : parsedNumber;
  } catch (error: any) {
    if (error.code === "ENOENT") {
      return -1;
    }
    throw error;
  }
}

const SavedMatchIdFile = '/tmp/saved_match_id.txt';
async function getSavedMatchId() {
  let savedMatchId = await readIntegerFromFile(SavedMatchIdFile);
  return savedMatchId;
}

async function updateSavedMatchId(matchId: number) {
  try {
    await fs.writeFile(SavedMatchIdFile, matchId.toString(), "utf8");
    console.log(`Saved match_id: ${matchId}`);
  } catch (error) {
    console.error("Cannot save match_id to file ", error);
  }
}

function areNewMatchesToProcess(savedMatchId: number, lastMatchId: number) {
  if (lastMatchId !== -1 && savedMatchId !== -1) {
    return lastMatchId > savedMatchId;
  }
  return true;
}

async function updateTotalRanking(playerNames: Map<string, string>) {
  await topRatingsTotal.updateTopRatings(playerNames);
}

async function updateAccuStats(playerNames: Map<string, string>) {
  let currentDate = await matchAccuStatsDb.getCurrentDate();
  console.log(`Current DB date: ${currentDate}`);
  await matchAccuStatsDb.updateStatsForToday();
  let matchesFromLastWeek = await getMatches();
  let matchesFromLastDay = matchesFromLastWeek.filter(e => e.date === currentDate);
  let matchIdsFromLastDay = matchesFromLastDay.map(e => e.match_id);
  let matchStatsFromLastWeek = await getMatchStats();
  let matchStatsFromLastDay = matchStatsFromLastWeek.filter(e => matchIdsFromLastDay.includes(e.match_id));
  let settings = await getSettings();
  console.log("calculating weekly ratings");
  let ratingsFromLastWeek = calculateRatingFor(playerNames, matchesFromLastWeek, matchStatsFromLastWeek, settings.min_full_games_weekly, settings.players_limit);
  console.log("calculating daily ratings");
  let ratingsFromLastDay = calculateRatingFor(playerNames, matchesFromLastDay, matchStatsFromLastDay, settings.min_full_games_daily, settings.players_limit);
  await topRatingsWeekly.updateTopRatingsFrom(ratingsFromLastWeek).catch((e) => e && console.error(`weekly updateTopRatingsFrom error: ${e}`));
  await topRatingsDaily.updateTopRatingsFrom(ratingsFromLastDay).catch((e) => e && console.error(`daily updateTopRatingsFrom error: ${e}`));
}

(async () => {
  let savedMatchId = await getSavedMatchId();
  let lastMatchId = await getLastMatchId();
  let playerNames = await getPlayerNames();
  await updateTotalRanking(playerNames);
  if (areNewMatchesToProcess(savedMatchId, lastMatchId)) {
    console.log(`There is new data to process, saved:${savedMatchId} last:${lastMatchId}`);
    await updateAccuStats(playerNames);
    await updateSavedMatchId(lastMatchId);
  } else {
    console.log(`No new data to process, saved:${savedMatchId} last:${lastMatchId}`);
  }
})().catch((e) => e && console.error(`updateAccuStats error: ${e}`));
