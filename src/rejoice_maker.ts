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
  name = 'bigger';
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

class ExplosionRejoice {
  name: string = 'explosion';
  inProgress: boolean;
  playerId: number;
  affectedPlayers: number[];
  startingRadius: number;
  properties: DiscPropertiesHandler
  multiplier: number;
  duration: number;
  startTime: number;
  constructor(playerId: number, properties: DiscPropertiesHandler) {
    this.inProgress = false;
    this.playerId = playerId;
    let [redTeam, blueTeam] = properties.getRedBluePlayerIds();
    this.affectedPlayers = redTeam.concat(blueTeam).filter(e => e != playerId);
    this.startingRadius = 0;
    this.properties = properties;
    this.multiplier = 0.001; // Siła odrzutu
    this.duration = 2500; // Czas trwania w ms
    this.startTime = 0;
  }

  isInProgress() {
    return this.inProgress;
  }

  async handleGameTick() {
    if (!this.isInProgress()) return;
    const elapsed = Date.now() - this.startTime;

    const centerPlayer = this.properties.getPlayerDiscProperties(this.playerId);
    if (!centerPlayer) return;
    const cx = centerPlayer.x;
    const cy = centerPlayer.y;
    let radiusFactor = elapsed < 1000 ? 1 + (elapsed / 1000) : 2 - ((elapsed - 1000) / 1000);

    this.properties.setPlayerDiscProperties(this.playerId, { "radius": Math.max(this.startingRadius * radiusFactor, this.startingRadius) });

    this.affectedPlayers.forEach(playerId => {
      const props = this.properties.getPlayerDiscProperties(playerId);
      if (props) {
        if (elapsed > 1000) {
          if (props.xgravity != 0 || props.ygravity != 0) {
            this.properties.setPlayerDiscProperties(playerId, { "xgravity": 0, "ygravity": 0 });
          }
        } else {
          const { x, y } = props;
          let dx = x - cx;
          let dy = y - cy;
          let distance = Math.sqrt(dx * dx + dy * dy) || 1;
          let force = (this.multiplier ** (elapsed / 1000) / distance);
          dx *= force;
          dy *= force;
          this.properties.setPlayerDiscProperties(playerId, { "xgravity": dx, "ygravity": dy });
        }
      }
    });
  }

  async handlePositionsReset() {
    this.reset();
  }

  async handleTeamGoal() {
    const props = this.properties.getPlayerDiscProperties(this.playerId);
    if (!props) return;
    this.startingRadius = props.radius;
    let [redTeam, blueTeam] = this.properties.getRedBluePlayerIds();
    this.affectedPlayers = redTeam.concat(blueTeam).filter(e => e != this.playerId);
    this.startTime = Date.now();
    this.inProgress = true;
  }

  async handleGameStop() {
    this.reset();
  }

  reset() {
    this.affectedPlayers.forEach(playerId => {
      this.properties.setPlayerDiscProperties(playerId, { "xgravity": 0, "ygravity": 0 });
    });
    this.properties.setPlayerDiscProperties(this.playerId, { "radius": this.startingRadius });
    this.inProgress = false;
  }
}

class SlowMotionRejoice {
  name: string = 'slowmo';
  inProgress: boolean;
  playerId: number;
  affectedPlayers: number[];
  properties: DiscPropertiesHandler
  multiplier: number;
  startTime: number;
  constructor(playerId: number, properties: DiscPropertiesHandler) {
    this.inProgress = false;
    this.playerId = playerId;
    let [redTeam, blueTeam] = properties.getRedBluePlayerIds();
    this.affectedPlayers = redTeam.concat(blueTeam).filter(e => e != playerId);
    this.properties = properties;
    this.multiplier = 0.09;
    this.startTime = 0;
  }

  isInProgress() {
    return this.inProgress;
  }

  async handleGameTick() {
    if (!this.isInProgress()) return;
    const elapsed = Date.now() - this.startTime;
    this.affectedPlayers.forEach(playerId => {
      const props = this.properties.getPlayerDiscProperties(playerId);
      if (props) {
        const newXGravity = -props.xspeed * this.multiplier;
        const newYGravity = -props.yspeed * this.multiplier;
        this.properties.setPlayerDiscProperties(playerId, {
          xgravity: newXGravity,
          ygravity: newYGravity
        });
      }
    });
  }

  async handlePositionsReset() {
    this.reset();
  }

