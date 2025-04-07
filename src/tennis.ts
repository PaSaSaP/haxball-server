import { Colors } from "./colors";
import { HaxballRoom } from "./hb_room";
import { Distances } from "./possesion_tracker";
import { PlayerData } from "./structs";

enum BallState {
  reset,
  inGame,
  movingToPlayer,
  kicked,
  movingFromPlayer,
}

export class Tennis {
  private hbRoom: HaxballRoom;
  private enabled: boolean;
  private totalTouchesInTeam: number;
  private lastTouchTime: number;
  private ballInTeam: 0 | 1 | 2;
  private lastTouchByPlayerId: number;
  private ballInTeamFromTime: number; // game time, in seconds
  private penaltyGiven: boolean;
  private lastBallPosition: DiscPropertiesObject;
  private lastTouchingSq: number;
  private ballState: BallState;
  private static MaxTimeHoldingBall = 10; // seconds
  private static MaxTimeForMatch = 120; // seconds
  constructor(hbRoom: HaxballRoom, enabled: boolean = false) {
    this.hbRoom = hbRoom;
    this.enabled = enabled;
    this.totalTouchesInTeam = 0;
    this.lastTouchTime = 0;
    this.ballInTeam = 0;
    this.lastTouchByPlayerId = -1;
    this.ballInTeamFromTime = 0;
    this.lastTouchingSq = 0;
    this.ballState = BallState.reset;
    this.penaltyGiven = false;
    // this.lastTouchBy = null;
    this.lastBallPosition = this.getZeroedBallPosition();
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  setMaxTimeHoldingBall(maxTime: number) {
    if (maxTime < 0) {
      TNLog("Max time holding ball cannot be negative!");
      return;
    }
    Tennis.MaxTimeHoldingBall = maxTime;
    TNLog(`Max time holding ball set to ${maxTime} seconds`);
  }

  setMaxTimeForMatch(maxTime: number) {
    if (maxTime < 0) {
      TNLog("Max time for match cannot be negative!");
      return;
    }
    Tennis.MaxTimeForMatch = maxTime;
    TNLog(`Max time for match set to ${maxTime} seconds`);
  }

  handleGameTick(currentTime: number, scores: ScoresObject, ballPosition: DiscPropertiesObject, redTeam: number[], blueTeam: number[], distances: Distances) {
    if (!this.enabled) return;
    if (!this.isGameInProgress()) return;

    if (this.ballState !== BallState.reset && (ballPosition.x * this.lastBallPosition.x < 0)) {
      this.ballInTeamFromTime = scores.time;
    }

    if (this.ballState === BallState.reset && this.lastBallPosition.x === 0 && ballPosition.x !== 0) {
      TNLog(`Ball position changed from ${this.lastBallPosition.x} to ${ballPosition.x}`);
      this.ballInTeam = ballPosition.x < 0 ? 1 : 2;
      this.ballInTeamFromTime = scores.time;
      // this.lastTouchTime = scores.time;
      this.totalTouchesInTeam = 0;
      this.ballState = BallState.inGame;
    } else if (this.ballInTeamFromTime > 0 && scores.time - this.ballInTeamFromTime > Tennis.MaxTimeHoldingBall) {
      this.hbRoom.sendMsgToAll("❌ Kara! Zbyt długie przetrzymywanie piłki podczas gry!",
        Colors.LightRed, 'bold');
      this.ballInTeam = ballPosition.x < 0 ? 1 : 2;
      TNLog(`Kara dla drużyny ${this.ballInTeam} za przetrzymywanie piłki!`);
      this.givePenalty(this.ballInTeam);
      this.ballInTeamFromTime = 0;
    } else if (this.totalTouchesInTeam > 1) {
      this.hbRoom.sendMsgToAll("❌ Kara! Zbyt wiele dotknięć piłki w drużynie!",
        Colors.LightRed, 'bold');
      TNLog(`Kara dla drużyny ${this.ballInTeam} za zbyt wiele dotknięć piłki!`);
      this.givePenalty(this.ballInTeam);
      this.totalTouchesInTeam = 0;
    } else if (!this.penaltyGiven && this.ballState !== BallState.reset) {
      if (scores.time > Tennis.MaxTimeForMatch && scores.blue === scores.red) {
        this.hbRoom.sendMsgToAll("❌ Kara! Za przedłuzanie meczu!",
          Colors.LightRed, 'bold');
        this.givePenalty(this.ballInTeam);
      } else {
        if (distances.distances.length === 0) return;
        const closestPlayerId = distances.distances[0][0];
        const closestDistanceSq = distances.distances[0][1];
        if (this.ballState === BallState.kicked) {
          this.ballState = BallState.movingFromPlayer;
          this.lastTouchTime = scores.time;
          TNLog(`ballState kicked => movingFromPlayer(${closestPlayerId})`);
        } else if (this.ballState === BallState.movingFromPlayer) {
          if (closestDistanceSq > distances.touchingSq) {
            this.ballState = BallState.inGame;
            TNLog(`ballState movingFromPlayer => inGame(${closestPlayerId})`);
          } else if (closestDistanceSq < this.lastTouchingSq && scores.time - this.lastTouchTime > 0.2) {
            this.ballState = BallState.movingToPlayer;
            TNLog(`ballState movingFromPlayer => movingToPlayer(${closestPlayerId})`);
          }
        } else if (this.ballState === BallState.movingToPlayer) {
          if (this.lastTouchingSq < distances.touchingSq && closestDistanceSq > this.lastTouchingSq) {
            this.ballState = BallState.kicked;
            TNLog(`ballState movingToPlayer => kicked(${closestPlayerId}), ballInTeam(${this.ballInTeam}) totalTouches(${this.totalTouchesInTeam}) lastPlayer(${this.lastTouchByPlayerId})`);
            const redPlayer = redTeam.includes(closestPlayerId);
            const bluePlayer = !redPlayer;
            if ((this.ballInTeam === 1 && bluePlayer) || (this.ballInTeam === 2 && redPlayer)) {
              TNLog(`Drużyna ${this.ballInTeam} (${this.lastTouchByPlayerId}) dotknęła piłkę, piłka po stronie przeciwnika!`);
              this.totalTouchesInTeam = 0;
              this.ballInTeam = redPlayer ? 1 : 2;
              this.ballInTeamFromTime = scores.time;
            }
            this.totalTouchesInTeam++;
            this.lastTouchByPlayerId = closestPlayerId;
            if (this.totalTouchesInTeam > 1) {
              this.hbRoom.sendMsgToAll("❌ Kara! Zbyt wiele dotknięć piłki w drużynie!",
                Colors.LightRed, 'bold');
              TNLog(`Kara dla drużyny ${this.ballInTeam} za zbyt wiele dotknięć piłki!`);
              this.givePenalty(this.ballInTeam);
              this.totalTouchesInTeam = 0;
            }
          }
        } else if (this.ballState === BallState.inGame) {
          if (closestDistanceSq < distances.touchingSq) {
            this.ballState = BallState.movingToPlayer;
            TNLog(`ballState inGame => movingToPlayer(${closestPlayerId})`);
          }
        }

        this.lastTouchingSq = closestDistanceSq;
      }
    }
    if (this.ballState !== BallState.reset && ballPosition.x === 0) {
      this.lastBallPosition.x = this.lastBallPosition.x < 0 ? -1e-5 : 1e-5; // do not set to zero but to value close to zero just to keep simple other calculations
      this.lastBallPosition.y = ballPosition.y;
    } else {
      this.lastBallPosition = ballPosition;
    }
  }

  handleGameStart() {
    this.totalTouchesInTeam = 0;
    this.lastTouchTime = 0;
    this.ballInTeam = 0;
    this.lastTouchByPlayerId = -1;
    this.ballInTeamFromTime = 0;
    this.lastTouchingSq = 1000;
    this.ballState = BallState.reset;
    this.penaltyGiven = false;
    this.lastBallPosition = this.getZeroedBallPosition();
  }

  handlePositionsReset() {
    if (!this.isEnabled()) return;
    this.totalTouchesInTeam = 0;
    this.lastTouchTime = 0;
    this.ballInTeam = 0;
    this.lastTouchByPlayerId = -1;
    this.ballInTeamFromTime = 0;
    this.lastTouchingSq = 1000;
    this.ballState = BallState.reset;
    this.penaltyGiven = false;
    this.lastBallPosition = this.getZeroedBallPosition();
  }

  handlePlayerBallKick(currentTime: number, player: PlayerData, redTeam: number[], blueTeam: number[]) {
    if (!this.isEnabled()) return;
    if (this.ballState === BallState.reset) return;
    TNLog(`Player ${player.name} kicked the ball!`);
    if (player.team === 0) return;
    if (this.lastTouchByPlayerId === player.id) {
      TNLog(`Player ${player.name} kicked the ball again!`);
      this.hbRoom.sendMsgToAll(`❌ Kara! ${player.name} drugi raz próbuje przebić piłkę na połowę przeciwnika!`,
        Colors.LightRed, 'bold');
      this.givePenalty(player.team);
      this.totalTouchesInTeam = 0;
      return;
    }
    this.lastTouchByPlayerId = player.id;
    this.ballState = BallState.kicked;
    if (player.team !== this.ballInTeam) {
      this.ballInTeam = player.team as 1 | 2;
      this.totalTouchesInTeam = 1;
    } else {
      this.totalTouchesInTeam++;
    }
  }

  handleTeamGoal(team: 0 | 1 | 2) {
    this.ballState = BallState.reset;
  }

  isGameInProgress() {
    return this.hbRoom.auto_bot.isGameInProgress();
  }

  private givePenalty(team: number) {
    if (team !== 1 && team !== 2) return;
    let ballIdx = 0;
    this.hbRoom.room.setDiscProperties(ballIdx, { x: team === 1 ? -250 : 250, y: 250, xspeed: 0, yspeed: 2 });
    this.penaltyGiven = true;
  }

  private getZeroedBallPosition() {
    return {
      x: 0, y: 0, xspeed: 0, yspeed: 0, xgravity: 0, ygravity: 0, bCoeff: 0, cGroup: 0, cMask: 0, color: 0,
      damping: 0, invMass: 0, radius: 0
    };
  }
}

function TNLog(txt: string) {
  console.log(`#TENNIS# ${txt}`);
}
