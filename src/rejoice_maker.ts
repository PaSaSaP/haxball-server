import { GameState } from "./game_state";
import { HaxballRoom } from "./hb_room";
import { PlayerData } from "./structs";

interface IRejoice {
  isInProgress: () => boolean;
  handleGameTick: () => void;
  handlePositionsReset: () => void;
  handleTeamGoal: () => void;
  handleGameStop: () => void;
  reset: () => void;
}

class RadiusMultiplierRejoice implements IRejoice {
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
    // const multiplier = (now - this.startedAt) * this.multiplierAtOneSecond / 1000;
    // const newRadius = Math.max(this.startingRadius * multiplier, 0.1);
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
    this.startingRadius = this.properties.getPlayerDiscProperties(this.playerId).radius;
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
  constructor(playerId: number, properties: DiscPropertiesHandler) {
    super(playerId, 3, properties);
  }
}

class GettingSmallerRejoice extends RadiusMultiplierRejoice {
  constructor(playerId: number, properties: DiscPropertiesHandler) {
    super(playerId, 0.5, properties);
  }
}

class DiscPropertiesHandler {
  getPlayerDiscProperties: (playerId: number) => DiscPropertiesObject;
  getDiscProperties: (discId: number) => DiscPropertiesObject;
  setPlayerDiscProperties: (playerId: number, properties: Partial<DiscPropertiesObject>) => void;
  setDiscProperties: (discId: number, properties: Partial<DiscPropertiesObject>) => void;
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
  }
}

export class RejoiceMaker {
  gameState: GameState;
  rejoices: Map<number, IRejoice>;
  otherRejoices: Map<number, IRejoice>;
  rejoicingPlayerIds: Set<number>;
  otherPlayerIds: Set<number>;
  dpHandler: DiscPropertiesHandler;

  constructor(hbRoom: HaxballRoom) {
    this.gameState = hbRoom.game_state;
    this.rejoices = new Map<number, IRejoice>();
    this.otherRejoices = new Map<number, IRejoice>();
    this.rejoicingPlayerIds = new Set<number>();
    this.otherPlayerIds = new Set<number>();
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
            this.rejoices.set(player.id, rejoice);
            RMLog(`Dodałem ${result.rejoice_id} dla ${player.name}`);
          }
        }
      }
    } catch (err) {
      RMLog(`Błąd pobierania rejoices dla ${player.name}: ${err}`);
    }
  }
  handleTeamGoal(scorerPlayerId: number, assisterPlayerId: number, ownGoalPlayerId: number) {
    this.rejoicingPlayerIds.clear();
    this.otherRejoices.clear();
    if (this.rejoices.has(scorerPlayerId)) this.rejoicingPlayerIds.add(scorerPlayerId);
    if (this.rejoices.has(assisterPlayerId)) this.rejoicingPlayerIds.add(assisterPlayerId);
    if (ownGoalPlayerId !== -1) {
      this.otherRejoices.set(ownGoalPlayerId, this.getOwnGoalRejoice(ownGoalPlayerId));
      this.otherPlayerIds.add(ownGoalPlayerId);
    }
    this.rejoicingPlayerIds.forEach(playerId => {
      this.rejoices.get(playerId)?.handleTeamGoal();
    });
    this.otherPlayerIds.forEach(playerId => {
      this.otherRejoices.get(playerId)?.handleTeamGoal();
    });
  }
  handleGameTick() {
    this.rejoicingPlayerIds.forEach(playerId => {
      this.rejoices.get(playerId)?.handleGameTick();
    });
    this.otherPlayerIds.forEach(playerId => {
      this.otherRejoices.get(playerId)?.handleGameTick();
    });
  }
  handleGameStop() {
    this.rejoicingPlayerIds.forEach(playerId => {
      this.rejoices.get(playerId)?.handleGameStop();
    });
    this.otherPlayerIds.forEach(playerId => {
      this.otherRejoices.get(playerId)?.handleGameStop();
    });
    this.rejoicingPlayerIds.clear();
    this.otherRejoices.clear();
  }
  handlePositionsReset() {
    this.rejoicingPlayerIds.forEach(playerId => {
      this.rejoices.get(playerId)?.handlePositionsReset();
    });
    this.otherPlayerIds.forEach(playerId => {
      this.otherRejoices.get(playerId)?.handlePositionsReset();
    });
    this.rejoicingPlayerIds.clear();
    this.otherRejoices.clear();
  }
  private createRejoiceByName(rejoiceId: string, playerId: number) {
    if (rejoiceId == "getting_bigger") return new GettingBiggerRejoice(playerId, this.dpHandler);
    return null;
  }
  private getOwnGoalRejoice(playerId: number) {
    return new GettingSmallerRejoice(playerId, this.dpHandler);
  }
}

function RMLog(txt: string) {
  console.log(`#RM#${txt}`);
}
