import express, { Request, Response } from "express";
import { getActiveServers } from "./get_servers";
import { getGlobalPlayersRankCached } from "./top10";

const router = express.Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    let activeServers = await getActiveServers();
    let globalRank3vs3 = await getGlobalPlayersRankCached("3vs3");
    let globalRank4vs4 = await getGlobalPlayersRankCached("4vs4");
    res.json([activeServers, globalRank3vs3.cache.slice(0, 10), globalRank4vs4.cache.slice(0, 10)]);
  } catch (err) {
    console.error("Błąd pobierania serwerów:", err);
    res.status(500).json({ error: "Wystąpił błąd" });
  }
});

export default router;
