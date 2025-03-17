// setup for example to be started by cron:
// 5,20,35,50 * * * * docker start puppeteer_accu-stats_1
import sqlite3 from 'sqlite3';
import * as config from "../src/config";
import * as secrets from "../src/secrets";
import { TopRatingDaySetings, TopRatingsDailyDB, TopRatingsWeeklyDB } from '../src/db/top_day_ratings';
import { TopRatingsDB } from '../src/db/top_ratings';
import { RollingRatingsDB, RollingRatingsData } from '../src/db/rolling_ratings';
import { MatchEntry } from '../src/db/matches';
import { MatchStatsEntry } from '../src/db/match_stats';
import { Match, PlayerStat, PlayerLeavedDueTo, PlayerTopRatingData, MatchType, GameModeType } from '../src/structs';
import { Ratings } from '../src/rating';
import Glicko2 from 'glicko2';
import { getTimestampHM } from '../src/utils';
import { promises as fs } from "fs";
import { hb_log } from '../src/log';

if (!process.env.HX_SELECTOR) throw new Error("HX_SELECTOR is not set");
const selector = process.env.HX_SELECTOR;

console.log('HX_SELECTOR:', process.env.HX_SELECTOR);
if (!['1vs1', '3vs3', '4vs4'].includes(selector)) {
  throw new Error(`Invalid HX_SELECTOR: ${selector}`);
}
console.log(`${getTimestampHM()} Zaczynamy akumulowanie!`);

class AccuStats {
  selector: GameModeType;
  mode: 'old' | 'new';
  roomConfig: config.RoomServerConfig;
  otherDb: sqlite3.Database;
  topRatingsDaily: TopRatingsDailyDB;
  topRatingsWeekly: TopRatingsWeeklyDB;
  topRatingsTotal: TopRatingsDB;
  rollingRatings: RollingRatingsDB;
  constructor(selector: GameModeType, mode: 'old'|'new') {
    this.selector = selector;
    this.mode = mode;
    this.roomConfig = config.getRoomConfig(selector);
    this.otherDb = new sqlite3.Database(this.roomConfig.otherDbFiles[selector], (err) => {
      if (err) console.error('Error opening database:', err.message);
    });
    this.topRatingsDaily = new TopRatingsDailyDB(this.otherDb);
    this.topRatingsWeekly = new TopRatingsWeeklyDB(this.otherDb);
    this.topRatingsTotal = new TopRatingsDB(this.otherDb);
    this.rollingRatings = new RollingRatingsDB(this.otherDb);
  }

  private async setupDatabases() {
    await this.topRatingsDaily.setupDatabase();
    await this.topRatingsWeekly.setupDatabase();
    await this.topRatingsTotal.setupDatabase();
    await this.rollingRatings.setupDatabase();
  }

  async run() {
    try {
      await this.setupDatabases();
      this.processOnce();
      setInterval(() => {
        this.processOnce();
      }, 5 * 1000);
    } catch (e) { e && console.error(`run error: ${e}`) };
  }

  async runOnce() {
    try {
      await this.setupDatabases();
      this.processOnce();
    } catch (e) { e && console.error(`runOnce error: ${e}`) };
  }

  private async processOnce() {
    try {
      let savedMatchId = await this.getSavedMatchId();
      let lastMatchId = await this.getLastMatchId();
      let playerNames = await this.getPlayerNames();
      if (this.areNewMatchesToProcess(savedMatchId, lastMatchId)) {
        console.log(`There is new data to process, saved:${savedMatchId} last:${lastMatchId}`);
        if (this.mode == 'old')
          await this.updateAccuStats(playerNames);
        else
          await this.updateAccuStatsRolling(playerNames);
        await this.updateSavedMatchId(lastMatchId);
      } else {
        // console.log(`No new data to process, saved:${savedMatchId} last:${lastMatchId}`);
      }
    } catch (e) { e && console.error(`processOnce error: ${e}`) };
  }

