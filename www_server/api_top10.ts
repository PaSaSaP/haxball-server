import express, { Request, Response } from "express";
import sqlite3 from 'sqlite3';
import { PlayerNamesDB, PlayerRatingsDB } from "../src/game_state";
import * as config from "../src/config";

const router = express.Router();

let roomConfig = config.getRoomConfig("3vs3");

let cache: [string, number, number][] = [];
let lastFetchTime = 0;
const CACHE_DURATION = 10 * 60 * 1000; // 10 minut

async function fetchTop10() {
  console.log("Pobieranie danych z bazy...");
  let mainDb = new sqlite3.Database(roomConfig.playersDbFile, (err) => {
    if (err) console.error('Error opening database:', err.message);
  });
  let otherDb = new sqlite3.Database(roomConfig.otherDbFile, (err) => {
    if (err) console.error('Error opening database:', err.message);
  });
  let playerNamesDB = new PlayerNamesDB(mainDb);
  let ratingDB = new PlayerRatingsDB(otherDb);
  playerNamesDB.getAllPlayerNames().then((playerNames) => {
    ratingDB.getTop10Players().then((ratings) => {
      let result: [string, number, number][] = [];
      for (let rating of ratings) {
        let playerName = playerNames.get(rating[0]) || "GOD";
        result.push([playerName, Math.round(rating[1]), Math.round(rating[2])]);
      }
      cache = result;
      lastFetchTime = Date.now();
    });
  });
}

router.get("/", async (req, res) => {
  if (!cache || Date.now() - lastFetchTime > CACHE_DURATION) {
    await fetchTop10();
  }
  res.json(cache);
});

export default router;