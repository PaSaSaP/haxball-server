import { timeStamp } from "console";
import { Colors } from "./colors";
import { HaxballRoom } from "./hb_room";
import { PlayerData } from "./structs";

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
  private servingTeam: number;
  private served: boolean;
  private justServed: boolean;
  private enabled: boolean;
  private training: boolean;
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
    this.servingTeam = 0;
    this.served = false;
    this.justServed = false;
    this.training = false;
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

  handleServeBy(player: PlayerData) {
    if (!this.enabled) return;
    if (this.training) return;
    if (this.served) return;
    if (player.team != this.servingTeam) return;

    const m = player.team === 1 ? 1 : -1;
    const x = -420 * m;
    const y = 200;
    const xspeed = 1 * m;
    const yspeed = -14;
    const ballIdx = this.getBallIndex();
    this.hbRoom.room.setDiscProperties(ballIdx, { x, y, xspeed, yspeed });
    this.lastTouchBy = player;
    this.justServed = true;
    this.served = true;
  }

  handleGameStart() {
    if (!this.isEnabled()) return;
    this.lastTouchBy = null;
    this.lastBallPosition = this.getZeroedBallPosition();
    this.abusingTimeStamp = 0;
    this.blocked = false;
    this.lastPlayerTouchedTime = 0;
    this.totalTouches = 0;
    this.ballIdx = -1;
    this.servingTeam = 2;
    this.justServed = false;
    this.served = false;
  }

  handleGameStop() {
  }

  handleGameTick(currentTime: number, ballPosition: DiscPropertiesObject) {
    if (!this.isEnabled()) return;
    if (!this.isGameInProgress()) return;
    if (this.training) return;
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
      this.hbRoom.sendMsgToAll(this.getTrainingMessage(), Colors.LightYellow, 'bold');
      return;
    }
    if (!this.isGameInProgress()) return;
    let justServed = this.justServed;
    let teamCount = 0;
    if (redTeam.includes(player.id)) teamCount = redTeam.length;
    else if (blueTeam.includes(player.id)) teamCount = blueTeam.length;
    else return;
    let lastTouchBy = this.lastTouchBy;
    if (this.justServed) {
      if (lastTouchBy && lastTouchBy.id === player.id && this.totalTouches > 0) {
        this.hbRoom.sendMsgToAll("❌ Kara! " + lastTouchBy.name + " nie potrafi serwować!",
          Colors.LightRed, 'bold');
        this.givePenalty(player.team);
      } else if (lastTouchBy && lastTouchBy.team === player.team && lastTouchBy.id != player.id) {
        this.hbRoom.sendMsgToAll("❌ Kara! " + lastTouchBy.name + " wraz z " + player.name + " nie potrafią serwować!",
          Colors.LightRed, 'bold');
        this.givePenalty(player.team);
      }
      if (lastTouchBy && player.team !== lastTouchBy.team) this.justServed = false;
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
      // TODO should blocking be allowed on serve?
      // if (lastTouchBy && player.position.x >= -30 && player.position.x <= 30 && player.position.y <= 10) {
      if (lastTouchBy && player.position.x >= -30 && player.position.x <= 30) {
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
    this.justServed = false;
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
    for (let i = 0; i < room.getDiscCount(); ++i) {
      if ((room.getDiscProperties(i).cGroup & room.CollisionFlags.ball) != 0) {
        this.ballIdx = i;
        break;
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