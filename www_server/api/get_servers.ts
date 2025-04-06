import express, { Request, Response } from "express";
import { tokenDatabase, setupTokenDatabase } from '../../src/db/token_database';

const router = express.Router();

export async function getActiveServers() {
  try {
    await setupTokenDatabase();
    const activeServers = await tokenDatabase!.getActiveServers();
    return activeServers;
  } catch (err) {
    console.error("Błąd pobierania serwerów:", err);
    throw new Error("Wystąpił błąd");
  }
}

router.get('/', async (req: Request, res: Response) => {
  try {
    const activeServers = await getActiveServers();
    res.json(activeServers);
  } catch (err) {
    console.error("Błąd pobierania serwerów:", err);
    res.status(500).json({ error: "Wystąpił błąd" });
  }
});

export default router;
