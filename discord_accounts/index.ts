import sqlite3 from 'sqlite3';
import Joi from 'joi';
import { Client, GatewayIntentBits, Message, Partials } from "discord.js";
import * as secrets from "../src/secrets";
import * as config from "../src/config";
import { DiscordAuthLinksDB } from '../src/db/discord_auth_links';
import { DiscordUsersDB } from '../src/db/discord_users';
import { PlayersDB } from '../src/db/players';

const DiscordServerId = '1345320397121257494';
const VerifiedRoleId = '1353719038479433859';
const roomConfig = config.getRoomConfig('3vs3', '1');

let playersDb = new sqlite3.Database(roomConfig.playersDbFile, (err) => {
  if (err) console.error('Error opening database:', err.message);
});
let discordAuthLinks = new DiscordAuthLinksDB(playersDb);
let discordUsers = new DiscordUsersDB(playersDb);
let players = new PlayersDB(playersDb);
discordAuthLinks.setupDatabase();
discordUsers.setupDatabase();
players.setupDatabase();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages, GatewayIntentBits.DirectMessages, GatewayIntentBits.MessageContent
  ],
  partials: [Partials.GuildMember, Partials.Channel]
});

const commands: Record<string, (msg: Message<boolean>, params: string[]) => void> = {
  help: (msg: Message) => {
    msg.reply("\
Komendy Dostępne tutaj: \n\
`!link <token>` - po uzyskaniu tokenu z serwera gry korzystasz z tej komendy by połączyć konto\n\
`!auth <auth>` - podłączenie nowego auth dla zweryfikowanego konta (oba pozostają aktywne, statystyki nie są łączone)\n\
`!kolor` - info o zmianie koloru pisania\n\
`!ranga` - dodanie rangi Verified na Discordzie\n\
\n\
Komendy dostępne na serwerze po połączeniu konta: \n\
`!link` - sprawdzenie statusu (za pierwszym razem generuje token)\n\
`!link_nick` - zmiana chronionego nicku na obecny\n\
`!kolor` - zmiana koloru na czacie\n\
");
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
      await addRangeToMsgAuthor(msg);
      msg.reply("Dostałeś rangę Verified!");
      console.log(`${userDiscordId} create/updated user account`);
    } catch (e) {
      msg.reply("Coś poszło nie tak");
      console.error(`${msg.author.id} link cmd error: ${e}`)
    }
  },
  auth: async (msg: Message, params: string[]) => {
    try {
      const userDiscordId: number = parseInt(msg.author.id);
      const authId = params[0];
      const schema = Joi.object({
        authId: Joi.string().pattern(/^[A-Za-z0-9._-]+$/).length(43).required()
      });
      const { error } = schema.validate({ authId });
      if (error) {
        msg.reply(`Nieprawidłowy auth: ${authId}`);
        return;
      }
      let discordUser = await discordUsers.getDiscordUser(userDiscordId);
      if (!discordUser || !discordUser.state) {
        msg.reply(`Konto niezweryfikowane...`);
        return;
      }
      discordAuthLinks.insertNextDiscordAccount(userDiscordId, authId).then(() => {
        msg.reply(`Nowe połączone konto: ${authId}`);
        players.setTrustLevelByDiscordBot(authId, 1).catch((e) => {
          if (e) {
            msg.reply("Wystąpił problem z ustawieniem zaufania dla nowego konta");
            console.error(`${msg.author.id} setTrustLevelByDiscordBot error: ${e}`);
          }
        });
      }).catch((e) => {
        msg.reply(`Nie udało się połączyć konta: ${authId}, osiągnięto limit 5 połączeń bądź wystąpił inny problem...`);
        console.error(`${msg.author.id} insertNextDiscordAccount error: ${e}`);
      });
    } catch (e) {
      msg.reply("Coś poszło nie tak");
      console.error(`${msg.author.id} auth cmd error: ${e}`);
    }
  },
  ranga: async (msg: Message, params: string[]) => {
    const userDiscordId: number = parseInt(msg.author.id);
    let discordUser = await discordUsers.getDiscordUser(userDiscordId);
    if (!discordUser || !discordUser.state) {
      msg.reply(`Konto niezweryfikowane...`);
      return;
    }
    try {
      await addRangeToMsgAuthor(msg);
      msg.reply("Dostałeś rangę Verified!");
    } catch (e) {
      console.log(`assigning role for ${userDiscordId} error: ${e}`);
    }
  },
  kolor: async (msg: Message, params: string[]) => {
    msg.reply("\
By ustawić kolor, na serwerze wpisz komendę !kolor 0xDDEEFF, nie wszystkie kolory są dostępne, suma składowych R+G+B musi być większa bądź równa 500\n\
Paletę kolorów mozesz sprawdzić tutaj: https://rgbcolorcode.com/");
  }
};
commands["pomoc"] = commands["help"];
commands["h"] = commands["help"];
commands["color"] = commands["kolor"];
commands["authId"] = commands["auth"];
commands["auth_id"] = commands["auth"];

async function addRangeToMsgAuthor(msg: Message) {
  const guild = client.guilds.cache.get(DiscordServerId);
  if (!guild) {
    console.log("Nie mogę znaleźć serwera.");
    return;
  }
  const role = await guild.roles.fetch(VerifiedRoleId);
  if (!role) {
    console.log("Rola nie została znaleziona.");
    return;
  }
  const member = await guild.members.fetch(msg.author.id);
  if (!member) {
    console.log("Nie udało się znaleźć użytkownika na serwerze.");
    return;
  }
  try {
    await member.roles.add(role);
  } catch (err) {
    console.log("Błąd podczas dodawania roli:", err);
  }
}

const userCooldowns: Record<string, number> = {};
const COOLDOWN_TIME = 15 * 1000; // [ms]

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

client.once("ready", () => {
  console.log(`Bot zalogowany jako ${client.user?.tag}`);
});

client.login(secrets.DiscordToken);
