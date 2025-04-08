import { Client, GatewayIntentBits, TextChannel } from "discord.js";
import * as fs from "fs";
import { UnpackrStream, decode, encode } from "msgpackr";
import * as secrets from "../src/secrets";
import * as config from "../src/config";

if (!process.env.HX_SELECTOR) throw new Error("HX_SELECTOR is not set");

console.log('HX_SELECTOR:', process.env.HX_SELECTOR);
console.log('HX_SUBSELECTOR:', process.env.HX_SUBSELECTOR);

const selector = process.env.HX_SELECTOR as config.RoomConfigSelectorType;
const subselector = process.env.HX_SUBSELECTOR;
const roomConfig = config.getRoomConfig(selector, subselector);
let channelId = '';
const roomLinksChannelId = '1345415730337939456';
if (selector == 'freestyle') {
  if (subselector === '1') {
    channelId = '1345442311684751491';
  } else throw new Error(`Invalid HX_SUBSELECTOR: ${subselector}`);
} else if (selector == 'volleyball') {
  if (subselector === '1') {
    channelId = '1356948942583107694';
  } else throw new Error(`Invalid HX_SUBSELECTOR: ${subselector}`);
} else if (selector == '3vs3') {
  if (subselector === '1') {
    channelId = '1345435928625156177';
  } else throw new Error(`Invalid HX_SUBSELECTOR: ${subselector}`);
} else if (selector == '1vs1' || selector == 'tennis') {
  if (subselector === '1') {
    channelId = '1358397917853126817';
  } else throw new Error(`Invalid HX_SUBSELECTOR: ${subselector}`);
} else throw new Error(`Invalid HX_SELECTOR: ${selector}`);
let logFile = `./logs/${roomConfig.chatLogDbFile}`;

// Inicjalizacja klienta Discord
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

async function monitorLogs(channel: TextChannel, roomLinksChannel: TextChannel) {
  const sendToChannel = (log: any) => {
    if (!log.for_discord) return;
    log.text = log.text.replace(/[@#]/g, '');
    const clearLinks = () => {
      log.text = log.text
        .replace(/\b(?:https?|ftp|htp):\/\//gi, '')
        .replace(/\bwww\./gi, '');
    };
    try {
      if (log.action === 'chat') {
        clearLinks();
        channel.send(`**\`${log.user_name}\`** ${log.text}`);
      } else if (log.action === 'server') {
        channel.send(`*${log.text}*`);
      }  else if (log.action === 'players') {
        let data = JSON.parse(log.text);
        let selector = data.selector;
        let description = data.description;
        let link = data.link;
        // format of players: { name: string, trust_level: number, team: 0|1|2, afk: boolean }
        let players = data.players;
        // find previous (if any) message with selector
        let selectorText = `Serwer: ${selector}`;
        // should contain formatted data so if team == 1 then name red, if team == 2 then name blue, if team == 0 then name white
        // if afk then nick yellow, next to nick should be trust level info in format T:{trust_level}
        let redTeam = players.filter((p: any) => p.team === 1).map((p: any) => ` - **${p.name}** (T:${p.trust_level})`);
        let blueTeam = players.filter((p: any) => p.team === 2).map((p: any) => ` - **${p.name}** (T:${p.trust_level})`);
        let whiteTeam = players.filter((p: any) => p.team === 0).map((p: any) => ` - **${p.name}** (${p.afk? 'AFK, ':''}T:${p.trust_level})`);
        let redTeamText = redTeam.length > 0 ? `🔴 **Red Team**:\n${redTeam.join('\n')}\n` : '';
        let blueTeamText = blueTeam.length > 0 ? `🔵 **Blue Team**:\n${blueTeam.join('\n')}\n` : '';
        let whiteTeamText = whiteTeam.length > 0 ? `⚪ **Spectators**:\n${whiteTeam.join('\n')}\n` : '';
        const newContent = `${selectorText}\n${description}\n${link}\n\n${redTeamText}\n${blueTeamText}\n${whiteTeamText}`;
        let previousMessage = roomLinksChannel.messages.cache.find(msg => msg.content.startsWith(selectorText));
        if (previousMessage) {
          // update existing message
          previousMessage.edit(newContent);
        }
        else {
          // send new message
          roomLinksChannel.send(newContent);
        }
      }
    } catch (error) {
      console.error("Błąd wysyłania wiadomości:", error);
    }
  };
  let fileSize = fs.statSync(logFile).size;

  let receivingStream = new UnpackrStream();
  receivingStream.on('data', (data) => {
    // console.log(`R SOME DATA: ${data}`)
    try {
      let logs = decode(data);
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

  // watch seems to not get changes when file is updated
  // fs.watch(logFile, (eventType) => {
  //   if (eventType === 'change') {
  //     let newFileSize = fs.statSync(logFile).size;
  //     if (newFileSize > fileSize) {
  //       let stream = fs.createReadStream(logFile, { start: fileSize, end: newFileSize - 1 });
  //       stream.pipe(receivingStream);
  //       fileSize = newFileSize;
  //     }
  //   }
  // });

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
  const roomLinksChannel = client.channels.cache.get(roomLinksChannelId) as TextChannel;
  if (!channel || !roomLinksChannel) {
    console.error("Nie znaleziono kanału Discord!");
    return;
  }

  // Rozpoczynamy monitorowanie logów
  await monitorLogs(channel, roomLinksChannel);
});

client.login(secrets.DiscordToken);
