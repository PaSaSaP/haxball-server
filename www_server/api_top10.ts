import express, { Request, Response } from "express";
import sqlite3 from 'sqlite3';
import {TopRatingsDB} from "../src/db/top_ratings";
import * as config from "../src/config";

const router = express.Router();

let roomConfig = config.getRoomConfig("3vs3");

let cache: [string, number, number][] = [];
let lastFetchTime = 0;
const CACHE_DURATION = 10 * 60 * 1000; // 10 minut

async function fetchTop10() {
  console.log("Pobieranie danych z bazy...");
  let otherDb = new sqlite3.Database(roomConfig.otherDbFile, (err) => {
    if (err) console.error('Error opening database:', err.message);
  });
  let topRatingsDB = new TopRatingsDB(otherDb);
  topRatingsDB.getTopNPlayers(10).then((ratings) => {
      let result: [string, number, number][] = [];
    for (let rating of ratings) {
      result.push([rating.player_name, rating.rating, rating.total_full_games]);
    }
    cache = result;
    lastFetchTime = Date.now();
  });
}

router.get("/", async (req, res) => {
  if (!cache || Date.now() - lastFetchTime > CACHE_DURATION) {
    await fetchTop10();
  }
  res.json(cache);
});

export default router;