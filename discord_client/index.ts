import { Client, GatewayIntentBits, TextChannel } from "discord.js";
import * as fs from "fs";
import { UnpackrStream, decode, encode } from "msgpackr";

if (!process.env.HX_SELECTOR) throw new Error("HX_SELECTOR is not set");
const selector = process.env.HX_SELECTOR;

const token = "MTM0NTQzNzY3NDEzMDkwMzA3MA.Gzmsfo.oiOb2fYSXdtnbuVimL7-V6F_8CzFX9RIV_Jj0E";
let channelId = '';
let logFile = '';


console.log('HX_SELECTOR:', process.env.HX_SELECTOR);
if (selector == '1vs1') {
    channelId = '1345442311684751491';
    logFile = './logs/haxball_player_chat_1vs1.mpk';
} else if (selector == '3vs3') {
    channelId = '1345435928625156177';
    logFile = './logs/haxball_player_chat.mpk';
} else throw new Error(`Invalid HX_SELECTOR: ${selector}`);

// Inicjalizacja klienta Discord
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

async function monitorLogs(channel: TextChannel) {
  let fileSize = fs.statSync(logFile).size;

  let receivingStream = new UnpackrStream();
  receivingStream.on('data', (data) => {
    // console.log(`R SOME DATA: ${data}`)

    try {
      let logs = decode(data);
      const sendToChannel = (log: any) => {
        if (!log.for_discord) return;
        if (log.action == 'chat') channel.send(`**\`${log.user_name}\`** ${log.text}`);
        else if (log.action == 'server') channel.send(`*${log.text}*`);
      };
      if (Array.isArray(logs)) {
        // console.log(`Sending ${logs.length} msgs`);
        for (const log of logs) {
          if (log.for_discord) {
            sendToChannel(log);
          }
        }
      } else if (logs && logs.for_discord) {
        // console.log(`Sending 1 msg`);
        sendToChannel(logs);
      }
    } catch (error) {
      console.error("Błąd dekodowania logów:", error);
    }
  });

  fs.watchFile(logFile, { interval: 200 }, () => {
    const newFileSize = fs.statSync(logFile).size;

    if (newFileSize > fileSize) {
      setTimeout(async () => {
        try {
          let buffer = fs.readFileSync(logFile).slice(fileSize, newFileSize);
          receivingStream.write(buffer);
          fileSize = newFileSize;
        } catch (error) {
          console.error("Błąd dekodowania logów:", error);
        }
      }, 100);
    }
  });
}

client.once("ready", async () => {
  console.log(`Bot zalogowany jako ${client.user?.tag}`);

  // Pobieramy kanał, na który bot będzie wysyłał logi
  const channel = client.channels.cache.get(channelId) as TextChannel;
  if (!channel) {
    console.error("Nie znaleziono kanału Discord!");
    return;
  }

  // Rozpoczynamy monitorowanie logów
  await monitorLogs(channel);
});

client.login(token);