  async handleTeamGoal() {
    const props = this.properties.getPlayerDiscProperties(this.playerId);
    if (!props) return;
    let [redTeam, blueTeam] = this.properties.getRedBluePlayerIds();
    this.affectedPlayers = redTeam.concat(blueTeam).filter(e => e != this.playerId);
    this.startTime = Date.now();
    this.inProgress = true;
  }

  async handleGameStop() {
    this.reset();
  }

  reset() {
    this.affectedPlayers.forEach(playerId => {
      this.properties.setPlayerDiscProperties(playerId, { xgravity: 0, ygravity: 0 });
    });
    this.inProgress = false;
  }
}

class SmileRejoice {
  name: string = 'smile';
  inProgress: boolean;
  startingRadius: number;
  cMasks: Map<number, number>;
  duration: number;
  startTime: number;
  radius: number;
  centerPlayer: number;
  players: number[];
  playerPositions: { x: number, y: number }[];
  properties: DiscPropertiesHandler;
  constructor(playerId: number, properties: DiscPropertiesHandler) {
    this.name = 'smile';
    this.inProgress = false;
    this.properties = properties;
    this.startingRadius = 0;
    this.cMasks = new Map();
    this.duration = 2250;
    this.startTime = 0;
    this.radius = 200;

    this.centerPlayer = -1;
    this.players = [];

    this.playerPositions = [
      { x: -50, y: -80 }, // Left Eye
      { x: 50, y: -80 },  // Right Eye
      { x: 0, y: 90 },
      { x: -35, y: 80 },
      { x: 35, y: 80 },
      { x: -60, y: 70 },
      { x: 60, y: 70 },
      { x: -80, y: 60 },
      { x: 80, y: 60 },
      { x: -100, y: 50 },
      { x: 100, y: 50 },
    ]
  }

  isInProgress() {
    return this.inProgress;
  }

  handleGameTick() {
    if (!this.isInProgress()) return;
    if (Date.now() - this.startTime > this.duration) {
      this.reset();
      return;
    }

    this.properties.setPlayerDiscProperties(this.centerPlayer, { x: 0, y: 0 });
    for (let i = 0; i < this.players.length && i < this.playerPositions.length; i++) {
      this.properties.setPlayerDiscProperties(this.players[i], this.playerPositions[i]);
    }
    this.properties.setDiscProperties(0, { x: 0, y: 0 });
  }

  handlePositionsReset() {
    this.reset();
  }

  handleTeamGoal() {
    this.startingRadius = 0;
    let [redTeam, blueTeam] = this.properties.getRedBluePlayerIds();
    this.players = redTeam.concat(blueTeam).sort((lhs, rhs) => lhs - rhs);
    if (this.players.length < 3) return;
    let validPlayers = [];
    for (let playerId of this.players) {
      const props = this.properties.getPlayerDiscProperties(playerId);
      if (!props) continue;
      this.cMasks.set(playerId, props.cMask);
      if (this.startingRadius === 0) this.startingRadius = props.radius;
      this.properties.setPlayerDiscProperties(playerId, { cMask: 0 });
      validPlayers.push(playerId);
    }
    if (validPlayers.length < 3) return;
    this.players = validPlayers;
    this.centerPlayer = this.players.shift()!;
    this.properties.setPlayerDiscProperties(this.centerPlayer, { radius: this.radius });
    this.startTime = Date.now();
    this.inProgress = true;
  }

  handleGameStop() {
    this.reset();
  }

  reset() {
    this.properties.setPlayerDiscProperties(this.centerPlayer, { radius: this.startingRadius, cMask: this.cMasks.get(this.centerPlayer) });
    this.players.forEach(playerId => {
      this.properties.setPlayerDiscProperties(playerId, { cMask: this.cMasks.get(playerId) });
    });
    this.cMasks.clear();
    this.inProgress = false;
  }
}

type HSL = [number, number, number];
class RandomDiscColorsRejoice {
  name: string = 'disc_colors';
  inProgress: boolean;
  duration: number;
  startTime: number;
  tick: number;
  discs: HSL[];
  properties: DiscPropertiesHandler;
  constructor(properties: DiscPropertiesHandler) {
    this.name = 'smile';
    this.inProgress = false;
    this.properties = properties;
    this.duration = 2250;
    this.startTime = 0;
    this.tick = 0;
    this.discs = [];
  }

