// monitoring can tell if server is still sending ping
// docker has healthcheck so it marks containers as unhealthy
// so we need to restart somehow container which should be easy task
// but it is not!
// so add below crontab rule to restart unhealthy containers
// * * * * * docker ps -q -f health=unhealthy | xargs --no-run-if-empty docker restart
// https://stackoverflow.com/a/74014021/7141464

const { Client, GatewayIntentBits } = require('discord.js');
import * as fs from 'fs/promises';  // Użycie modułu z wersjami promisywnymi
const express = require('express');
import { tokenDatabase } from '../src/token_database';
import * as secrets from "../src/secrets";
import { getTimestampHMS } from "../src/utils";

class ServerMonitor {
  private client: typeof Client;
  private lastDiscordMsgSent: Map<string, number> = new Map();
  private serverStatus: Map<string, number> = new Map();
  private playerCounts: Map<string, number[]> = new Map();
  private maxServers: Record<string, number> = { '3vs3': 3, '1vs1': 2 };
  private userId = '1345319721863741515';
  private csvDir = './dynamic';
  private checkInterval = 5 * 1000;
  private lastPlayerNum: Map<string, number>;
  // configurable options
  private scaleUpThreshold = 10;
  private scaleDownThreshold = 3;
  private scaleCheckDuration = 3 * 60 * 1000;
  private lastScaleAction: Map<string, number> = new Map();
  private cooldownTime = 3 * 60 * 1000;
  private lastServerActiveStatusUpdate = 0;
  private pingLogs = false;

  private config: any = {};
  private configPath = './monitoring/config.json';

  constructor() {
    this.client = new Client({ intents: [GatewayIntentBits.Guilds] });
    this.lastPlayerNum = new Map<string, number>();
    this.client.once('ready', () => {
      MLog(`Bot zalogowany jako ${this.client.user?.tag}`);
    });
    this.client.login(secrets.DiscordToken);
    setInterval(() => this.checkServerTimeouts(), this.checkInterval);
    setInterval(() => this.scaleServers(), this.checkInterval);
  }

  private async sendPrivateMessage(message: string) {
    try {
      const user = await this.client.users.fetch(this.userId);
      await user.send(message);
    } catch (error) {
      MLog(`Błąd wysyłania wiadomości: ${error}`);
    }
  }

  private async loadConfig() {
    try {
      const rawData = await fs.readFile(this.configPath, 'utf-8');
      const newConfig = JSON.parse(rawData);
      this.config = newConfig;
    } catch (error) {
      MLog(`Błąd ładowania konfiguracji: ${error}`);
    }
    this.maxServers = this.config.maxServers ?? { '3vs3': 3, '1vs1': 2 };
    this.scaleUpThreshold = this.config.scaleUpThreshold ?? 10;
    this.scaleDownThreshold = this.config.scaleDownThreshold ?? 3;
    this.scaleCheckDuration = this.config.scaleCheckDuration ?? 3 * 60 * 1000;
    this.cooldownTime = this.config.cooldownTime ?? 180000;
    this.pingLogs = this.config.pingLogs ?? false;
  }

  private async shouldBeServerEnabled(selector: string): Promise<boolean> {
    try {
      await fs.access(`./dynamic/server_active_${selector}.txt`);
      return true;
    } catch (error) {
      return false;
    }
  }

  private handleServerTimeout(selector: string) {
    this.sendPrivateMessage(`Serwer ${selector} nie wysłał zapytania przez 30 sekund!`);
    tokenDatabase.updateServerStatus(selector, false);
  }

  private updateServerStatusForScaledOut() {
    const now = Date.now();
    if (now - this.lastServerActiveStatusUpdate < 60_000) return;
    this.lastServerActiveStatusUpdate = now;
    tokenDatabase.getActiveServers().then(async (servers) => {
      for (let server of servers) {
        if (server.active && !(await this.shouldBeServerEnabled(server.selector))) {
          tokenDatabase.updateServerStatus(server.selector, false);
        }
      }
    }).catch((e) => MLog(`getActiveServers error ${e}`));
  }

  private async checkServerTimeouts() {
    this.updateServerStatusForScaledOut();
    const currentTime = Date.now();
    for (const selector of Object.keys(this.maxServers)) {
      const maxServerCount = this.maxServers[selector];
      for (let subselector = 1; subselector <= maxServerCount; subselector++) {
        const fullSelector = `${selector}_${subselector}`;
        if (await this.shouldBeServerEnabled(fullSelector)) {
          const lastRequestTime = this.serverStatus.get(fullSelector) ?? 0;
          if (currentTime - lastRequestTime > 30000) {
            const lastSentTime = this.lastDiscordMsgSent.get(fullSelector) ?? 0;
            if (currentTime - lastSentTime > 30000) {
              MLog(`Timeout dla serwera: ${fullSelector}`);
              this.handleServerTimeout(fullSelector);
              this.lastDiscordMsgSent.set(fullSelector, currentTime);
            }
          }
        }
      }
    }
  }