  createPlayerStat(id: number, glicko: Glicko2.Glicko2, rating: number = PlayerStat.DefaultRating,
    rd: number = PlayerStat.DefaultRd, vol: number = PlayerStat.DefaultVol) {
    let stat = new PlayerStat(id);
    stat.glickoPlayer = glicko.makePlayer(rating, rd, vol);
    return stat;
  }

  calculateRatingFor(playerNames: Map<string, string>, matchEntries: MatchEntry[],
    matchStatEntries: MatchStatsEntry[], minGames: number, playersLimit: number): PlayerTopRatingData[] {
    let glicko = new Glicko2.Glicko2();
    let ratings = new Ratings(glicko);
    let playerStats = new Map<number, PlayerStat>();
    let playerIdByAuth = new Map<string, number>();
    let nextPlayerId = 1;
    const getPlayerIdByAuth = (authId: string) => {
      if (!playerIdByAuth.has(authId)) {
        playerIdByAuth.set(authId, nextPlayerId);
        playerStats.set(nextPlayerId, this.createPlayerStat(nextPlayerId, glicko));
        nextPlayerId++;
      }
      return playerIdByAuth.get(authId)!;
    }
    let matches = new Map<number, { match: MatchEntry, stats: MatchStatsEntry[] }>();
    for (let m of matchEntries) {
      matches.set(m.match_id, { match: m, stats: [] });
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
      let match = new Match(selector as MatchType);
      const matchDuration = m.match.duration;
      for (let s of m.stats) {
        let playerId = playerIdByAuth.get(s.auth_id)!;
        if (s.team === 1) match.redTeam.push(playerId);
        else if (s.team === 2) match.blueTeam.push(playerId);
        let stat = match.stat(playerId); // create stat in match data
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
      match.winnerTeam = m.match.winner as 0 | 1 | 2;
      match.matchEndTime = matchDuration;
      match.redScore = m.match.red_score;
      match.blueScore = m.match.blue_score;
      match.pressureRed = m.match.pressure;
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

  async getSettings(): Promise<TopRatingDaySetings> {
    let settings: TopRatingDaySetings = { min_full_games_daily: 5, min_full_games_weekly: 10, min_full_games: 25, players_limit: 1000 };
    await this.topRatingsDaily.getTopRatingDaySettings().then((result) => {
      console.log("settings z tabeli");
      settings = result;
    }).catch((e) => e && console.error(`getTopRatingDaySettings error: ${e}`))
    return settings;
  }

  async fetchPrivateData(name: string) {
    const response = await fetch(`${config.localBackendService}/api/private/${name}`, {
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

  async getLastMatchId() {
    const response = await this.fetchPrivateData(`matches/${this.selector}/last_match_id`);
    const data: { match_id: number } = await response.json();
    return data.match_id;
  }

  async getPlayerNames() {
    const response = await this.fetchPrivateData('player_names');
    const data: Record<string, string> = await response.json();
    let playerNames = new Map<string, string>(Object.entries(data));
    return playerNames;
  }

  async getMatches() {
    const response = await this.fetchPrivateData(`matches/${this.selector}`);
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

  async getMatchesFrom(match_id: number) {
    const response = await this.fetchPrivateData(`matches/${this.selector}/from/${match_id}`);
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

  async getMatchStats() {
    const response = await this.fetchPrivateData(`match_stats/${this.selector}`);
    const data: [number, string, 0 | 1 | 2, number, number, number, number, number, number, number][] = await response.json();
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


  async getMatchStatsFrom(match_id: number) {
    const response = await this.fetchPrivateData(`match_stats/${this.selector}/from/${match_id}`);
    const data: [number, string, 0 | 1 | 2, number, number, number, number, number, number, number][] = await response.json();
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

  async readIntegerFromFile(filePath: string): Promise<number> {
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

  static SavedMatchIdFile = '/tmp/saved_match_id.txt';
  async getSavedMatchId() {
    let savedMatchId = await this.readIntegerFromFile(AccuStats.SavedMatchIdFile);
    return savedMatchId;
  }

  async updateSavedMatchId(matchId: number) {
    try {
      await fs.writeFile(AccuStats.SavedMatchIdFile, matchId.toString(), "utf8");
      console.log(`Saved match_id: ${matchId}`);
    } catch (error) {
      console.error("Cannot save match_id to file ", error);
    }
  }

  areNewMatchesToProcess(savedMatchId: number, lastMatchId: number) {
    if (lastMatchId !== -1 && savedMatchId !== -1) {
      return lastMatchId > savedMatchId;
    }
    return true;
  }

  async updateAccuStats(playerNames: Map<string, string>) {
    let currentDate = await this.topRatingsDaily.getCurrentDate();
    console.log(`Current DB date: ${currentDate}`);
    let matchesFromLastWeek = await this.getMatches();
    let matchesFromLastDay = matchesFromLastWeek.filter(e => e.date === currentDate);
    let matchIdsFromLastDay = matchesFromLastDay.map(e => e.match_id);
    let matchStatsFromLastWeek = await this.getMatchStats();
    let matchStatsFromLastDay = matchStatsFromLastWeek.filter(e => matchIdsFromLastDay.includes(e.match_id));
    let settings = await this.getSettings();
    console.log("calculating weekly ratings");
    let ratingsFromLastWeek = this.calculateRatingFor(playerNames, matchesFromLastWeek, matchStatsFromLastWeek, settings.min_full_games_weekly, settings.players_limit);
    console.log("calculating daily ratings");
    let ratingsFromLastDay = this.calculateRatingFor(playerNames, matchesFromLastDay, matchStatsFromLastDay, settings.min_full_games_daily, settings.players_limit);
    await this.topRatingsWeekly.updateTopRatingsFrom(ratingsFromLastWeek).catch((e) => e && console.error(`weekly updateTopRatingsFrom error: ${e}`));
    await this.topRatingsDaily.updateTopRatingsFrom(ratingsFromLastDay).catch((e) => e && console.error(`daily updateTopRatingsFrom error: ${e}`));
  }

  async updateAccuStatsRolling(playerNames: Map<string, string>) {
    let currentDate = await this.topRatingsDaily.getCurrentDate();
    console.log(`Current DB date: ${currentDate}`);
    let lastProcessedMatchId = await this.rollingRatings.getRollingRatingsMaxMatchId();
    let rollingDaysArray = await this.rollingRatings.getRollingRatingAllDays();
    let matches = await this.getMatchesFrom(lastProcessedMatchId+1);
    let matchStats = await this.getMatchStatsFrom(lastProcessedMatchId+1);
    let settings = await this.getSettings();
    let rollingData = await this.getRollingRatingsAfterMatchId(lastProcessedMatchId);
    if (!rollingData) {
      console.log("rollingData is null");
      return;
    }
    console.log(`updateAccuStatsRolling for ${rollingData.length} elements, last ID: ${lastProcessedMatchId}, matches: ${matches.length} stats: ${matchStats.length}`);
    let rrByDate: Map<string, RollingRatingsData[]> = new Map();
    for (let r of rollingData) {
      let day = rrByDate.get(r.date);
      if (!day) {
        rrByDate.set(r.date, []);
        day = rrByDate.get(r.date)!;
      }
      day.push(r);
   }
    let matchesByMatchId: Map<number, { match: MatchEntry, stats: MatchStatsEntry[] }> = new Map();
    let matchIdsByDay: Map<string, Set<number>> = new Map();
    for (let m of matches) {
      matchesByMatchId.set(m.match_id, { match: m, stats: [] });
      if (!matchIdsByDay.has(m.date)) matchIdsByDay.set(m.date, new Set());
      matchIdsByDay.get(m.date)!.add(m.match_id);
    }
    let daysSet: Set<string> = new Set(matchIdsByDay.keys());
    rollingDaysArray.forEach(day => daysSet.add(day));
    let days = Array.from(daysSet).sort((lhs: string, rhs: string) => lhs < rhs ? -1 : 1);
    for (let day of days) {
      if (!matchIdsByDay.has(day)) matchIdsByDay.set(day, new Set());
    }
    console.log(`Concat match ids for days ${days.join(" ")}`);
    for (let i = 0; i < days.length-1; ++i) {
      let matchIdsInto = matchIdsByDay.get(days[i])!;
      for (let j = i+1; j < days.length; ++j) {
        let matchIdsFrom = matchIdsByDay.get(days[j])!;
        matchIdsFrom.forEach(matchId => matchIdsInto.add(matchId));
      }
    }
    console.log(`matchIds count ${matchIdsByDay.size}`);

    for (let s of matchStats) {
      let match = matchesByMatchId.get(s.match_id);
      if (!match) {
        console.log(`No match for match stats specified by match_id=${s.match_id}`);
        continue;
      }
      match.stats.push(s);
    }
    const todayDate = currentDate;
    let weekAgoDate = this.getDateMinusDays(currentDate);
    if (weekAgoDate < days[0]) weekAgoDate = days[0];
    const oldestDate = days[0];
    for (let [day, matchIds] of matchIdsByDay) {
      if (!matchIds.size) {
        console.log(`EMpty matchIds for ${day}`);
        continue;
      }
      let rr = rrByDate.get(day) ?? [];
      await this.calculateRollingRating(playerNames, day, rr, matchIds, matchesByMatchId);
      if (day == todayDate) {
        await this.updateTopRanking(playerNames, day, settings.min_full_games_daily, settings.players_limit, this.topRatingsDaily);
      }
      if (day == weekAgoDate) {
        await this.updateTopRanking(playerNames, day, settings.min_full_games_weekly, settings.players_limit, this.topRatingsWeekly);
      }
      if (day == oldestDate) {
        await this.updateTopRanking(playerNames, day, settings.min_full_games, settings.players_limit, this.topRatingsTotal);
      }
    }
  }

  async getRollingRatingsAfterMatchId(matchId: number) {
    return await this.rollingRatings.getRollingRatingsAfterMatchId(matchId);
  }

  getDateMinusDays(dateStr: string, days: number = 6): string {
    const date = new Date(dateStr);
    date.setDate(date.getDate() - days);
    return date.toISOString().split("T")[0]; // Format YYYY-MM-DD
  }

  async calculateRollingRating(playerNames: Map<string, string>, matchDay: string, rollingRatings: RollingRatingsData[],
    affectedMatchIds: Set<number>, matchesByMatchId: Map<number, { match: MatchEntry, stats: MatchStatsEntry[] }>) {
    console.log(`calculateRollingRating for day: ${matchDay} elements: ${rollingRatings.length}`);
    let glicko = new Glicko2.Glicko2();
    let ratings = new Ratings(glicko);
    let playerStats = new Map<number, PlayerStat>();
    let playerIdByAuth = new Map<string, number>();
    let nextPlayerId = 1;
    const getPlayerIdByAuth = (authId: string) => {
      if (!playerIdByAuth.has(authId)) {
        playerIdByAuth.set(authId, nextPlayerId);
        playerStats.set(nextPlayerId, this.createPlayerStat(nextPlayerId, glicko));
        nextPlayerId++;
      }
      return playerIdByAuth.get(authId)!;
    }

    let playerTopRatings: Map<number, RollingRatingsData> = new Map();
    for (let rr of rollingRatings) {
      let playerId = getPlayerIdByAuth(rr.auth_id);
      playerTopRatings.set(playerId, rr);
    }

    console.log(`affcetedMatchIds count: ${affectedMatchIds.size}`);
    for (let matchId of affectedMatchIds) {
      let match = matchesByMatchId.get(matchId)!;
      for (let stat of match.stats) {
        let playerId = getPlayerIdByAuth(stat.auth_id);
        if (!playerTopRatings.has(playerId)) {
          playerTopRatings.set(playerId, {
            date: matchDay,
            auth_id: stat.auth_id,
            match_id: 0,
            mu: PlayerStat.DefaultRating,
            rd: PlayerStat.DefaultRd,
            vol: PlayerStat.DefaultVol,
            games: 0,
            wins: 0,
            goals: 0,
            assists: 0,
            own_goals: 0,
            clean_sheets: 0,
            playtime: 0,
            left_afk: 0,
            left_votekick: 0,
            left_server: 0,
          });
        }
        let ptr = playerTopRatings.get(playerId)!;
        if (matchId > ptr.match_id) {
          ptr.match_id = matchId;
          if (stat.full_time) ptr.games++;
          ptr.goals += stat.goals;
          ptr.assists += stat.assists;
          ptr.own_goals += stat.own_goals;
          ptr.clean_sheets += stat.clean_sheet;
          ptr.playtime += stat.playtime;
          if (match.match.full_time && stat.full_time && stat.team == match.match.winner) ptr.wins++;
          if (stat.left_state === 1) ++ptr.left_afk;
          else if (stat.left_state === 2) ++ptr.left_votekick;
          else if (stat.left_state === 3) ++ptr.left_server;
        } else {
          console.log(`!! ${playerNames.get(ptr.auth_id) ?? 'GOD'},  mId:${matchId} ptr.mId:${ptr.match_id}`);
        }
      }
    }

    for (let matchId of affectedMatchIds) {
      let m = matchesByMatchId.get(matchId)!;
      let match = new Match(selector as MatchType);
      const matchDuration = m.match.duration;
      for (let s of m.stats) {
        let playerId = playerIdByAuth.get(s.auth_id)!;
        if (s.team === 1) match.redTeam.push(playerId);
        else if (s.team === 2) match.blueTeam.push(playerId);
        let stat = match.stat(playerId); // create stat in match data
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
      match.winnerTeam = m.match.winner as 0 | 1 | 2;
      match.matchEndTime = matchDuration;
      match.redScore = m.match.red_score;
      match.blueScore = m.match.blue_score;
      match.pressureRed = m.match.pressure;
      match.possessionRed = m.match.possession;
      match.setEnd(matchDuration, true, m.match.full_time);
      ratings.calculateNewPlayersRating(match, playerStats);
    }

    console.log(`player ID count: ${playerStats.size}`);
    for (let [playerId, stat] of playerStats) {
      let ptr = playerTopRatings.get(playerId)!;
      let g = stat.glickoPlayer!;
      ptr.mu = g.getRating();
      ptr.rd = g.getRd();
      ptr.vol = g.getVol();
      // console.log(`${playerId} => ${stat.id} games:${stat.games}/${ptr.games} goals:${stat.goals}/${ptr.goals}`)
    }

    for (let [playerId, rr] of playerTopRatings) {
      await this.rollingRatings.updateRollingRatingsFrom(rr).catch((e) => hb_log(`!! updateRollingRatingsFrom error: ${e}`));
    }
  }

  async updateTopRanking(playerNames: Map<string, string>, day: string, minGames: number, playersLimit: number, ratingsDb: TopRatingsDailyDB| TopRatingsWeeklyDB|TopRatingsDB) {
    try {
      let allRatings = await this.rollingRatings.getRollingRatingsByDate(day, minGames, playersLimit);
      let result: PlayerTopRatingData[] = [];
      for (let i = 0; i < allRatings.length; i++) {
        let r = allRatings[i];
        result.push({
          rank: i + 1,
          auth_id: r.auth_id,
          player_name: playerNames.get(r.auth_id) ?? 'GOD',
          rating: Math.floor(r.mu),
          games: r.games,
          wins: r.wins,
          goals: r.goals,
          assists: r.assists,
          own_goals: r.own_goals,
          clean_sheets: r.clean_sheets
        });
      }
      await ratingsDb.updateTopRatingsFrom(result).catch((e) => hb_log(`!! updateTopRatingsFrom ${day} error: ${e}`));
      console.log(`Done, inRanking: ${result.length} settings.min: ${minGames} settings.limit: ${playersLimit}`);
    } catch (e) { hb_log(`!!recalcTopRanking error: ${e}`) };
  }
}

const mode = 'new';
let accuStats = new AccuStats(selector as GameModeType, mode);
accuStats.run();
