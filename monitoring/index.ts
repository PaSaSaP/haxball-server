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
import { tokenDatabase, setupTokenDatabase } from '../src/db/token_database';
import * as secrets from "../src/secrets";
import { getTimestampHMS } from "../src/utils";
import { getIpInfo } from '../src/ip_info';

interface PlayersCount {
  all: number;
  afk: number;
}
class ServerMonitor {
  private client: typeof Client;
  private lastDiscordMsgSent: Map<string, number> = new Map();
  private serverStatus: Map<string, number> = new Map();
  private playerCounts: Map<string, PlayersCount[]> = new Map();
  private maxServers: Record<string, number> = { '4vs4': 1, '3vs3': 2, '1vs1': 1 };
  private userId = '1345319721863741515';
  private csvDir = './dynamic';
  private checkInterval = 5 * 1000;
  private lastPlayerNum: Map<string, PlayersCount>;
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
    this.lastPlayerNum = new Map();
    this.client.once('ready', () => {
      MLog(`Bot zalogowany jako ${this.client.user?.tag}`);
    });
    this.client.login(secrets.DiscordToken);
    setInterval(() => this.checkServerTimeouts(), this.checkInterval);
    setInterval(() => this.scaleServers(), this.checkInterval);
  }

  async setup() {
    await setupTokenDatabase();
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
    this.maxServers = this.config.maxServers ?? { '4vs4': 1, '3vs3': 2, '1vs1': 1 };
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
    tokenDatabase!.updateServerStatus(selector, false);
  }

  private updateServerStatusForScaledOut() {
    const now = Date.now();
    if (now - this.lastServerActiveStatusUpdate < 60_000) return;
    this.lastServerActiveStatusUpdate = now;
    tokenDatabase!.getActiveServers().then(async (servers) => {
      for (let server of servers) {
        if (server.active && !(await this.shouldBeServerEnabled(server.selector))) {
          MLog(`should not be active ${server.selector}, so disable it in token db`);
          tokenDatabase!.updateServerStatus(server.selector, false);
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
              this.updatePlayerCounts(fullSelector, -2, undefined);
            }
          }
        }
      }
    }
  }

  private async getActiveServers(selectorKey: string) {
    const maxServerCount = this.maxServers[selectorKey];
    let activeServers = await Promise.all(
      Array.from({ length: maxServerCount }, (_, i) => `${selectorKey}_${i + 1}`)
        .map(async (s) => {
          const isEnabled = await this.shouldBeServerEnabled(s);
          return isEnabled ? s : null;
        })
    );
    activeServers = activeServers.filter((server) => server !== null);
    return activeServers;
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

      let activeServers = await this.getActiveServers(selectorKey);
      // if monitoring just started then set cooldown just like it started some time ago
      activeServers.forEach(sselector => {
        if (sselector && !this.lastScaleAction.has(sselector)) this.lastScaleAction.set(sselector, now - (2 / 3) * this.cooldownTime);
      });

      let activePlayerCount = 0;
      for (let i = 1; i <= maxServerCount; i++) {
        const fullSelector = `${selectorKey}_${i}`;
        if (this.playerCounts.has(fullSelector)) {
          const playerCount = this.playerCounts.get(fullSelector) || [];
          const lastThreeMinutes = playerCount.slice(-Math.floor(this.scaleCheckDuration / this.checkInterval));
          const averagePlayers = lastThreeMinutes.reduce((a, b) => a + b.all - b.afk, 0) / lastThreeMinutes.length || 0;
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
          this.sendGodCommand(serverSelector, `!anno Wiele Was tutaj, za parę chwil pojawi się nowy serwer #${activeServers.length + 1}`);
        }
        this.updatePlayerCounts(newServerFullSelector, -3, -3);
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

  private async checkPlayerCounts() {
    for (const selectorKey of Object.keys(this.maxServers)) {
      let activeServers = await this.getActiveServers(selectorKey);
      if (activeServers.length < 2) continue;
      const s1 = `${selectorKey}_1`;
      const s2 = `${selectorKey}_2`;
      const s3 = `${selectorKey}_3`;
      let pc1 = this.playerCounts.get(s1);
      let pc2 = this.playerCounts.get(s2);
      let pc3 = this.playerCounts.get(s3);
      if (!pc1 || !pc2 || !pc1.length || !pc2.length) continue;
      let limit = selectorKey === '4vs4' ? 4 * 2 : 3 * 2;
      let c1 = pc1.at(-1)!;
      let c2 = pc2.at(-1)!;
      const check = (a: PlayersCount, b: PlayersCount, ssA: string, ssB: string) => {
        let act1 = a.all - a.afk;
        let act2 = b.all - b.afk;
        if (act1 < limit && act2 < limit && act2 > 0) {
          const afkMsg = a.afk > 0 ? ` ${a.afk} AFCZY,` : '';
          this.sendGodCommandTimes(`${selectorKey}_${ssB}`, `!anno Na ${selectorKey} #${ssA} gra obecnie ${act1} graczy,${afkMsg} Idźcie do nich!`, 5);
        }
      }
      if (activeServers.length === 2) {
        check(c1, c2, '1', '2');
        continue;
      }
      if (!pc3 || !pc3.length) continue;
      let c3 = pc3.at(-1)!;
      if (activeServers.length === 3) {
        check(c1, c3, '1', '3');
        check(c1, c2, '1', '2');
        continue;
      }
    }
  }

  private updatePlayerCounts(fullSelector: string, currentPlayers: number | undefined, afkPlayers: number | undefined) {
    // Jeśli nie ma danych o liczbie graczy, zainicjuj je
    if (!this.playerCounts.has(fullSelector)) {
      this.playerCounts.set(fullSelector, []);
    }
    const playerCount = this.playerCounts.get(fullSelector)!;
    const prevCurPlayers = playerCount.at(-1)?.all ?? -1;
    const prevAfkPlayers = playerCount.at(-1)?.afk ?? -1;
    if (currentPlayers === undefined) currentPlayers = prevCurPlayers;
    if (afkPlayers === undefined) afkPlayers = prevAfkPlayers;
    if (currentPlayers === prevCurPlayers && afkPlayers === prevAfkPlayers) {
      if (this.pingLogs) MLog(`Got c: ${currentPlayers} a: ${afkPlayers} so no update`);
      return;
    }
    // Dodaj liczbę graczy do historii
    playerCount.push({ all: currentPlayers, afk: afkPlayers });
    // Zapisz dane do pliku CSV, jeśli liczba graczy się zmienia
    let lastCounts = this.lastPlayerNum.get(fullSelector);
    if (lastCounts !== undefined && (currentPlayers !== lastCounts.all || afkPlayers !== lastCounts.afk)) {
      const filePath = `${this.csvDir}/current_players_number_${fullSelector}.csv`;
      const timestamp = new Date().toISOString().replace('T', ',').split('.')[0]; // TODO do not split here by T
      fs.appendFile(filePath, `${timestamp},${currentPlayers},${afkPlayers}\n`);
    }
    this.lastPlayerNum.set(fullSelector, { all: currentPlayers, afk: afkPlayers });
  }

  public startExpressServer() {
    const app = express();
    const port = 80;

    app.get('/ping/:selector/:currentPlayers/:afkPlayers', (req: any, res: any) => {
      const fullSelector = req.params.selector;  // np. '1vs1_1', '3vs3_2'
      const currentPlayers = parseInt(req.params.currentPlayers, 10);
      const afkPlayers = parseInt(req.params.afkPlayers, 10);
      if (this.pingLogs) MLog(`Got ping from ${fullSelector} with ${currentPlayers} players, ${afkPlayers} AFKs`);

      // Zaktualizuj status serwera w mapie
      this.serverStatus.set(fullSelector, Date.now());
      this.updatePlayerCounts(fullSelector, currentPlayers, afkPlayers);
      this.checkPlayerCounts();
      res.send('[]');
    });


    app.get('/healthcheck/:selector', (req: any, res: any) => {
      const fullSelector = req.params.selector;
      if (this.pingLogs) MLog(`Got chealtcheck from ${fullSelector}`);
      const lastRequestTime = this.serverStatus.get(fullSelector) || 0;
      const currentTime = Date.now();
      if (currentTime - lastRequestTime > 30000) {
        res.status(404).send(`Serwer ${fullSelector} nie odpowiada`);
        this.updatePlayerCounts(fullSelector, -2, undefined);
      } else {
        res.send(`Serwer ${fullSelector} działa`);
      }
    });

    app.get('/ip_info/:ip', async (req: any, res: any) => {
      const ip = req.params.ip;
      try {
        const ipInfo = await getIpInfo(ip);
        if (!ipInfo) {
          res.status(404).send("['', '', '', []]");
        } else {
          res.send(`["${ipInfo.country}", "${ipInfo.city}", "${ipInfo.isp}", ${JSON.stringify(ipInfo.hostname)}]`);
        }
      } catch (e) {
        res.status(404).send("['', '', '']");
        MLog(`ip_info error: ${e}`);
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
monitor.setup();
monitor.startExpressServer();