  private async scaleServers() {
    await this.loadConfig();
    for (const selectorKey of Object.keys(this.maxServers)) {
      const maxServerCount = this.maxServers[selectorKey];

      const now = Date.now();
      let lastScaleActionForSelector = this.lastScaleAction.get(selectorKey);
      if (lastScaleActionForSelector && now - lastScaleActionForSelector < this.cooldownTime) {
        continue;
      }

      let activeServers = await Promise.all(
        Array.from({ length: maxServerCount }, (_, i) => `${selectorKey}_${i + 1}`)
          .map(async (s) => {
            const isEnabled = await this.shouldBeServerEnabled(s);
            return isEnabled ? s : null;
          })
      );
      activeServers = activeServers.filter((server) => server !== null);
      // if monitoring just started then set cooldown just like it started some time ago
      activeServers.forEach(sselector => {
        if (sselector && !this.lastScaleAction.has(sselector)) this.lastScaleAction.set(sselector, now - (2/3)*this.cooldownTime);
      });

      let activePlayerCount = 0;
      for (let i = 1; i <= maxServerCount; i++) {
        const fullSelector = `${selectorKey}_${i}`;
        if (this.playerCounts.has(fullSelector)) {
          const playerCount = this.playerCounts.get(fullSelector) || [];
          const lastThreeMinutes = playerCount.slice(-Math.floor(this.scaleCheckDuration / this.checkInterval));
          const averagePlayers = lastThreeMinutes.reduce((a, b) => a + b, 0) / lastThreeMinutes.length || 0;
          activePlayerCount += averagePlayers;
        }
      }
      const averagePlayers = activePlayerCount / activeServers.length;
      if (averagePlayers >= this.scaleUpThreshold && activeServers.length < maxServerCount) {
        const newServerFullSelector = `${selectorKey}_${activeServers.length + 1}`;
        fs.writeFile(`./dynamic/server_active_${newServerFullSelector}.txt`, '');
        this.sendPrivateMessage(`Tworzę plik dla nowego serwera: ${newServerFullSelector}`);
        MLog(`Tworzę plik dla nowego serwera: ${newServerFullSelector} (avg=${averagePlayers}, act=${activePlayerCount}, se=${activeServers.length}, thr=${this.scaleUpThreshold})`);
        this.lastScaleAction.set(selectorKey, now);
        for (let i = 1; i <= activeServers.length; ++i) {
          const serverSelector = `${selectorKey}_${i}`;
          this.sendGodCommand(serverSelector, `!anno Wiele Was tutaj, za parę chwil pojawi się nowy serwer #${activeServers.length+1}`);
        }
        return;
      } else if (averagePlayers <= this.scaleDownThreshold && activeServers.length > 1) {
        const lastServerFullSelector = activeServers[activeServers.length - 1]!;
        fs.unlink(`./dynamic/server_active_${lastServerFullSelector}.txt`).catch((e) => { });
        this.sendPrivateMessage(`Usuwam plik dla serwera: ${lastServerFullSelector}`);
        MLog(`Usuwam plik dla serwera: ${lastServerFullSelector} (avg=${averagePlayers}, act=${activePlayerCount}, se=${activeServers.length}, thr=${this.scaleUpThreshold})`);
        this.lastScaleAction.set(selectorKey, now);
        this.sendGodCommandTimes(lastServerFullSelector, '!anno Serwer za parę chwil zostanie wyłączony, inne nadal pozostają aktywne!', 5);
        return;
      }
    }
  }

  sendGodCommandTimes(selector: string, line: string, times: number) {
    let count = 0;
    let interval = setInterval(() => {
      if (count >= times) {
        clearInterval(interval);
        return;
      }
      this.sendGodCommand(selector, line);
      count++;
    }, 1000);
  }

  sendGodCommand(selector: string, line: string) {
    line = line.trim();
    if (!line.length) return;
    const filename = `./dynamic/god_commander_${selector}.txt`;
    line = 'GOD,' + line;
    this.appendLineToFile(filename, line);
  }

  async appendLineToFile(filePath: string, line: string): Promise<void> {
    try {
      await fs.appendFile(filePath, line + '\n');
    } catch (error) {
      console.error(`Błąd podczas zapisywania do pliku ${filePath}:`, error);
    }
  }

  public startExpressServer() {
    const app = express();
    const port = 80;

    app.get('/ping/:selector/:currentPlayers', (req: any, res: any) => {
      const selector = req.params.selector;  // np. '1vs1_1', '3vs3_2'
      const currentPlayers = parseInt(req.params.currentPlayers, 10);
      if (this.pingLogs) MLog(`Got ping from ${selector} with ${currentPlayers}`);

      // Zaktualizuj status serwera w mapie
      this.serverStatus.set(selector, Date.now());

      // Jeśli nie ma danych o liczbie graczy, zainicjuj je
      if (!this.playerCounts.has(selector)) {
        this.playerCounts.set(selector, []);
      }

      // Dodaj liczbę graczy do historii
      const playerCount = this.playerCounts.get(selector) || [];
      playerCount.push(currentPlayers);
      this.playerCounts.set(selector, playerCount);

      // Zapisz dane do pliku CSV, jeśli liczba graczy się zmienia
      let lastPlayerCount = this.lastPlayerNum.get(selector);
      if (lastPlayerCount !== undefined && currentPlayers !== lastPlayerCount) {
        const filePath = `${this.csvDir}/current_players_number_${selector}.csv`;
        const timestamp = new Date().toISOString().replace('T', ',').split('.')[0];
        fs.appendFile(filePath, `${timestamp},${currentPlayers}\n`);
      }

      this.lastPlayerNum.set(selector, currentPlayers);
      res.send('');
    });

    app.get('/healthcheck/:selector', (req: any, res: any) => {
      const selector = req.params.selector;
      if (this.pingLogs) MLog(`Got chealtcheck from ${selector}`);
      const lastRequestTime = this.serverStatus.get(selector) || 0;
      const currentTime = Date.now();
      if (currentTime - lastRequestTime > 30000) {
        res.status(404).send(`Serwer ${selector} nie odpowiada`);
      } else {
        res.send(`Serwer ${selector} działa`);
      }
    });

    app.listen(port, () => {
      MLog(`Aplikacja nasłuchuje na porcie ${port}`);
    });
  }
}

function MLog(txt: string) {
  console.log(`#M# [${getTimestampHMS()}] ${txt}`);
}

const monitor = new ServerMonitor();
monitor.startExpressServer();
