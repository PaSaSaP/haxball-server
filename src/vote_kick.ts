import { Colors } from "./colors";
import { AutoBot } from "./auto_mode";
import { PlayerData, PlayerLeavedDueTo } from "./structs";
import { getTimestampHMS } from "./utils";
import { HaxballRoom } from "./hb_room";

export interface AutoVoter {
  active(): boolean;
  handle(votedPlayer: PlayerData | null, byPlayer: PlayerData): void;
  handleYes(byPlayer: PlayerData): void;
  handleNo(byPlayer: PlayerData): void;
  handleChangeAssignment(player: PlayerData): void;
  handleGameStop(): void;
  reset(): void;
}

export class TeamVoter implements AutoVoter {
  RequiredVotes = 3;
  name: string;
  textName: string;
  callback: (voted: PlayerData) => void;
  shouldBeVoted: (voted: PlayerData, votedBy: PlayerData) => boolean;
  hb_room: HaxballRoom;
  team: 0 | 1 | 2;
  voted: PlayerData|null;
  agreedBy: Set<string>;
  disagreedBy: Set<string>;
  at: number;

  constructor(hb_room: HaxballRoom, name: string, textName: string, callback: (voted: PlayerData) => void) {
    this.hb_room = hb_room;
    this.name = name;
    this.textName = textName;
    this.callback = callback;
    this.shouldBeVoted = (voted: PlayerData, votedBy: PlayerData) => true;
    this.team = 0;
    this.voted = null;
    this.agreedBy = new Set();
    this.disagreedBy = new Set();
    this.at = 0;
  }

  expired() {
    return Date.now() - this.at > 60_000;
  }

  active(): boolean {
    return this.team !== 0 && this.voted !== null && !this.expired();
  }

  handle(votedPlayer: PlayerData|null, byPlayer: PlayerData) {
    const limit = this.hb_room.auto_bot.getCurrentLimit();
    if (limit > 1 && this.hb_room.auto_bot.isLobbyTime() || !this.hb_room.auto_bot.isRanked()) return;
    if (this.team === 0) {
      if (!votedPlayer || !votedPlayer.team) return;
      if (limit === 1 || (byPlayer.team && votedPlayer.team === byPlayer.team)) {
        if (!this.shouldBeVoted(votedPlayer, byPlayer)) return;
        this.at = Date.now();
        this.team = byPlayer.team as 0|1|2;
        this.voted = votedPlayer;
        this.agreedBy.add(byPlayer.auth_id);
        this.hb_room.sendMsgToAll(`(!${this.name}) Rozpoczęto ${this.textName} gracza ${votedPlayer.name} (!tak !yes !nie !no)`,
          Colors.BrightBlue, 'italic');
        AMLog(`${this.name} ${votedPlayer.name} by ${byPlayer.name}`);
      }
      return; // added new votekick so no more here
    }
    this.handleYes(byPlayer);
  }

  handleYes(byPlayer: PlayerData) {
    if (this.hb_room.auto_bot.isLobbyTime() || !this.hb_room.auto_bot.isRanked()) return;
    if (!this.voted || this.voted.id === byPlayer.id) return;
    this.agreedBy.add(byPlayer.auth_id);
    this.check();
    AMLog(`${this.name} BY: ${byPlayer.name} YES`);
  }

  handleNo(byPlayer: PlayerData) {
    if (this.hb_room.auto_bot.isLobbyTime() || !this.hb_room.auto_bot.isRanked()) return;
    if (!this.voted || this.voted.id === byPlayer.id) return;
    this.disagreedBy.add(byPlayer.auth_id);
    this.check();
    AMLog(`${this.name} BY: ${byPlayer.name} NO`);
  }

  handleChangeAssignment(player: PlayerData) {
    if (this.team !== 0 && this.voted && player.id === this.voted.id && !player.team) this.reset();
  }

  handleGameStop(): void {
    if (this.active()) this.reset();
  }

