import { normalizeNameString } from "./utils";

export class PlayerActivity {
  chat: number; // if is writing or is moving players from team to team
  game: number; // not real player action, can by triggered by others
  move: number; // if is moving while match or is moving players from team to team

  constructor() {
    const now = Date.now();
    this.chat = now; // chat or moved player as admin
    this.game = now;
    this.move = now;
  }

  updateChat() { this.chat = Date.now(); }
  updateGame() { this.game = Date.now(); }
  updateMove() { this.move = Date.now(); }
  last() { return this.chat > this.game ? this.chat : this.game; }
}

export class AdminStats {
  active: boolean;
  first_since: string;
  since: string;
  given_by: string | null;
  taken_by: string | null;
  kicked_users: Set<string>;
  banned_users: Set<string>;
  kick_timestamps: number[];
  action_start_stop: number;
  action_pause_unpause: number;
  action_admin: number;
  action_team: number;
  action_kick: number;
  action_other: number;

  constructor() {
    this.active = true;
    this.first_since = this.now_txt();
    this.since = this.first_since;
    this.given_by = null;
    this.taken_by = null;
    this.kicked_users = new Set();
    this.banned_users = new Set();
    this.kick_timestamps = [];
    this.action_start_stop = 0;
    this.action_pause_unpause = 0;
    this.action_admin = 0;
    this.action_team = 0;
    this.action_kick = 0;
    this.action_other = 0;
  }

  since_now() {
    this.since = this.now_txt();
    this.active = true;
  }

  now_txt() {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  }

  add_kick_timestamp() {
    this.kick_timestamps.push(Date.now());
    let s = this.kick_timestamps.length;
    if (s > 1 && this.kick_timestamps[s - 1] - this.kick_timestamps[s - 2] < 10) {
      return true;
    }
    return false;
  }
}

export class PlayerData {
  name: string;
  name_normalized: string;
  id: number;
  team: number;
  admin: boolean;
  admin_stats: AdminStats | null;
  position: { "x": number, "y": number };
  afk: boolean;
  afk_maybe: boolean;
  activity: PlayerActivity;
  auth_id: string;
  conn_id: string;
  connected: boolean;
  trust_level: number;
  admin_level: number;
  join_time: number;
  timer_give_back_admin: any;
  verify_link_requested: boolean;

  constructor(player: PlayerObject) {
    // this.player = player;
    this.name = player.name; /// @type string
    this.name_normalized = normalizeNameString(this.name);
    this.id = player.id; /// @type int
    this.team = player.team;
    this.admin = player.admin;
    this.admin_stats = null;
    this.position = player.position;
    this.afk = false;
    this.afk_maybe = false;
    this.activity = new PlayerActivity(); /// @type {PlayerActivity | null}
    this.auth_id = player.auth || ''; /// @type string
    this.conn_id = player.conn; /// @type string
    this.connected = true;
    this.trust_level = 0; // based on player auth from DB
    this.admin_level = 0; // based on player auth from DB
    this.join_time = Date.now();
    this.timer_give_back_admin = null;
    this.verify_link_requested = false;
  }

  update(player: PlayerObject) {
    this.team = player.team;
    this.admin = player.admin;
    this.position = player.position;
  }

  mark_disconnected() { this.connected = false; this.reset_timers(); }
  reset_timers() {
    if (this.timer_give_back_admin) {
      clearInterval(this.timer_give_back_admin);
      this.timer_give_back_admin = null;
    }
  }

  // admin stats related
  admin_stat_start_stop() { if (this.admin_stats) this.admin_stats.action_start_stop += 1; }
  admin_stat_pause_unpause() { if (this.admin_stats) this.admin_stats.action_pause_unpause += 1; }
  admin_stat_admin() { if (this.admin_stats) this.admin_stats.action_admin += 1; }
  admin_stat_team() { if (this.admin_stats) this.admin_stats.action_team += 1; }
  admin_stat_kick() { if (this.admin_stats) this.admin_stats.action_kick += 1; }
  admin_stat_other() { if (this.admin_stats) this.admin_stats.action_other += 1; }

}
