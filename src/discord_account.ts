import { Colors } from "./colors";
import { DiscordUserEntry } from "./db/discord_users";
import { HaxballRoom } from "./hb_room";
import { hb_log } from "./log";
import { PlayerData } from "./structs";
import { normalizeNameString } from "./utils";

export class DiscordAccountManager {
  hbRoom: HaxballRoom;
  discordUsers: Map<number, DiscordUserEntry>;
  discordUserIdByAuthId: Map<string, number>;
  claimedNames: Set<string>;

  constructor(hbRoom: HaxballRoom) {
    this.hbRoom = hbRoom;
    this.discordUsers = new Map();
    this.discordUserIdByAuthId = new Map();
    this.claimedNames = new Set();
  }

  async init() {
    await this.updateDiscordLinks();
    await this.updateDiscordUsers();
  }

  handlePlayerJoin(player: PlayerData) {
    let discordUserId = this.discordUserIdByAuthId.get(player.auth_id);
    if (!discordUserId) return;
    player.discord_user = this.discordUsers.get(discordUserId) ?? null;
    if (player.discord_user && !player.discord_user.chat_color) player.discord_user.chat_color = 0xFFFFFF;
  }

  async oneTimePlayerNameSetup(player: PlayerData) {
    let dc = player.discord_user;
    if (!dc) return;
    if (!dc.state) return;
    if (dc.claimed) return;
    await this.hbRoom.game_state.setDiscordUserNickname(dc.discord_id, player.name);
  }

  checkAccountNameValidity(player: PlayerData) {
    if (this.claimedNames.has(player.name_normalized)) {
      let dc = player.discord_user;
      return dc && dc.state && normalizeNameString(dc.nickname) === player.name_normalized;
    }
    return true;
  }

  async linkRequestedBy(player: PlayerData) {
    if (!player.trust_level) return;
    await this.hbRoom.game_state.generateAndSendDiscordToken(player.auth_id).then((token) => {
      player.discord_token = token;
    }).catch((e) => e && hb_log(`!! generateAndSendDiscordToken error: ${e}`));
  }

  async updateForPlayer(player: PlayerData) {
    this.hbRoom.game_state.getDiscordAuthLink(player.auth_id).then((discordLink) => {
      if (discordLink) {
        this.discordUserIdByAuthId.set(discordLink.auth_id, discordLink.discord_id);
        this.hbRoom.game_state.getDiscordUser(discordLink.discord_id).then(async (discordUser) => {
          if (discordUser) {
            this.discordUsers.set(discordUser.discord_id, discordUser);
            player.discord_user = discordUser;
            if (discordUser.state) {
              if (!discordUser.claimed) {
                this.hbRoom.game_state.setDiscordUserNickname(discordUser.discord_id, player.name);
                discordUser.nickname = player.name;
                discordUser.claimed = true;
              }
              this.claimedNames.add(normalizeNameString(discordUser.nickname));
              this.hbRoom.sendMsgToPlayer(player, 'Połączono konto Discord!', Colors.BrightGreen, 'italic');
            }
          }
        }).catch((e) => e && DCLog(`!! getDiscordUser error: ${e}`));
      }
    }).catch((e) => e && DCLog(`!! getDiscordAuthLink error: ${e}`));
  }

  async updateDiscordUsers() {
    await this.hbRoom.game_state.getAllDiscordUsers().then((results) => {
      this.discordUsers.clear();
      this.claimedNames.clear();
      for (let result of results) {
        this.discordUsers.set(result.discord_id, result);
        if (result.claimed) this.claimedNames.add(normalizeNameString(result.nickname))
      }
      DCLog('updated users');
    }).catch((e) => e && DCLog(`!! getAllDiscordUsers error: ${e}`));
  }

  async updateDiscordLinks() {
    await this.hbRoom.game_state.getAllDiscordAuthLinks().then((results) => {
      this.discordUserIdByAuthId.clear();
      for (let result of results) {
        this.discordUserIdByAuthId.set(result.auth_id, result.discord_id);
      }
      DCLog('updated links');
    }).catch((e) => e && DCLog(`!! getAllDiscordAuthLinks error: ${e}`));
  }
}

function DCLog(txt: string) {
  hb_log(`#DC# ${txt}`)
}