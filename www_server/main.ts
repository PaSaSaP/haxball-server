import express, { Request, Response } from 'express';
import { tokenDatabase, setupTokenDatabase, ServerRow } from '../src/db/token_database';

const router = express.Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    // Pobierz aktywne serwery
    await setupTokenDatabase();
    const activeServers = await tokenDatabase!.getActiveServers();

    // Buduj HTML dla wyświetlenia
    let htmlContent = `
        <html>
          <head>
            <title>Active Servers</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                margin: 0;
                padding: 20px;
                background-color: #f4f4f4;
              }
              .server-list {
                list-style-type: none;
                padding: 0;
              }
              .server-item {
                background-color: #fff;
                margin: 10px 0;
                padding: 10px;
                border-radius: 5px;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
              }
              .server-item a {
                text-decoration: none;
                font-weight: bold;
                color: #007bff;
              }
              .server-item a:hover {
                text-decoration: underline;
              }
              .player-count {
                font-size: 14px;
                color: #555;
              }
            </style>
          </head>
          <body>
            <h1>Active Servers</h1>
            <ul class="server-list">
      `;

    // Przejdź po serwerach i generuj HTML dla każdego z nich
    activeServers.forEach((server) => {
      // Zabezpieczenie przed XSS - sprawdź i bezpiecznie wstaw linki i tokeny
      const sanitizedLink = encodeURI(server.link);
      const sanitizedRoomName = server.room_name.replace(/[^\w\s]/gi, ''); // Proste usunięcie niebezpiecznych znaków
      if (server.player_num > server.player_max) server.player_num = server.player_max;

      htmlContent += `
          <li class="server-item">
            <a href="${sanitizedLink}" target="_blank">${sanitizedRoomName}</a>
            <div class="player-count">${server.player_num} / ${server.player_max} players</div>
          </li>
        `;
    });

    htmlContent += `
            </ul>
          </body>
        </html>
      `;

    // Zwróć stronę z listą serwerów
    res.send(htmlContent);

  } catch (err) {
    console.error('Błąd podczas pobierania danych serwerów:', err);
    res.status(500).send('Wystąpił błąd');
  }
});

export default router;
