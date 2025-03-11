import { GameState } from "./game_state";
import { HaxballRoom } from "./hb_room";
import { PlayerData } from "./structs";

interface IRejoice {
  name: string;
  isInProgress: () => boolean;
  handleGameTick: () => void;
  handlePositionsReset: () => void;
  handleTeamGoal: () => void;
  handleGameStop: () => void;
  reset: () => void;
}

class GravityRejoice implements IRejoice {
  name = 'gravity';
  inProgress: boolean;
  playerId: number;
  gravityPlayers: number[];
  properties: DiscPropertiesHandler;
  multiplier: number = 0.5;
  constructor(playerId: number, properties: DiscPropertiesHandler) {
    this.inProgress = false;
    this.playerId = playerId;
    let [redTeam, blueTeam] = properties.getRedBluePlayerIds();
    this.gravityPlayers = redTeam.concat(blueTeam).filter(e => e != playerId);
    this.properties = properties;
  }

  isInProgress() {
    return this.inProgress;
  }
  handleGameTick() {
    if (!this.isInProgress()) return;
    const centerPlayer = this.properties.getPlayerDiscProperties(this.playerId);
    if (!centerPlayer) return; // can be null!
    const cx = centerPlayer.x;
    const cy = centerPlayer.y;
    this.gravityPlayers.forEach(playerId => {
      const props = this.properties.getPlayerDiscProperties(playerId);
      if (props) {
        const { x, y } = props;
        let dx = cx - x;
        let dy = cy - y;
        let distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 0.01) {  // Zapobiega dzieleniu przez zero
          dx = (dx / distance) * this.multiplier;
          dy = (dy / distance) * this.multiplier;
        }
        this.properties.setPlayerDiscProperties(playerId, { "xgravity": dx, "ygravity": dy });
      }
    });
  }
  handlePositionsReset() {
    this.reset();
  }
  handleTeamGoal() {
    let [redTeam, blueTeam] = this.properties.getRedBluePlayerIds();
    this.gravityPlayers = redTeam.concat(blueTeam).filter(e => e != this.playerId);
    this.inProgress = true;
  }
  handleGameStop() {
    this.reset();
  }
  reset() {
    this.gravityPlayers.forEach(playerId => {
      this.properties.setPlayerDiscProperties(playerId, { "xgravity": 0, "ygravity": 0 });
    });
    this.inProgress = false;
  }
}

class RadiusMultiplierRejoice implements IRejoice {
  name = 'getting_multiplied';
  inProgress: boolean;
  playerId: number;
  startedAt: number;
  startingRadius: number;
  multiplierAtOneSecond: number;
  properties: DiscPropertiesHandler;
  constructor(playerId: number, multiplier: number, properties: DiscPropertiesHandler) {
    this.inProgress = false;
    this.playerId = playerId;
    this.startedAt = 0;
    this.properties = properties;
    this.startingRadius = 0;
    this.multiplierAtOneSecond = multiplier;
  }

  isInProgress() {
    return this.inProgress;
  }
  handleGameTick() {
    if (!this.isInProgress()) return;
    const now = Date.now();
    const timeElapsed = (now - this.startedAt) / 1000;
    const multiplier = this.multiplierAtOneSecond ** timeElapsed;
    const newRadius = Math.max(this.startingRadius * multiplier, 0.1);
    this.properties.setPlayerDiscProperties(this.playerId, { "radius": newRadius });
  }
  handlePositionsReset() {
    this.reset();
  }
  handleTeamGoal() {
    this.startedAt = Date.now();
    const props = this.properties.getPlayerDiscProperties(this.playerId);
    if (!props) return;
    this.startingRadius = props.radius;
    this.inProgress = true;
  }
  handleGameStop() {
    this.reset();
  }
  reset() {
    this.properties.setPlayerDiscProperties(this.playerId, { "radius": this.startingRadius });
    this.inProgress = false;
  }
}

class GettingBiggerRejoice extends RadiusMultiplierRejoice {
  name = 'getting_bigger';
  constructor(playerId: number, properties: DiscPropertiesHandler) {
    super(playerId, 3, properties);
  }
}

class GettingSmallerRejoice extends RadiusMultiplierRejoice {
  name = 'getting_smaller';
  constructor(playerId: number, properties: DiscPropertiesHandler) {
    super(playerId, 0.5, properties);
  }
}

class PlayerRejoices {
  selected: string;
  rejoices: Map<string, IRejoice>;
  constructor(firstRejoice: IRejoice) {
    this.selected = firstRejoice.name;
    this.rejoices = new Map<string, IRejoice>();
    this.rejoices.set(firstRejoice.name, firstRejoice);
  }
  add(rejoice: IRejoice) {
    this.rejoices.set(rejoice.name, rejoice);
  }
  get() {
    return this.rejoices.get(this.selected)!;
  }
  changeSelected(newSelected: string) {
    if (this.rejoices.has(newSelected)) {
      this.selected = newSelected;
      return true;
    }
    return false;
  }
  getRejoiceNames() {
    return Array.from(this.rejoices.keys());
  }
}

