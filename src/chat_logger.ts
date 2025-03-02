import { Mutex } from 'async-mutex';
import * as fs from "fs";
import * as path from "path";
import { PackrStream, encode } from "msgpackr";

class ChatLogger {
  private mutex = new Mutex();
  private logFile: string;
  private sendingStream: PackrStream;
  private fileStream: fs.WriteStream;

  constructor(logFileName: string, logDir = './logs') {
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    this.logFile = path.join(logDir, logFileName);

    // Tworzymy strumień Packr w konstruktorze
    this.sendingStream = new PackrStream();
    this.fileStream = fs.createWriteStream(this.logFile, { flags: 'a' });

    // Łączymy strumień Packr z plikiem
    this.sendingStream.pipe(this.fileStream);
  }

  async logMessage(user_name: string, action: string, text: string, for_discord: boolean) {
    const release = await this.mutex.acquire();
    try {
      const timestamp = new Date().toISOString();
      const logEntry = { timestamp, user_name, action, text, for_discord };
      const buffer = encode(logEntry);

      // Serializujemy logEntry do strumienia
      this.sendingStream.write(buffer);
    } catch (err) {
      console.error("Błąd podczas logowania:", err);
    } finally {
      release();  // Zwolnienie mutexa po zakończeniu operacji
    }
  }

  async logMessageV2(user_name: string, action: string, text: string, for_discord: boolean) {
    const release = await this.mutex.acquire();

    (async () => {
      try {
        const timestamp = new Date().toISOString();
        const logEntry = { timestamp, user_name, action, text, for_discord };
        const buffer = encode(logEntry);

        // Dopisujemy binarne logi na koniec pliku
        fs.appendFile(this.logFile, buffer, (err) => {
          if (err) {
            console.error("Błąd zapisu logu:", err);
          }
        });
      } catch (err) {
        console.error("Błąd podczas logowania:", err);
      } finally {
        release();  // Zwolnienie mutexa po zakończeniu operacji
      }
    })();
  }

  logMessageV1(user_name: string, action: string, text: string, for_discord: boolean) {
    const timestamp = new Date().toISOString();
    const logEntry = { timestamp, user_name, action, text, for_discord };

    const buffer = encode(logEntry);

    // Dopisujemy binarne logi na koniec pliku
    fs.appendFile(this.logFile, buffer, (err) => {
      if (err) console.error("Błąd zapisu logu:", err);
    });
  }
}

export default ChatLogger;
