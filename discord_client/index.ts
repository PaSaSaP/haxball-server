import { Client, GatewayIntentBits, TextChannel } from "discord.js";
import * as fs from "fs";
import { UnpackrStream, decode, encode } from "msgpackr";
import * as secrets from "../src/secrets";
import * as config from "../src/config";

if (!process.env.HX_SELECTOR) throw new Error("HX_SELECTOR is not set");

console.log('HX_SELECTOR:', process.env.HX_SELECTOR);
console.log('HX_SUBSELECTOR:', process.env.HX_SUBSELECTOR);

const selector = process.env.HX_SELECTOR;
const subselector = process.env.HX_SUBSELECTOR;
const roomConfig = config.getRoomConfig(selector, subselector);
let channelId = '';
if (selector == '1vs1') {
  if (subselector === '1') {
    channelId = '1345442311684751491';
  } else throw new Error(`Invalid HX_SUBSELECTOR: ${subselector}`);
} else if (selector == '3vs3') {
  if (subselector === '1') {
    channelId = '1345435928625156177';
  } else throw new Error(`Invalid HX_SUBSELECTOR: ${subselector}`);
} else throw new Error(`Invalid HX_SELECTOR: ${selector}`);
let logFile = `./logs/${roomConfig.chatLogDbFile}`;

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

client.login(secrets.DiscordToken);