  private check() {
    if (!this.team || !this.voted) return;
    if (Date.now() - this.at > 60_000) {
      this.hb_room.sendMsgToAll(`(!${this.name}) Upłynął limit czasu na ${this.textName} gracza ${this.voted.name}`, Colors.BrightBlue, 'italic');
      this.reset();
      return;
    }
    const y = this.agreedBy.size;
    const n = this.disagreedBy.size;
    if (n >= y + this.RequiredVotes) {
      this.hb_room.sendMsgToAll(`(!${this.name}) Wniosek o ${this.textName} gracza ${this.voted.name} odrzucony (${y}/${n})`, Colors.BrightBlue, 'italic');
      this.reset();
      return;
    }
    if (y >= n + this.RequiredVotes) {
      this.hb_room.sendMsgToAll(`(!${this.name}) Wniosek o ${this.textName} gracza ${this.voted.name} przyjęty (${y}/${n})`, Colors.BrightBlue, 'italic');
      this.callback(this.voted);
      this.reset();
      return;
    }
  }

  reset() {
    this.team = 0;
    this.voted = null;
    this.agreedBy.clear();
    this.disagreedBy.clear();
  }
}

export class VoteByAllPlayers implements AutoVoter {
  RequiredVotes = 3;
  name: string;
  textName: string;
  callback: (voted: PlayerData) => void;
  shouldBeVoted: (voted: PlayerData, votedBy: PlayerData) => boolean;
  hb_room: HaxballRoom;
  voted: PlayerData|null;
  agreedBy: Set<string>;
  disagreedBy: Set<string>;
  at: number;


  constructor(hb_room: HaxballRoom, name: string, textName: string, callback: (voted: PlayerData) => void) {
    this.hb_room = hb_room;
    this.name = name;
    this.textName = textName;
    this.callback = callback;
    this.shouldBeVoted = (voted: PlayerData, votedBy: PlayerData) => true;
    this.voted = null;
    this.agreedBy = new Set();
    this.disagreedBy = new Set();
    this.at = 0;
  }

  expired() {
    return Date.now() - this.at > 60_000;
  }

  active(): boolean {
    return this.voted !== null && !this.expired();
  }

  handle(votedPlayer: PlayerData|null, byPlayer: PlayerData) {
    if (votedPlayer !== null && !this.active()) {
      if (votedPlayer.id === byPlayer.id) return;
      if (!this.shouldBeVoted(votedPlayer, byPlayer)) return;
      this.at = Date.now();
      this.voted = votedPlayer;
      this.agreedBy.add(byPlayer.auth_id);
      this.hb_room.sendMsgToAll(`(!${this.name}) Rozpoczęto ${this.textName} gracza ${votedPlayer.name} (!${this.name} !tak !yes !nie !no)`, Colors.BrightBlue, 'italic');
      AMLog(`${this.name} ${votedPlayer.name} by ${byPlayer.name}`);
      return; // added new votekick so no more here
    }
    if (votedPlayer === null && this.active()) this.handleYes(byPlayer);
  }

  handleYes(byPlayer: PlayerData) {
    if (!this.voted || this.voted.id === byPlayer.id) return;
    this.agreedBy.add(byPlayer.auth_id);
    this.check();
    AMLog(`${this.name} BY: ${byPlayer.name} YES`);
  }

  handleNo(byPlayer: PlayerData) {
    if (!this.voted || this.voted.id === byPlayer.id) return;
    this.disagreedBy.add(byPlayer.auth_id);
    this.check();
    AMLog(`${this.name} BY: ${byPlayer.name} NO`);
  }

  handleChangeAssignment(player: PlayerData) {
  }

  handleGameStop(): void {
  }

  private check() {
    if (!this.voted) return;
    if (this.expired()) {
      this.hb_room.sendMsgToAll(`(!${this.name}) Upłynął limit czasu na ${this.textName} gracza ${this.voted.name}`, Colors.BrightBlue, 'italic');
      this.reset();
      return;
    }
    const y = this.agreedBy.size;
    const n = this.disagreedBy.size;
    if (n >= y + this.RequiredVotes) {
      this.hb_room.sendMsgToAll(`(!${this.name}) Wniosek o ${this.textName} gracza ${this.voted.name} odrzucony (${y}/${n})`, Colors.BrightBlue, 'italic');
      this.reset();
      return;
    }
    if (y >= n + this.RequiredVotes) {
      this.hb_room.sendMsgToAll(`(!${this.name}) Wniosek o ${this.textName} gracza ${this.voted.name} przyjęty (${y}/${n})`, Colors.BrightBlue, 'italic');
      this.callback(this.voted);
      this.reset();
      return;
    }
  }

  reset() {
    this.voted = null;
    this.agreedBy.clear();
    this.disagreedBy.clear();
  }
}

