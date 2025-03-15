// monitoring can tell if server is still sending ping
// docker has healthcheck so it marks containers as unhealthy
// so we need to restart somehow container which should be easy task
// but it is not!
// so add below crontab rule to restart unhealthy containers
// * * * * * docker ps -q -f health=unhealthy | xargs --no-run-if-empty docker restart
// https://stackoverflow.com/a/74014021/7141464
const { Client, GatewayIntentBits } = require('discord.js');
const fs = require('fs');
import { tokenDatabase } from '../src/token_database';
import * as secrets from "../src/secrets";

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const userId = '1345319721863741515';

async function sendPrivateMessage(message: string) {
  try {
    const user = await client.users.fetch(userId);
    await user.send(message);
  } catch (error) {
    console.error('Błąd wysyłania wiadomości:', error);
  }
}

const handleServerTimeout = (selector: string) => {
  const message = `Serwer ${selector} nie wysłał zapytania przez 30 sekund!`;
  sendPrivateMessage(message);
  tokenDatabase.updateServerStatus(selector, false);
};

const serverStatus: Record<string, number> = {};
serverStatus['3vs3_1'] = Date.now();
serverStatus['3vs3_2'] = Date.now();
serverStatus['3vs3_3'] = Date.now();
serverStatus['1vs1_1'] = Date.now();

function shouldBeServerEnabled(selector: string): boolean {
  const fpath = `./dynamic/server_active_${selector}.txt`;
  return fs.existsSync(fpath);
}

const checkServerTimeouts = () => {
  const currentTime = Date.now();

  Object.keys(serverStatus).forEach((selector: string) => {
    if (shouldBeServerEnabled(selector)) {
      const lastRequestTime = serverStatus[selector];

      if (currentTime - lastRequestTime > 30000) {
        handleServerTimeout(selector);
      }
    }
  });
};

setInterval(checkServerTimeouts, 5000);

const express = require('express');
const app = express();
const port = 80;

app.get('/ping/:selector', (req: any, res: any) => {
  const selector = req.params.selector;
  serverStatus[selector] = Date.now();
  res.send(`Serwer ${selector} jest aktywny`);
});

app.get('/healthcheck/:selector', (req: any, res: any) => {
  const selector = req.params.selector;
  const lastRequestTime = serverStatus[selector] || 0;
  const currentTime = Date.now();

  if (currentTime - lastRequestTime > 30000) {
    res.status(404).send(`Serwer ${selector} nie odpowiada`);
  } else {
    res.send(`Serwer ${selector} działa`);
  }
});

app.listen(port, () => {
  console.log(`Aplikacja nasłuchuje na porcie ${port}`);
});

client.once("ready", () => {
  console.log(`Bot zalogowany jako ${client.user?.tag}`);
});

client.login(secrets.DiscordToken);
