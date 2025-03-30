import express, { Request, Response } from "express";
import { tokenDatabase, setupTokenDatabase } from '../../src/db/token_database';

const router = express.Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    await setupTokenDatabase();
    const activeServers = await tokenDatabase!.getActiveServers();
    res.json(activeServers);
  } catch (err) {
    console.error("Błąd pobierania serwerów:", err);
    res.status(500).json({ error: "Wystąpił błąd" });
  }
});

export default router;
