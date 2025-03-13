import fetch from 'node-fetch';
import { HttpProxyAgent } from 'http-proxy-agent';

class Pinger {
  private selector: string;
  private proxy: string;
  private lastPingTime: number = 0;
  private intervalId: NodeJS.Timeout | null = null;

  constructor(selector: string) {
    this.selector = selector;
    this.proxy = process.env.GLOBAL_AGENT_HTTPS_PROXY as string;
  }

  private async sendRequest() {
    const url = `http://monitoring/ping/${this.selector}`;
    const agent = new HttpProxyAgent(this.proxy);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        agent,
      });

      this.lastPingTime = Date.now();
      // console.log(`Zapytanie wysłane do ${this.selector}: Status - ${response.status}`);
    } catch (error) {
      console.error(`Błąd połączenia z serwerem ${this.selector}:`, error);
    }
  }

  public sendKeepAlive() {
    const now = Date.now();
    if (now - this.lastPingTime >= 5000) {
      this.lastPingTime = now;
      this.sendRequest();
    }
  }

  public start() {
    if (this.intervalId === null) {
      this.intervalId = setInterval(() => {
        this.sendRequest();
      }, 5000);
      // console.log(`Monitorowanie serwera ${this.selector} rozpoczęte.`);
    }
  }

  public stop() {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      // console.log(`Monitorowanie serwera ${this.selector} zatrzymane.`);
    }
  }
}

export default Pinger;
