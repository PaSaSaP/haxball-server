import { Colors } from "./colors";
import { HaxballRoom } from "./hb_room";
import { PlayerData } from "./structs";

enum ServeType {
  none,
  z,
  a,
  q,
  e
}

export class Volleyball {
  private static yAtNet = 70;
  private hbRoom: HaxballRoom;
  private lastTouchBy: PlayerData|null;
  private lastBallPosition: DiscPropertiesObject;
  private abusingTimeStamp: number;
  private blocked: boolean;
  private lastPlayerTouchedTime: number;
  private totalTouches: number;
  private twoTouchesOn1vs1: boolean;
  private ballIdx: number;
  // private ballIdx2: number;
  private servingTeam: number;
  private served: boolean;
  // private justServed: boolean;
  private serveType: ServeType;
  private gravityEnabled: boolean;
  private enabled: boolean;
  private training: boolean;
  ballXGravity: number = 0.012;
  ballYDownLevel: number = 200;
  constructor(hbRoom: HaxballRoom, enabled: boolean = false) {
    this.hbRoom = hbRoom;
    this.lastTouchBy = null;
    this.lastBallPosition = this.getZeroedBallPosition();
    this.abusingTimeStamp = 0;
    this.blocked = false;
    this.enabled = enabled;
    this.lastPlayerTouchedTime = 0;
    this.totalTouches = 0;
    this.twoTouchesOn1vs1 = false;
    this.ballIdx = -1;
    // this.ballIdx2 = -1;
    this.servingTeam = 0;
    this.served = false;
    this.serveType = ServeType.none;
    this.gravityEnabled = false;
    // this.justServed = false;
    this.training = false;
  }

  justServed() {
    return this.serveType !== ServeType.none;
  }

  isEnabled() {
    return this.enabled;
  }

  isTrainingMode() {
    return this.training;
  }

  setEnabled(enabled: boolean = true) {
    this.enabled = enabled;
  }

  setTraining(enabled: boolean) {
    this.training = enabled;
  }

  handleServeBy(player: PlayerData, serveType: string) {
    if (!this.enabled) return;
    if (this.training) return;
    if (this.served) return;
    if (player.team !== this.servingTeam) return;

    if (serveType === 'z') this.serveType = ServeType.z;
    else if (serveType === 'a') this.serveType = ServeType.a;
    else if (serveType === 'q') this.serveType = ServeType.q;
    else if (serveType === 'e') this.serveType = ServeType.e;
    else this.serveType = ServeType.z;

    const m = player.team === 1 ? 1 : -1;
    const x = -420 * m;
    const y = this.ballYDownLevel;
    const xspeed = 1 * m;
    const yspeed = this.serveType === ServeType.a? -8: -14;
    const ballIdx = this.getBallIndex();
    this.hbRoom.room.setDiscProperties(ballIdx, { x, y, xspeed, yspeed });
    this.lastTouchBy = player;
    this.served = true;
  }

  handleGameStart() {
    if (!this.isEnabled()) return;
    this.lastTouchBy = null;
    this.lastPlayerTouchedTime = 0;
    this.lastBallPosition = this.getZeroedBallPosition();
    this.abusingTimeStamp = 0;
    this.blocked = false;
    this.lastPlayerTouchedTime = 0;
    this.totalTouches = 0;
    this.ballIdx = -1;
    this.servingTeam = 2;
    this.serveType = ServeType.none;
    this.gravityEnabled = false;
    this.served = false;
  }

  handleGameStop() {
  }

  handleGameTick(currentTime: number, ballPosition: DiscPropertiesObject) {
    if (!this.isEnabled()) return;
    if (!this.isGameInProgress()) return;
    if (this.training) return;
    if (!this.gravityEnabled && (this.serveType === ServeType.q || this.serveType === ServeType.e)) {
      const ballIdx = this.getBallIndex();
      // VBLog(`serve in progress, ballIdx: ${ballIdx}    ${ballPosition.y} > ${this.lastBallPosition.y}`);
      if (ballIdx !== -1 && ballPosition.y > this.lastBallPosition.y && ballPosition.y < this.ballYDownLevel) {
        const m = this.servingTeam === 1 ? 1 : -1;
        const xgravity = this.serveType === ServeType.q ? -this.ballXGravity*m : this.ballXGravity*m;
        this.hbRoom.room.setDiscProperties(ballIdx, { xgravity });
        this.gravityEnabled = true;
        // VBLog(`curved type ${this.serveType}, xgravity: ${xgravity}`);
      }
    }
    if (ballPosition.x * this.lastBallPosition.x < 0 && this.lastTouchBy) {
      let slope = (ballPosition.x - this.lastBallPosition.x) != 0 ?
        (ballPosition.y - this.lastBallPosition.y) / (ballPosition.x - this.lastBallPosition.x) :
        0;
      let yAtNet = this.lastBallPosition.y + slope * Math.abs(this.lastBallPosition.x);
      if (yAtNet > Volleyball.yAtNet && (!this.abusingTimeStamp || currentTime -this.abusingTimeStamp > 1000)) {
        this.hbRoom.sendMsgToAll("❌ Kara! " + this.lastTouchBy.name + " wykorzystał błąd gry!",
          Colors.LightRed, 'bold');
        VBLog(`Ball crossed net: x=${ballPosition.x}, y=${ballPosition.y}, yAtNet=${yAtNet}`);
        this.givePenalty(this.lastTouchBy.team);
        this.abusingTimeStamp = currentTime;
      }
    }
    this.lastBallPosition = ballPosition;
  }

