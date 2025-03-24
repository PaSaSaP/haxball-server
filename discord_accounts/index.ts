import sqlite3 from 'sqlite3';
import { Client, GatewayIntentBits, Message, Partials } from "discord.js";
import * as secrets from "../src/secrets";
import * as config from "../src/config";
import { DiscordAuthLinksDB } from '../src/db/discord_auth_links';
import { DiscordUsersDB } from '../src/db/discord_users';

const roomConfig = config.getRoomConfig('3vs3', '1');

let playersDb = new sqlite3.Database(roomConfig.playersDbFile, (err) => {
  if (err) console.error('Error opening database:', err.message);
});
let discordAuthLinks = new DiscordAuthLinksDB(playersDb);
let discordUsers = new DiscordUsersDB(playersDb);
discordAuthLinks.setupDatabase();
discordUsers.setupDatabase();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.DirectMessages, GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel]
});

const commands: Record<string, (msg: Message<boolean>, params: string[]) => void> = {
  help: (msg: Message) => {
    msg.reply("Dostępne komendy: `!link <token>`, `!kolor <kolor w formacie 0xFFFFFF>`");
    msg.reply("Komendy dostępne na serwerze po połączeniu konta: !link - sprawdzenie statusu, !link_nick - zmiana chronionego nicku na obecny, !kolor - zmiana koloru na czacie");
  },
  link: async (msg: Message, params: string[]) => {
    try {
      const userDiscordId: number = parseInt(msg.author.id);
      const token = params[0];
      console.log(`${userDiscordId} requested to link account by token ${token}`)
      await discordAuthLinks.associateDiscordWithToken(userDiscordId, params[0]);
      console.log(`${userDiscordId} link accepted, now create/updated user account`)
      // associated, so now we can create/update user
      await discordUsers.addDiscordUser(userDiscordId);
      msg.reply("Połączono konto! Wpisz na serwerze `!link_update` bądź przeloguj się by przypisać i zablokować nick. Ustaw sobie kolor z komendą !kolor");
      console.log(`${userDiscordId} create/updated user account`)
    } catch (e) {
      msg.reply("Coś poszło nie tak");
      console.error(`${msg.author.id} link cmd error: ${e}`)
    }
  },
  kolor: async (msg: Message, params: string[]) => {
    msg.reply("By ustawić kolor, na serwerze wpisz komendę !kolor 0xDDEEFF, nie wszystkie kolory są dostępne, kazda ze składowych musi być w zakresie <200, 255>");
    msg.reply("Sprawdź tutaj: https://rgbcolorcode.com/");
  }
};
commands["pomoc"] = commands["help"];
commands["h"] = commands["help"];
commands["color"] = commands["kolor"];

const userCooldowns: Record<string, number> = {}; // Obiekt przechowujący czas ostatniej komendy użytkownika
const COOLDOWN_TIME = 10000; // Czas w milisekundach (np. 10 sekund)

client.on("messageCreate", (msg: Message) => {
  if (msg.author.bot) return;
  const userId = msg.author.id;
  const currentTime = Date.now();
  // Sprawdzenie, czy użytkownik jest w cooldownie
  if (userCooldowns[userId] && currentTime - userCooldowns[userId] < COOLDOWN_TIME) {
    msg.reply("Proszę poczekać chwilę przed wysłaniem kolejnej komendy.");
    return;
  }
  if (!msg.guild && msg.content.startsWith('!')) {
    const [command, ...params] = msg.content.slice(1).split(" ");

    if (commands[command]) {
      commands[command](msg, params);
      userCooldowns[userId] = currentTime; // Zapisujemy czas ostatniej komendy użytkownika
    } else {
      msg.reply("Nieznana komenda! Spróbuj `!help`.");
    }
  }
});

client.once("ready", async () => {
  console.log(`Bot zalogowany jako ${client.user?.tag}`);
});

client.login(secrets.DiscordToken);