export class VoteKicker extends TeamVoter {
  constructor(auto_bot: AutoBot) {
    let callback = (voted: PlayerData) => {
      auto_bot.setPlayerLeftStatusTo(voted, PlayerLeavedDueTo.voteKicked);
      auto_bot.room.kickPlayer(voted.id, "VoteKicked!", false);
    };
    super(auto_bot.hb_room, "votekick", "szkalowanie", callback);
  }
}

export class VoteMuter extends VoteByAllPlayers {
  constructor(hb_room: HaxballRoom) {
    let callback = (voted: PlayerData) => {
      this.hb_room.players_game_state_manager.setPlayerTimeMuted(voted, this.hb_room.God(), 60 * 60);
    };
    super(hb_room, "votemute", "wyciszenie", callback);
    this.shouldBeVoted = (voted: PlayerData, byPlayer: PlayerData) => {
      return !this.hb_room.temporarily_trusted.has(byPlayer.id) && voted.trust_level <= byPlayer.trust_level;
    }
  }
}

export class VoteBotKicker extends VoteByAllPlayers {
  constructor(hb_room: HaxballRoom) {
    let callback = (voted: PlayerData) => {
      this.hb_room.players_game_state_manager.setNetworkTimeKicked(voted, this.hb_room.God(), 24 * 60 * 60, true);
    };
    super(hb_room, "votebot", "rozBOTowanie", callback);
    this.shouldBeVoted = (voted: PlayerData, byPlayer: PlayerData) => {
      return voted.trust_level === 0;
    }
  }
}

export class VoteV4 implements AutoVoter {
  RequiredVotes = 3;
  hbRoom: HaxballRoom;
  agreedBy: Set<string>;
  disagreedBy: Set<string>;
  at: number;

  constructor(hbRoom: HaxballRoom) {
    this.hbRoom = hbRoom;
    this.agreedBy = new Set();
    this.disagreedBy = new Set();
    this.at = 0;
  }

  expired() {
    return Date.now() - this.at > 60_000;
  }

  active(): boolean {
    return !this.expired();
  }

  handle(votedPlayer: PlayerData|null, byPlayer: PlayerData) {
    let autoBot = this.hbRoom.auto_bot;
    if (!this.active() && autoBot.getCurrentLimit() === 3 && !autoBot.isLobbyTime() && autoBot.getNonAfkAllCount() >= 8) {
      this.at = Date.now();
      this.agreedBy.add(byPlayer.auth_id);
      this.hbRoom.sendMsgToAll(`(!4) Rozpoczęto głosowanie za przełączeniem na rozgrywkę 4vs4 (!tak !yes !nie !no)`, Colors.BrightBlue, 'italic');
      AMLog(`!4 by ${byPlayer.name}`);
      return;
    }
    if (this.active()) this.handleYes(byPlayer);
  }

  handleYes(byPlayer: PlayerData) {
    if (!this.active()) return;
    this.agreedBy.add(byPlayer.auth_id);
    this.check();
    AMLog(`!4 BY: ${byPlayer.name} YES`);
  }

  handleNo(byPlayer: PlayerData) {
    if (!this.active()) return;
    this.disagreedBy.add(byPlayer.auth_id);
    this.check();
    AMLog(`!4 BY: ${byPlayer.name} NO`);
  }

  handleChangeAssignment(player: PlayerData) {
  }

  handleGameStop(): void {
    if (this.active()) this.reset();
  }

  private check() {
    if (this.expired()) {
      this.hbRoom.sendMsgToAll(`(!4) Upłynął limit czasu na głosowanie...`, Colors.BrightBlue, 'italic');
      this.reset();
      return;
    }
    const y = this.agreedBy.size;
    const n = this.disagreedBy.size;
    if (n >= y + this.RequiredVotes) {
      this.hbRoom.sendMsgToAll(`(!4) Wniosek o zmianę rozgrywki na 4vs4 odrzucony (${y}/${n})`, Colors.BrightBlue, 'italic');
      this.reset();
      return;
    }
    if (y >= n + this.RequiredVotes) {
      const activePlayers = this.hbRoom.auto_bot.getNonAfkAllCount();
      this.hbRoom.sendMsgToAll(`(!4) Wniosek o zmianę rozgrywki na 4vs4 przyjęty (${y}/${n}), liczba aktywnych graczy: ${activePlayers}`, Colors.BrightBlue, 'italic');
      if (activePlayers >= 8) {
        this.hbRoom.room.stopGame();
      }
      this.reset();
      return;
    }
  }

