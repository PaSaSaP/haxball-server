import express, { Request, Response } from "express";
import fs from 'fs';
import { createReadStream } from 'fs';

const matches_dir = '/src/recordings';
const router = express.Router();
const allowedModes = ['1vs1', '2vs2', '3vs3', '4vs4', 'volleyball', 'tennis'];

router.get('/:selector/:matchId', async (req: Request, res: Response) => {
  try {
    const selector = req.params.selector;
    if (!allowedModes.includes(selector)) {
      res.status(404).send('Invalid selector');
      return;
    }
    const matchId = Number(req.params.matchId);
    if (isNaN(matchId) || matchId < 0) {
      res.status(404).send('Invalid matchId');
      return;
    }
    const filename = `${selector}-M${matchId}.hbr2.gz`;
    const fullPath = `${matches_dir}/${filename}`;

    fs.access(fullPath, fs.constants.R_OK, (err) => {
      if (err) {
        res.status(404).send('File not found');
        return;
      }

      res.setHeader('Content-Encoding', 'gzip');
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Cache-Control', 'public, max-age=86400, immutable'); // 24h cache
      const stream = createReadStream(fullPath);
      stream.pipe(res);
    });
  } catch (err) {
    console.error("Błąd wysyłania nagrania:", err);
    res.status(500).json({ error: "Wystąpił błąd" });
  }
});

export default router;
