import express, { Request, Response } from "express";
import sqlite3 from 'sqlite3';
import {TopRatingsDB} from "../src/db/top_ratings";
import * as config from "../src/config";

const router = express.Router();

let roomConfig = config.getRoomConfig("3vs3");

let cache: [string, number, number, number, number, number, number, number][] = [];
let lastFetchTime = 0;
const CACHE_DURATION = 10 * 60 * 1000; // 10 minut

async function fetchTopPlayers() {
  console.log("Pobieranie danych z bazy...");
  let otherDb = new sqlite3.Database(roomConfig.otherDbFile, (err) => {
    if (err) console.error('Error opening database:', err.message);
  });
  let topRatingsDB = new TopRatingsDB(otherDb);
  topRatingsDB.getTopNPlayers(1000).then((ratings) => {
      let result: [string, number, number, number, number, number, number, number][] = [];
    for (let rating of ratings) {
      result.push([rating.player_name, rating.rating, rating.games, rating.wins, rating.goals, rating.assists,
        rating.own_goals, rating.clean_sheets]);
    }
    cache = result;
    lastFetchTime = Date.now();
  });
}

async function getCached() {
  if (!cache || Date.now() - lastFetchTime > CACHE_DURATION) {
    await fetchTopPlayers();
  }
  return cache;
}

router.get("/", async (req, res) => {
  let cached = await getCached();
  res.json(cached.slice(0, 10));
});

router.get("/:num", async (req: any, res: any) => {
  const { num } = req.params;
  let cached = await getCached();
  res.json(cached.slice(0, num));
});

export default router;