class DiscPropertiesHandler {
  getPlayerDiscProperties: (playerId: number) => DiscPropertiesObject;
  getDiscProperties: (discId: number) => DiscPropertiesObject;
  setPlayerDiscProperties: (playerId: number, properties: Partial<DiscPropertiesObject>) => void;
  setDiscProperties: (discId: number, properties: Partial<DiscPropertiesObject>) => void;
  getRedBluePlayerIds: () => [number[], number[]];
  constructor(room: RoomObject) {
    this.getPlayerDiscProperties = (playerId: number) => {
      return room.getPlayerDiscProperties(playerId);
    }
    this.getDiscProperties = (discIndex: number) => {
      return room.getDiscProperties(discIndex);
    }
    this.setPlayerDiscProperties = (playerId: number, properties: Partial<DiscPropertiesObject>) => {
      return room.setPlayerDiscProperties(playerId, properties);
    }
    this.setDiscProperties = (discId: number, properties: Partial<DiscPropertiesObject>) => {
      return room.setDiscProperties(discId, properties);
    }
    this.getRedBluePlayerIds = () => {
      let redTeam: number[] = [];
      let blueTeam: number[] = [];
      room.getPlayerList().forEach(e => {
        if (e.team == 1) redTeam.push(e.id);
        else if (e.team == 2) blueTeam.push(e.id);
      })
      return [redTeam, blueTeam];
    };
  }
}

export class RejoiceMaker {
  gameState: GameState;
  playerRejoices: Map<number, PlayerRejoices>;
  playingRejoices: IRejoice[];
  dpHandler: DiscPropertiesHandler;

  constructor(hbRoom: HaxballRoom) {
    this.gameState = hbRoom.game_state;
    this.playerRejoices = new Map<number, PlayerRejoices>();
    this.playingRejoices = [];
    this.dpHandler = new DiscPropertiesHandler(hbRoom.room);
  }

  async handlePlayerJoin(player: PlayerData) {
    try {
      let results = await this.gameState.getRejoicesForPlayer(player.auth_id);
      const now = Date.now();
      for (let result of results) {
        const rejoiceEnabledUpTo = result.time_to;
        if (rejoiceEnabledUpTo > now) {
          let rejoice = this.createRejoiceByName(result.rejoice_id, player.id);
          if (!rejoice) {
            RMLog(`Nie mogę stworzyć rejoice o nazwie ${result.rejoice_id} dla ${player.name}`);
          } else {
            if (!this.playerRejoices.has(player.id)) this.playerRejoices.set(player.id, new PlayerRejoices(rejoice));
            else this.playerRejoices.get(player.id)!.add(rejoice);
            RMLog(`Dodałem ${result.rejoice_id} dla ${player.name}`);
          }
        }
      }
    } catch (err) {
      RMLog(`Błąd pobierania rejoices dla ${player.name}: ${err}`);
    }
  }
  handleTeamGoal(scorerPlayerId: number, assisterPlayerId: number, ownGoalPlayerId: number) {
    this.playingRejoices.forEach(e => e.reset());
    this.playingRejoices.length = 0;
    if (this.playerRejoices.has(scorerPlayerId)) this.playingRejoices.push(this.playerRejoices.get(scorerPlayerId)!.get());
    if (this.playerRejoices.has(assisterPlayerId)) this.playingRejoices.push(this.playerRejoices.get(assisterPlayerId)!.get());
    if (this.playingRejoices.length == 2) this.checkPriorityOfRejoices();
    if (ownGoalPlayerId !== -1) this.playingRejoices.push(this.getOwnGoalRejoice(ownGoalPlayerId));
    this.playingRejoices.forEach(rejoice => {
      rejoice.handleTeamGoal();
    });
  }
  handleGameTick() {
    this.playingRejoices.forEach(rejoice => {
      rejoice.handleGameTick();
    });
  }
  handleGameStop() {
    this.playingRejoices.forEach(rejoice => {
      rejoice.handleGameStop();
    });
    this.playingRejoices.length = 0;
  }
  handlePositionsReset() {
    this.playingRejoices.forEach(rejoice => {
      rejoice.handlePositionsReset();
    });
    this.playingRejoices.length = 0;
  }
  getRejoiceNames(playerId: number) {
    if (!this.playerRejoices.has(playerId)) return [];
    return this.playerRejoices.get(playerId)!.getRejoiceNames();
  }
  private checkPriorityOfRejoices() {
    let sr = this.playingRejoices[0];
    let ar = this.playingRejoices[1];
    // only one gravity playing rejoice and scorer has priority
    if (ar.name == "gravity" && sr.name == "gravity") {
      this.playingRejoices.length = 1;
    }
  }
  private createRejoiceByName(rejoiceId: string, playerId: number) {
    if (rejoiceId == "getting_bigger") return new GettingBiggerRejoice(playerId, this.dpHandler);
    if (rejoiceId == "gravity") return new GravityRejoice(playerId, this.dpHandler);
    return null;
  }
  private getOwnGoalRejoice(playerId: number) {
    return new GettingSmallerRejoice(playerId, this.dpHandler);
  }
}

function RMLog(txt: string) {
  console.log(`#RM#${txt}`);
}
