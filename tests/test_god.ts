import { createReadStream, promises as fs } from "fs";
import * as readline from "readline";

class GodCommander {
  private static VerifyString = "GOD,";
  filePath: string;
  callback: (command: string) => void;
  task: any;
  lastProcessedLineIndex: number = 0;
  lastFileSize: number = 0;

  constructor(callback: (command: string) => void, selector: string, subselector: string) {
    this.filePath = `./dynamic/god_commander_${selector}_${subselector}.txt`;
    this.callback = callback;
    fs.unlink(this.filePath).catch(() => { });
    this.task = setInterval(async () => {
      try {
        const line = await this.getNextLine();
        if (!line.length) return;
        console.log(`#GOD# ${line}`);
        this.callback(line);
      } catch (e) { console.log(`!! god commander error: ${e}`); }
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
      console.log(`!! getFirstLineFromFile error: ${e}`);
      return "";
    }
  }

  private verify(line: string) {
    return line.length > 0 && line.startsWith(GodCommander.VerifyString);
  }
}

let god = new GodCommander((command: string) => {
  console.log(`Wołam: ${command}`);
}, '3vs3', '1');

let i = 0;
setInterval(() => {
  console.log(`i=${i}`);
  i++;
}, 10000);



