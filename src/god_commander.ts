import { createReadStream, promises as fs } from "fs";
import { hb_log } from "./log";
import * as readline from "readline";

class GodCommander {
  private static VerifyString = "GOD,";
  god: PlayerObject;
  filePath: string;
  callback: (player: PlayerObject, command: string) => void;
  task: any;
  lastProcessedLineIndex: number = 0;
  lastFileSize: number = 0;

  constructor(god: PlayerObject, callback: (player: PlayerObject, command: string) => void, selector: string, subselector: string) {
    this.god = god;
    this.filePath = `./dynamic/god_commander_${selector}_${subselector}.txt`;
    this.callback = callback;
    fs.unlink(this.filePath).catch(() => { });
    this.task = setInterval(async () => {
      try {
        const line = await this.getNextLine();
        if (!line.length) return;
        hb_log(`#GOD# ${line}`);
        this.callback(this.god, line);
      } catch (e) { hb_log(`!! god commander error: ${e}`); }
    }, 1000);
  }

  private async getNextLine(): Promise<string> {
    try {
      const stats = await fs.stat(this.filePath).catch(() => null);
      if (!stats || stats.size === this.lastFileSize) return "";
      const data = await fs.readFile(this.filePath, "utf8");
      const stream = createReadStream(this.filePath, { encoding: "utf8" });
      const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

      let currentLineIndex = 0;
      let selectedLine = "";

      for await (const line of rl) {
        if (currentLineIndex === this.lastProcessedLineIndex) {
          selectedLine = line.trim();
          this.lastProcessedLineIndex++;
          break;
        }
        currentLineIndex++;
      }

      stream.close();
      this.lastFileSize = stats.size;
      if (!this.verify(selectedLine)) return "";
      return selectedLine.slice(GodCommander.VerifyString.length);
    } catch (e) {
      hb_log(`!! getFirstLineFromFile error: ${e}`);
      return "";
    }
  }

  private verify(line: string) {
    return line.length > 0 && line.startsWith(GodCommander.VerifyString);
  }
}

export default GodCommander;
