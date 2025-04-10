import express, { Request, Response } from "express";
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import fg from 'fast-glob';

const router = express.Router();

//                   date,   active, afk
type PlayersCount = [string, number, number];

interface Cache {
  data: Map<string, PlayersCount[]>;
  cache: [string, PlayersCount[]][];
  lastFetchTime: number;
}

async function readCsvFile(fileName: string): Promise<PlayersCount[]> {
  const filePath = path.resolve(fileName);
  const fileStream = fs.createReadStream(filePath, 'utf8');

  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  const results: PlayersCount[] = [];
  const now = Date.now();
  const timeLimit = now - 48 * 60 * 60 * 1000; // 48h wstecz
  let collecting = false; // Zmienna kontrolująca zapis

  for await (const line of rl) {
    const parts = line.split(',');

    if (parts.length < 3 || parts.length > 4) {
      console.warn(`Nieprawidłowy format linii: ${line}`);
      continue;
    }

    const dateTimeString = `${parts[0]}T${parts[1]}Z`;
    const entryTimestamp = new Date(dateTimeString).getTime();

    if (isNaN(entryTimestamp)) {
      console.warn(`Niepoprawna data/godzina: ${line}`);
      continue;
    }

    if (!collecting) {
      if (entryTimestamp >= timeLimit) {
        collecting = true; // Od tej pory zapisujemy dane
      } else {
        continue; // Pomijamy stare wpisy
      }
    }
    results.push([dateTimeString, parseInt(parts[2], 10), parts[3] ? parseInt(parts[3], 10) : 0]);
  }

  return results;
}

async function fetchAllPlayerCounts(cache: Cache) {
  let results: typeof cache.data = new Map();
  const matches = await fg('./dynamic/current_players_number_*.csv');
  for (let filename of matches) {
    let content = await readCsvFile(filename);
    const nsplit = filename.split('_');
    const selector = nsplit.slice(-2).join('_').split('.').at(0);
    if (!selector) {
      throw new Error(`fetchAllPlayerCounts(): empty selector for file ${filename}`);
    }
    results.set(selector, content);
  }
  cache.cache = Array.from(results.entries());
  cache.lastFetchTime = Date.now();
  return results;
}

const CACHE_DURATION = 1 * 60 * 1000;
let cache: Cache = { cache: [], data: new Map(), lastFetchTime: 0 };

async function getAllPlayerCounts() {
  if (!cache.cache.length || Date.now() - cache.lastFetchTime > CACHE_DURATION) {
    await fetchAllPlayerCounts(cache);
  }
  return cache;
}

router.get('/', async (req: Request, res: Response) => {
  try {
    let cache = await getAllPlayerCounts();
    res.json(cache.cache);
  } catch (err) {
    console.error("Błąd pobierania serwerów:", err);
    res.status(500).json({ error: "Wystąpił błąd" });
  }
});

export default router;