  private zeroBallGravity() {
    if (this.serveType === ServeType.q || this.serveType === ServeType.e) {
      const ballIdx = this.getBallIndex();
      if (ballIdx !== -1) {
        this.hbRoom.room.setDiscProperties(ballIdx, { xgravity: 0 });
      }
    }
    this.gravityEnabled = false;
  }

  private static TrainingMessages: string[] = [
    '🏐 Trening czyni mistrza!',
    '💪 Sam ze sobą? Niezła rywalizacja!',
    '🤔 Może czas na prawdziwy mecz?',
    '😅 To już trening, czy samotne odbijanie?',
    '🚀 Jeszcze trochę i zagrasz w finałach… sam!',
    '🥵 Nieźle się pocisz, piłka się nie broni!',
    '🏅 Medal za wytrwałość już czeka!',
    '😂 Nie martw się, piłka nie narzeka!',
    '🙃 Kto wygra? Ty czy… ty?',
    '🧠 Umiejętności rosną, przeciwników brak!',
    '🤷‍♂️ Trener powiedział: "Ćwicz"... ale nie mówił, że sam!',
    '🏖️ Może do tego treningu dodać AI? Tak dla odmiany.',
    '🕺 Taniec z piłką w pełni!',
    '🤨 Ile jeszcze odbić, zanim zrobisz przerwę?',
    '📈 Statystyki? 100% posiadania piłki!',
    '🥶 Nie boisz się kontuzji od tego skakania?',
    '🎭 Publiczność? Wyobraź ją sobie!',
    '🏐 Piłka też by chciała mieć przeciwnika…',
    '🥴 Jak długo można trenować w samotności?',
    '🦾 Przynajmniej nikt cię nie wyklucza z drużyny!',
  ];

  private getTrainingMessage() {
    return Volleyball.TrainingMessages[Math.floor(Math.random() * Volleyball.TrainingMessages.length)];
  }

  handlePlayerBallKick(currentTime: number, player: PlayerData, redTeam: number[], blueTeam: number[]) {
    if (!this.isEnabled()) return;
    if (this.training) {
      if (currentTime - this.abusingTimeStamp > 5000) {
        this.hbRoom.sendMsgToAll(this.getTrainingMessage(), Colors.LightYellow, 'bold');
        this.abusingTimeStamp = currentTime;
      }
      return;
    }
    if (!this.isGameInProgress()) return;
    const justServed = this.justServed();
    let teamCount = 0;
    if (redTeam.includes(player.id)) teamCount = redTeam.length;
    else if (blueTeam.includes(player.id)) teamCount = blueTeam.length;
    else return;
    let lastTouchBy = this.lastTouchBy;
    if (!lastTouchBy) {
      // serve from center
      const ballIdx = this.getBallIndex();
      this.totalTouches = 1;
      const color = this.getColorByTotalTouches();
      this.hbRoom.room.setDiscProperties(ballIdx, { color });
      this.served = true;
      this.lastTouchBy = player;
      this.lastPlayerTouchedTime = currentTime;
      return;
    }

    if (justServed) {
      if (lastTouchBy && lastTouchBy.id === player.id && this.totalTouches > 0) {
        this.hbRoom.sendMsgToAll("❌ Kara! " + lastTouchBy.name + " nie potrafi serwować!",
          Colors.LightRed, 'bold');
        this.givePenalty(player.team);
      } else if (lastTouchBy && lastTouchBy.team === player.team && lastTouchBy.id != player.id) {
        this.hbRoom.sendMsgToAll("❌ Kara! " + lastTouchBy.name + " wraz z " + player.name + " nie potrafią serwować!",
          Colors.LightRed, 'bold');
        this.givePenalty(player.team);
      }
      if (lastTouchBy && player.team !== lastTouchBy.team) {
        this.zeroBallGravity();
        this.serveType = ServeType.none;
      }
    } else if (lastTouchBy && lastTouchBy.id === player.id && teamCount > 1 && !this.blocked) {
      this.hbRoom.sendMsgToAll("❌ Kara! " + lastTouchBy.name + " dotknął piłki dwukrotnie!",
        Colors.LightRed, 'bold');
      this.givePenalty(player.team);
    }
    this.blocked = false;
    if (lastTouchBy && lastTouchBy.team === player.team && (currentTime - this.lastPlayerTouchedTime) > 200) {
      ++this.totalTouches;
      if (teamCount > 1) {
        if (this.totalTouches > 3) {
          this.hbRoom.sendMsgToAll(`❌ Kara! O jedno uderzenie (${this.totalTouches}) za wiele…`,
            Colors.LightRed, 'bold');
          this.givePenalty(player.team);
        }
      } else if (this.totalTouches > 3 || (this.twoTouchesOn1vs1 && this.totalTouches > 2)) {
        this.hbRoom.sendMsgToAll(`❌ Kara! O jedno uderzenie (${this.totalTouches}) za wiele…`,
          Colors.LightRed, 'bold');
        this.givePenalty(player.team);
      }
    } else {
      const maxX = justServed ? 50 : 30;
      if (lastTouchBy && player.position && player.position.x >= -maxX && player.position.x <= maxX && player.position.y <= 90) {
        this.totalTouches = 0;
        this.blocked = true;
        if (justServed) {
          this.hbRoom.sendMsgToAll(`❌ Kara! ${player.name} blokuje przy serwowaniu…`,
            Colors.LightRed, 'bold');
          this.givePenalty(player.team);
        } else {
          this.hbRoom.sendMsgToAll(`🏐 Niezły blok, ${player.name}`,
            Colors.LightYellow, 'bold');
        }
      } else {
        this.totalTouches = 1;
      }
    }
    this.lastTouchBy = player;
    this.lastPlayerTouchedTime = currentTime;
    const color = this.getColorByTotalTouches();
    this.hbRoom.room.setDiscProperties(this.ballIdx, { color });
  }

