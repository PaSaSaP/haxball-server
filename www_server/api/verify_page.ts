import express, { Request, Response } from "express";
import { createCanvas } from 'canvas';
import { tokenDatabase } from '../../src/token_database';

const router = express.Router();

router.get('/', (req: Request, res: any) => {
  const { token } = req.query;
  if (!token) return res.send("❌ Nieprawidłowy token!");

  tokenDatabase.checkToken(token as string).then((row) => {
    if (!row) return res.send("❌ To nie jest oryginalny serwer!");

    const currentTime = Date.now();
    const timeElapsed = currentTime - row.timestamp;
    const timeAgo = timeElapsed < 60000
      ? `${Math.floor(timeElapsed / 1000)} sekund temu`
      : timeElapsed < 3600000
        ? `${Math.floor(timeElapsed / 60000)} minut temu`
        : `${Math.floor(timeElapsed / 3600000)} godzin temu`;

    const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.ip;

    // Tworzymy canvas w Node.js
    const canvas = createCanvas(800, 400);
    const ctx = canvas.getContext('2d');

    // Tło i szum
    ctx.fillStyle = 'rgba(255, 255, 255, 1)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Dodanie szumu
    for (let i = 0; i < 1000; i++) {
      ctx.fillStyle = 'rgba(' + Math.floor(Math.random() * 255) + ',' +
        Math.floor(Math.random() * 255) + ',' +
        Math.floor(Math.random() * 255) + ', 0.1)';
      let x = Math.floor(Math.random() * canvas.width);
      let y = Math.floor(Math.random() * canvas.height);
      function getRandomSize(min: number, max: number) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
      }
      ctx.fillRect(x, y, getRandomSize(5, 100), getRandomSize(5, 100));
    }

    // Rysowanie tekstów na canvasie
    ctx.font = "24px Arial";
    ctx.fillStyle = "black";
    const drawText = (text: string, x: number, y: number) => {
      const noiseDiff = 15;
      for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const noiseX = Math.random() * noiseDiff - 1;
        const noiseY = Math.random() * noiseDiff - 1;
        ctx.fillText(char, x + noiseX, y + noiseY);
        x += ctx.measureText(char).width + Math.random() * 5;
      }
    };

    const date_str = new Date(row.timestamp).toLocaleString('pl-PL', { hour12: false });
    drawText(`✔ Weryfikacja zakończona pomyślnie!`, 10, 30);
    drawText(`Gracz: ${row.player_name}`, 10, 80);
    drawText(`Token wygenerowany: ${date_str}`, 10, 130);
    drawText(`Minęło: ${timeAgo}`, 10, 180);
    drawText(`Adres IP klienta: ${clientIp}`, 10, 230);

    // Wysyłamy obrazek jako odpowiedź
    res.setHeader('Content-Type', 'image/png');
    const pngStream = canvas.createPNGStream(); // Poprawiona metoda
    pngStream.pipe(res); // Przekazujemy strumień obrazu do odpowiedzi
  }).catch(() => {
    res.send("Wystąpił błąd podczas weryfikacji.");
  });
});

export default router;
