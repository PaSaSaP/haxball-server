import express, { Request, Response } from "express";
import { tokenDatabase } from '../../src/token_database';

const router = express.Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const activeServers = await tokenDatabase.getActiveServers();
    res.json(activeServers);
  } catch (err) {
    console.error("Błąd pobierania serwerów:", err);
    res.status(500).json({ error: "Wystąpił błąd" });
  }
});

export default router;