  private getColorByTotalTouches() {
    switch (this.totalTouches) {
      case 0: return 0xF2FFB3;
      case 1: return 0xFF9933;
      case 2: return 0xE64C00;
      default: return 0xCCCCCC;
    }
  }

  handleTeamGoal(team: number) {
    this.servingTeam = team;
  }

  getTeamGoalText(scorer: number, assister: number, ownGoal: number, players: Map<number, PlayerData>) {
    if (ownGoal !== -1) {
      return `🤦 Oj, to bolało! ${players.get(ownGoal)?.name ?? 'GOD'} daje darmowy punkt rywalom!`;
    } else if (assister !== -1) {
      return `🏐 BOOM! ${players.get(scorer)?.name ?? 'GOD'} trafia z pomocą ${players.get(assister)?.name ?? 'GOD'}!`;
    } else {
      return `🏐 Perfekcyjny atak! ${players.get(scorer)?.name ?? 'GOD'} zdobywa punkt!`;
    }
  }

  handlePositionsReset() {
    if (!this.isEnabled()) return;
    this.lastTouchBy = null;
    this.abusingTimeStamp = 0;
    this.blocked = false;
    this.lastPlayerTouchedTime = 0;
    this.totalTouches = 0;
    this.served = false;
    this.serveType = ServeType.none;
    this.gravityEnabled = false;
    this.ballIdx = -1;
  }

  isGameInProgress() {
    return this.hbRoom.auto_bot.isGameInProgress();
  }

  givePenalty(team: number) {
    if (team !== 1 && team !== 2) return;
    let ballIdx = this.getBallIndex();
    if (ballIdx === -1) return;
    this.hbRoom.room.setDiscProperties(ballIdx, { x: team === 1 ? -415 : 415, y: 110, xspeed: 0, yspeed: 10});
  }

  getBallIndex() {
    if (this.ballIdx !== -1) return this.ballIdx;
    let room = this.hbRoom.room;
    // this.ballIdx2 = -1;
    for (let i = 0; i < room.getDiscCount(); ++i) {
      const props = room.getDiscProperties(i);
      if (!props) continue;
      if ((props.cGroup & room.CollisionFlags.ball) != 0) {
        if (this.ballIdx === -1) {
          this.ballIdx = i;
        // } else {
          // this.ballIdx2 = i;
          break;
        }
      }
    }
    return this.ballIdx;
  }

  getZeroedBallPosition() {
    return {
      x: 0, y: 0, xspeed: 0, yspeed: 0, xgravity: 0, ygravity: 0, bCoeff: 0, cGroup: 0, cMask: 0, color: 0,
      damping: 0, invMass: 0, radius: 0
    };
  }
}
function VBLog(txt: string) {
  console.log(`#VOLLEY# ${txt}`);
}