  isInProgress() {
    return this.inProgress;
  }

  handleGameTick() {
    if (!this.isInProgress()) return;
    if (Date.now() - this.startTime > this.duration) {
      this.reset();
      return;
    }
    if (++this.tick % 3 !== 0) return; // just be nice, don't spam!

    for (let i = 0; i < this.discs.length; ++i) {
      this.discs[i] = this.nextColor(this.discs[i]);
      const rgb = this.hslToRgb(this.discs[i]);
      this.properties.setDiscProperties(i, {color: rgb});
    }
  }

  // RGB → HSL
  rgbToHsl(color: number): HSL {
    let r = (color >> 16) & 0xff;
    let g = (color >> 8) & 0xff;
    let b = color & 0xff;

    let max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2 / 255; // Normalizacja do zakresu 0-1

    if (max !== min) {
      let d = max - min;
      s = d / (1 - Math.abs(2 * l - 1)); // Poprawiona formuła
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h = Math.round(h * 60);
    }

    return [h, s, l];
  }

  // Zmiana koloru w HSL (przesunięcie odcienia)
  nextColor(hsl: HSL): HSL {
    let step = Math.floor(Math.random() * 3) + 1; // Losowa wartość [1,4]
    return [(hsl[0] + step) % 360, hsl[1], hsl[2]];
  }

  // HSL → RGB
  hslToRgb(hsl: HSL): number {
    let [h, s, l] = hsl;

    let c = (1 - Math.abs(2 * l - 1)) * s;
    let x = c * (1 - Math.abs((h / 60) % 2 - 1));
    let m = l - c / 2;

    let r1 = 0, g1 = 0, b1 = 0;
    if (h < 60) [r1, g1, b1] = [c, x, 0];
    else if (h < 120) [r1, g1, b1] = [x, c, 0];
    else if (h < 180) [r1, g1, b1] = [0, c, x];
    else if (h < 240) [r1, g1, b1] = [0, x, c];
    else if (h < 300) [r1, g1, b1] = [x, 0, c];
    else[r1, g1, b1] = [c, 0, x];

    let r = Math.round((r1 + m) * 255)&0xFF;
    let g = Math.round((g1 + m) * 255)&0xFF;
    let b = Math.round((b1 + m) * 255)&0xFF;

    return (r << 16) | (g << 8) | b;
  }
  handlePositionsReset() {
    this.reset();
  }

  handleTeamGoal() {
    // volleyball ball has 18, do not change it
    for (let i = 0; i < 17; ++i) {
      const props = this.properties.getDiscProperties(i);
      if (!props) break;
      const color = props.color;
      if (!color) break;
      this.discs.push(this.rgbToHsl(color));
    }
    this.startTime = Date.now();
    this.inProgress = true;
  }

  handleGameStop() {
    this.discs.length = 0;
    this.reset();
  }

  reset() {
    this.inProgress = false;
  }
}

class BigBallRejoice {
  name: string = 'big_ball';
  playerId: number;
  inProgress: boolean;
  ballRadius: number;
  startPosX: number;
  endPosX: number;
  duration: number;
  startTime: number;
  properties: DiscPropertiesHandler;
  constructor(playerId: number, properties: DiscPropertiesHandler) {
    this.name = 'big_ball';
    this.playerId = playerId;
    this.inProgress = false;
    this.ballRadius = 0;
    this.startPosX = 0;
    this.endPosX = 0;
    this.properties = properties;
    this.duration = 2250;
    this.startTime = 0;
  }

  isInProgress() {
    return this.inProgress;
  }

  async handleGameTick() {
    if (!this.isInProgress()) return;
    const elapsed = Date.now() - this.startTime;
    if (elapsed > this.duration) {
      this.reset();
      return;
    }
    const xspeed = (this.endPosX - this.startPosX) / (this.duration / 1000);
    const x = this.startPosX + xspeed * (elapsed / 1000);
    this.properties.setDiscProperties(0, { x: x, y: 0, xspeed: xspeed });
  }

  async handlePositionsReset() {
    this.reset();
  }

