import express, { Request, Response } from "express";
import sqlite3 from 'sqlite3';
import { ShortLinksDB } from "../src/db/short_links";
import * as config from "../src/config";

const router = express.Router();

let roomConfig = config.getRoomConfig("3vs3");
let vipDb = new sqlite3.Database(roomConfig.vipDbFile, (err) => {
  if (err) console.error('Error opening database:', err.message);
});
let shortLinksDb = new ShortLinksDB(vipDb);
shortLinksDb.setupDatabase();

router.get("/:hash", async (req: any, res: any) => {
  const { hash } = req.params;
  try {
    const longLink = await shortLinksDb.getLongLinkByHash(hash);
    if (longLink) {
      return res.redirect(longLink);
    } else {
      return res.redirect('/404');
    }
  } catch (error) {
    console.error("Błąd podczas pobierania linku:", error);
    return res.status(500).send("Wystąpił błąd przy przetwarzaniu żądania.");
  }
});

export default router;
