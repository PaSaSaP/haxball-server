import { hb_log } from "./log";

type ParamGetterType = () => [number, number];
class Pinger {
  private selector: string;
  private lastPingTime: number = 0;
  private intervalId: NodeJS.Timeout | null = null;
  private playerParamGetter: ParamGetterType;

  constructor(selector: string, playerNumGetter: ParamGetterType) {
    this.selector = selector;
    this.playerParamGetter = playerNumGetter;
  }

  private async sendRequest() {
    const [playerNum, afkPlayersNum] = this.playerParamGetter();
    const url = `http://monitoring/ping/${this.selector}/${playerNum}/${afkPlayersNum}`;
  
    try {
      const response = await fetch(url);
      // Sprawdzanie statusu odpowiedzi
      if (response.ok) {
        this.lastPingTime = Date.now();
      } else {
        hb_log(`Błąd odpowiedzi z serwera ${this.selector}: Status - ${response.status}`);
      }
    } catch (e) {
      hb_log(`Błąd połączenia z serwerem ${url} dla ${this.selector}`);
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
    }
  }

  public stop() {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}

export default Pinger;
