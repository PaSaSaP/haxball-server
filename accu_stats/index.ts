// setup for example to be started by cron:
// 5,20,35,50 * * * * docker start puppeteer_accu-stats_1
import sqlite3 from 'sqlite3';
import * as config from "../src/config";
import { MatchAccumulatedStatsDB } from '../src/db/match_accumulated_stats';
import { TopRatingsDailyDB, TopRatingsWeeklyDB } from '../src/db/top_day_ratings';
import { MatchEntry, MatchesDB } from '../src/db/matches';
import { MatchStatsDB, MatchStatsEntry } from '../src/db/match_stats';
import { PlayerNamesDB } from '../src/db/player_names';
import { Match, PlayerStat, PlayerLeavedDueTo, PlayerTopRatingData } from '../src/structs';
import { Ratings } from '../src/rating';
import Glicko2 from 'glicko2';

if (!process.env.HX_SELECTOR) throw new Error("HX_SELECTOR is not set");
const selector = process.env.HX_SELECTOR;

console.log('HX_SELECTOR:', process.env.HX_SELECTOR);
if (selector == '1vs1') {
  // throw new Error(`Currently not supported selector ${selector}`);
} else if (selector == '3vs3') {
  // OK, do nothing
} else throw new Error(`Invalid HX_SELECTOR: ${selector}`);

console.log("Zaczynamy akumulowanie!");
let roomConfig = config.getRoomConfig(selector);
let playersDb = new sqlite3.Database(roomConfig.playersDbFile, (err) => {
  if (err) console.error('Error opening database:', err.message);
});
let otherDb = new sqlite3.Database(roomConfig.otherDbFile, (err) => {
  if (err) console.error('Error opening database:', err.message);
});
let playerNamesDb = new PlayerNamesDB(playersDb);
let matchesDb = new MatchesDB(otherDb);
let matchStatsDb = new MatchStatsDB(otherDb);
let matchAccuStatsDb = new MatchAccumulatedStatsDB(otherDb);
let topRatingsDaily = new TopRatingsDailyDB(otherDb);
let topRatingsWeekly = new TopRatingsWeeklyDB(otherDb);
matchesDb.setupDatabase();
matchStatsDb.setupDatabase();
matchAccuStatsDb.setupDatabase();
topRatingsDaily.setupDatabase();
topRatingsWeekly.setupDatabase();

function createPlayerStat(id: number, glicko: Glicko2.Glicko2, rating: number = PlayerStat.DefaultRating,
    rd: number = PlayerStat.DefaultRd, vol: number = PlayerStat.DefaultVol) {
  let stat = new PlayerStat(id);
  stat.glickoPlayer = glicko.makePlayer(rating, rd, vol);
  return stat;
}

function calculateRatingFor(playerNames: Map<string, string>, matchEntries: MatchEntry[],
    matchStatEntries: MatchStatsEntry[]): PlayerTopRatingData[] {
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
      console.log(`new ptr for ${playerId} ${s.auth_id} => ${playerName}`);
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
    if (s.team == m.match.winner) ptr.wins++;
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
    match.setEnd(true);
    ratings.updatePlayerStats(match, playerStats);
  }
  console.log(`player IDs: ${Array.from(playerStats.keys())}`);
  for (let [playerId, stat] of playerStats) {
    console.log(`${playerId} => ${stat.id} ${stat.games} ${stat.glickoPlayer}`)
    let ptr = playerTopRatings.get(playerId)!;
    ptr.rating = stat.glickoPlayer!.getRating();
  }
  let playerTopRatingsArray = Array.from(playerTopRatings.values());
  playerTopRatingsArray = playerTopRatingsArray.sort((lhs: PlayerTopRatingData, rhs: PlayerTopRatingData) => rhs.rating - lhs.rating);
  for (let i = 0; i < playerTopRatingsArray.length; i++) {
    playerTopRatingsArray[i].rank = i + 1;
  }
  return playerTopRatingsArray;
}

async function updateAccuStats(playerNames: Map<string, string>) {
  let currentDate = await matchesDb.getCurrentDate();
  console.log(`Current DB date: ${currentDate}`);
  await matchAccuStatsDb.updateStatsForToday();
  let matchesFromLastWeek = await matchesDb.getMatchesForLast7Days();
  let matchIdsFromLastWeek = matchesFromLastWeek.map(e => e.match_id);
  let matchesFromLastDay = matchesFromLastWeek.filter(e => e.date === currentDate);
  let matchIdsFromLastDay = matchesFromLastDay.map(e => e.match_id);
  let minMatchIdFromLasWeek = matchIdsFromLastWeek.reduce((min, current) => current < min ? current : min, Infinity);
  let maxMatchIdFromLastWeek = matchIdsFromLastWeek.reduce((max, current) => current > max ? current : max, -Infinity);
  let matchStatsFromLastWeek = await matchStatsDb.getMatchStatsForRange(minMatchIdFromLasWeek, maxMatchIdFromLastWeek);
  let matchStatsFromLastDay = matchStatsFromLastWeek.filter(e => matchIdsFromLastDay.includes(e.match_id));
  console.log("calculating weekly ratings");
  let ratingsFromLastWeek = calculateRatingFor(playerNames, matchesFromLastWeek, matchStatsFromLastWeek);
  console.log("calculating daily ratings");
  let ratingsFromLastDay = calculateRatingFor(playerNames, matchesFromLastDay, matchStatsFromLastDay);
  await topRatingsWeekly.updateTopRatingsFrom(ratingsFromLastWeek).catch((e) => e && console.error(`weekly updateTopRatingsFrom error: ${e}`));
  await topRatingsDaily.updateTopRatingsFrom(ratingsFromLastDay).catch((e) => e && console.error(`daily updateTopRatingsFrom error: ${e}`));
}

playerNamesDb.getAllPlayerNames().then(async (playerNames) => {
  await updateAccuStats(playerNames);
})