  reset() {
    this.at = 0;
    this.agreedBy.clear();
    this.disagreedBy.clear();
  }
}

export class AutoVoteHandler implements AutoVoter {
  hbRoom: HaxballRoom;
  voteKicker: VoteKicker;
  voteMuter: VoteMuter;
  voteBotKicker: VoteBotKicker;
  voteV4: VoteV4;
  activeVoter: AutoVoter|null;

  constructor(autoBot: AutoBot) {
    this.hbRoom = autoBot.hb_room;
    this.voteKicker = new VoteKicker(autoBot);
    this.voteMuter = new VoteMuter(autoBot.hb_room);
    this.voteBotKicker = new VoteBotKicker(this.hbRoom);
    this.voteV4 = new VoteV4(autoBot.hb_room);
    this.activeVoter = null;
    if (autoBot.getCurrentLimit() < 3) {
      this.voteKicker.RequiredVotes = 2;
      this.voteMuter.RequiredVotes = 2;
      this.voteBotKicker.RequiredVotes = 2;
    }
  }

  resetOnMatchStarted() {
    if (this.activeVoter === this.voteKicker) {
      this.voteKicker.reset();
    }
  }
  active(): boolean {
    if (this.activeVoter === null) return false;
    if (!this.activeVoter.active()) {
      this.activeVoter.reset();
      this.activeVoter = null;
      return false;
    }
    return true;
  }
  requestVoteKick(votedPlayer: PlayerData | null, byPlayer: PlayerData) {
    AMLog(`requestedVoteKick by ${byPlayer.name}`);
    if (!this.checkOtherVoteInProgress(byPlayer)) return false;
    this.activeVoter = this.voteKicker;
    this.voteKicker.handle(votedPlayer, byPlayer);
    return true;
  }
  requestVoteMute(votedPlayer: PlayerData | null, byPlayer: PlayerData) {
    AMLog(`requestedVoteMute by ${byPlayer.name}`);
    if (!this.checkOtherVoteInProgress(byPlayer)) return false;
    this.activeVoter = this.voteMuter;
    this.voteMuter.handle(votedPlayer, byPlayer);
    return true;
  }
  requestVoteBotKick(votedPlayer: PlayerData | null, byPlayer: PlayerData) {
    AMLog(`requestedVoteBotKick by ${byPlayer.name}`);
    if (!this.checkOtherVoteInProgress(byPlayer)) return false;
    this.activeVoter = this.voteBotKicker;
    this.voteBotKicker.handle(votedPlayer, byPlayer);
    return true;
  }
  requestVote4(votedPlayer: PlayerData | null, byPlayer: PlayerData) {
    AMLog(`requestedVote4 by ${byPlayer.name}`);
    if (!this.checkOtherVoteInProgress(byPlayer)) return false;
    this.activeVoter = this.voteV4;
    this.voteV4.handle(votedPlayer, byPlayer);
    return true;
  }
  private checkOtherVoteInProgress(byPlayer: PlayerData) {
    if (this.active()) {
      this.hbRoom.sendMsgToPlayer(byPlayer, 'Inne głosowanie jest w trakcie!', Colors.Warning);
      return false;
    }
    return true;
  }
  handle(votedPlayer: PlayerData | null, byPlayer: PlayerData): void {
    if (this.activeVoter == null) return;
    this.activeVoter.handle(votedPlayer, byPlayer);
  }
  handleYes(byPlayer: PlayerData): void {
    if (this.activeVoter == null) return;
    this.activeVoter.handleYes(byPlayer);
  }
  handleNo(byPlayer: PlayerData): void {
    if (this.activeVoter == null) return;
    this.activeVoter.handleNo(byPlayer);
  }
  handleChangeAssignment(player: PlayerData): void {
    if (this.activeVoter == null) return;
    this.activeVoter.handleChangeAssignment(player);
  }
  handleGameStop(): void {
    if (this.activeVoter == null) return;
    this.activeVoter.handleGameStop();
  }
  reset(): void {
    if (this.activeVoter === null) return;
    this.activeVoter.reset();
    this.activeVoter = null;
  }
  setRequiredVotes(n: number) {
    this.voteKicker.RequiredVotes = n;
    this.voteMuter.RequiredVotes = n;
  }
}

function AMLog(text: string) {
  console.log(`#VK# [${getTimestampHMS()}] ${text}`);
}