  async handleTeamGoal() {
    const props = this.properties.getDiscProperties(0);
    if (!props) return;
    this.ballRadius = props.radius;
    let [redTeam, blueTeam] = this.properties.getRedBluePlayerIds();
    this.startPosX = redTeam.includes(this.playerId) ? -1 : 1;
    let newRadius = 230;
    if (redTeam.length + blueTeam.length > 6) {
      this.startPosX *= 450;
      newRadius = 350;
    } else if (redTeam.length + blueTeam.length > 4) {
      this.startPosX *= 400;
      newRadius = 300;
    } else this.startPosX *= 300;
    this.endPosX = -this.startPosX;
    const xspeed = Math.sign(this.endPosX - this.startPosX) * 10;
    this.properties.setDiscProperties(0, { radius: newRadius, x: this.startPosX, y: 0, xspeed: xspeed });
    this.startTime = Date.now();
    this.inProgress = true;
  }

  async handleGameStop() {
    this.reset();
  }

  reset() {
    this.properties.setDiscProperties(0, { radius: this.ballRadius });
    this.inProgress = false;
  }
};


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
  getAllPlayerIds: () => number[];
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
    this.getAllPlayerIds = (): number[] => {
      return room.getPlayerList().map(e => e.id);
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

  async handlePlayerJoin(player: PlayerData): Promise<number> {
    try {
      let numberOfRejoices = 0;
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
            numberOfRejoices++;
          }
        }
      }
      return numberOfRejoices;
    } catch (err) {
      RMLog(`Błąd pobierania rejoices dla ${player.name}: ${err}`);
      return -1;
    }
  }
  handleTeamGoal(scorerPlayerId: number, assisterPlayerId: number, ownGoalPlayerId: number) {
    this.playingRejoices.forEach(e => e.reset());
    this.playingRejoices.length = 0;
    if (this.playerRejoices.has(scorerPlayerId)) this.playingRejoices.push(this.playerRejoices.get(scorerPlayerId)!.get());
    if (this.playerRejoices.has(assisterPlayerId)) this.playingRejoices.push(this.playerRejoices.get(assisterPlayerId)!.get());
    if (this.playingRejoices.length == 2) this.checkPriorityOfRejoices();
    if (ownGoalPlayerId !== -1) this.playingRejoices.push(this.getOwnGoalRejoice(ownGoalPlayerId));
    this.playingRejoices.push(this.getDiscColorsRejoice());
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
  changeSelected(playerId: number, newSelected: string): boolean {
    if (!this.playerRejoices.has(playerId)) return false;
    return this.playerRejoices.get(playerId)!.changeSelected(newSelected);
  }
  private checkPriorityOfRejoices() {
    let playersNum = this.dpHandler.getAllPlayerIds().length;
    let sr = this.playingRejoices[0]; // scorer
    let ar = this.playingRejoices[1]; // assister
    if (playersNum < 3 && ar.name === 'smile') {
      // if both have smile but there are only 2 players, do nothing...
      if (sr.name === 'smile') this.playingRejoices.length = 0;
      else this.playingRejoices.length = 1; // or scorer rejoice
      return;
    } else if (playersNum < 3 && sr.name === 'smile') {
      this.playingRejoices.shift(); // assister have another rejoice, so leave it!
      return;
    }
    // only getting bigger allowed for both players
    if (ar.name === sr.name) {
      if (ar.name !== "bigger") this.playingRejoices.length = 1;
      return;
    }
    if (ar.name === 'bigger' || sr.name === 'bigger') {
      return; // allow that combination so one player has bigger, the second one has another
    }
    // in any other case prefer scorer, not assister
    this.playingRejoices.length = 1;
  }
  private createRejoiceByName(rejoiceId: string, playerId: number) {
    if (rejoiceId === "bigger") return new GettingBiggerRejoice(playerId, this.dpHandler);
    if (rejoiceId === "gravity") return new GravityRejoice(playerId, this.dpHandler);
    if (rejoiceId === "explosion") return new ExplosionRejoice(playerId, this.dpHandler);
    if (rejoiceId === "slowmo") return new SlowMotionRejoice(playerId, this.dpHandler);
    if (rejoiceId === "smile") return new SmileRejoice(playerId, this.dpHandler);
    if (rejoiceId === "big_ball") return new BigBallRejoice(playerId, this.dpHandler);
    return null;
  }
  private getOwnGoalRejoice(playerId: number) {
    return new GettingSmallerRejoice(playerId, this.dpHandler);
  }
  private getDiscColorsRejoice() {
    return new RandomDiscColorsRejoice(this.dpHandler);
  }
}

function RMLog(txt: string) {
  console.log(`#RM#${txt}`);
}
