import { Colors } from "./colors";
import { HaxballRoom } from "./hb_room";
import { Distances } from "./possesion_tracker";
import { PlayerData } from "./structs";
import { getTimestampHMS } from "./utils";

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
  private ballXDirection: number;
  private lastTouchingSq: number;
  private ballState: BallState;
  private gravityEnabledFor: number;
  private static MaxTimeHoldingBall = 10; // seconds
  private static MaxTimeForMatch = 150; // seconds
  private static GravityEnabled = false;
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
    this.gravityEnabledFor = 0;
    this.penaltyGiven = false;
    // this.lastTouchBy = null;
    this.lastBallPosition = this.getZeroedBallPosition();
    this.ballXDirection = 0;
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  setTourneyMode(enabled: boolean) {
    if (enabled) {
      this.setMaxTimeHoldingBall(20);
      this.setMaxTimeForMatch(30 * 60);
      Tennis.GravityEnabled = false;
    } else {
      this.setMaxTimeHoldingBall(10);
      this.setMaxTimeForMatch(150);
      Tennis.GravityEnabled = true;
    }
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

    let gravitySet = false;
    if (this.ballState === BallState.reset && this.lastBallPosition.x === 0 && ballPosition.x !== 0) {
      // TNLog(`(ballInTeam: ${this.ballInTeam}) Ball position changed from ${this.lastBallPosition.x} to ${ballPosition.x}`);
      this.ballInTeam = ballPosition.x < 0 ? 1 : 2;
      this.ballInTeamFromTime = scores.time;
      // this.lastTouchTime = scores.time;
      this.totalTouchesInTeam = 0;
      this.ballState = BallState.inGame;
    } else if (this.ballInTeamFromTime > 0 && scores.time - this.ballInTeamFromTime > Tennis.MaxTimeHoldingBall) {
      this.hbRoom.sendMsgToAll("❌ Kara! Zbyt długie przetrzymywanie piłki podczas gry!",
        Colors.LightRed, 'bold');
      this.ballInTeam = ballPosition.x < 0 ? 1 : 2;
      // TNLog(`Kara dla drużyny ${this.ballInTeam} za przetrzymywanie piłki!`);
      this.givePenalty(this.ballInTeam);
      this.ballInTeamFromTime = 0;
    } else if (this.totalTouchesInTeam > 1) {
      this.hbRoom.sendMsgToAll("❌ Kara! Zbyt wiele dotknięć piłki w drużynie!",
        Colors.LightRed, 'bold');
      // TNLog(`Kara dla drużyny ${this.ballInTeam} za zbyt wiele dotknięć piłki!`);
      this.givePenalty(this.ballInTeam);
      this.totalTouchesInTeam = 0;
    } else if (!this.penaltyGiven && this.ballState !== BallState.reset) {
      if (scores.time > Tennis.MaxTimeForMatch) {
        this.hbRoom.sendMsgToAll("❌ Kara! Za przedłuzanie meczu!",
          Colors.LightRed, 'bold');
        this.givePenalty(1);
      } else {
        if (distances.distances.length === 0) return;
        const closestPlayerId = distances.distances[0][0];
        const closestDistanceSq = distances.distances[0][1];
        if (this.ballState === BallState.kicked) {
          this.ballState = BallState.movingFromPlayer;
          this.lastTouchTime = scores.time;
          // TNLog(`ballState (ballInTeam: ${this.ballInTeam}) kicked => movingFromPlayer(${closestPlayerId})`);
        } else if (this.ballState === BallState.movingFromPlayer) {
          if (closestDistanceSq > distances.touchingSq) {
            this.ballState = BallState.inGame;
            // TNLog(`ballState (ballInTeam: ${this.ballInTeam}) movingFromPlayer => inGame(${closestPlayerId})`);
          } else if (closestDistanceSq < this.lastTouchingSq && scores.time - this.lastTouchTime > 0.2) {
            this.ballState = BallState.movingToPlayer;
            // TNLog(`ballState (ballInTeam: ${this.ballInTeam}) movingFromPlayer => movingToPlayer(${closestPlayerId})`);
          }
          const keys = this.hbRoom.room.getPlayerInput(closestPlayerId);
          if (keys & 16) {
            this.setBallGravity(ballPosition);
            gravitySet = true;
            this.gravityEnabledFor = 1;
            // TNLog(`ballState gravity up:`);
          }
        } else if (this.ballState === BallState.movingToPlayer) {
          // if (this.lastTouchingSq < distances.touchingSq && closestDistanceSq > this.lastTouchingSq) {
          if (closestDistanceSq > this.lastTouchingSq) {
            this.ballState = BallState.kicked;
            // TNLog(`ballState (ballInTeam: ${this.ballInTeam}) movingToPlayer => kicked(${closestPlayerId}),`
              // + ` totalTouches(${this.totalTouchesInTeam}) lastPlayer(${this.lastTouchByPlayerId})`);
            const redPlayer = redTeam.includes(closestPlayerId);
            const bluePlayer = !redPlayer;
            if ((this.ballInTeam === 1 && bluePlayer) || (this.ballInTeam === 2 && redPlayer)) {
              this.totalTouchesInTeam = 0;
              this.ballInTeam = redPlayer ? 1 : 2;
              this.ballInTeamFromTime = scores.time;
              // TNLog(`Drużyna ${this.ballInTeam} (${closestPlayerId}) dotknęła piłkę pierwszy raz na tej połowie! Poprzedni dotyk(${this.lastTouchByPlayerId})`);
            }
            this.totalTouchesInTeam++;
            this.lastTouchByPlayerId = closestPlayerId;
            if (this.totalTouchesInTeam > 1) {
              this.hbRoom.sendMsgToAll("❌ Kara! Zbyt wiele dotknięć piłki w drużynie!",
                Colors.LightRed, 'bold');
              // TNLog(`Kara dla drużyny ${this.ballInTeam} za zbyt wiele dotknięć piłki!`);
              this.givePenalty(this.ballInTeam);
              this.totalTouchesInTeam = 0;
            }
          }
        } else if (this.ballState === BallState.inGame) {
          if (closestDistanceSq < distances.touchingSq) {
            this.ballState = BallState.movingToPlayer;
            // TNLog(`ballState (ballInTeam: ${this.ballInTeam}) inGame => movingToPlayer(${closestPlayerId})`);
          } else {
            const xDirection = Math.sign(ballPosition.x - this.lastBallPosition.x);
            if (this.ballXDirection !== 0 && xDirection !== 0 && xDirection !== this.ballXDirection) {
              this.hbRoom.sendMsgToAll("❓Aj waj, nie wykryto kopnięcia, a boisko się zatrzęsło, resetujemy licznik kopnięć!",
                Colors.DarkRed, 'bold');
              // TNLog(`Piłka zmieniła X kierunek, prawdopodobnie nie wykryte kopnięcie, więc resetujemy totalTouches`
                // + ` i ballInTeamForTime, closest(${closestPlayerId}, ${closestDistanceSq})`);
              this.totalTouchesInTeam = 0;
              this.ballInTeamFromTime = scores.time;
            } else if (this.gravityEnabledFor > 0 && this.gravityEnabledFor < 60) {
              gravitySet = true;
              this.gravityEnabledFor++;
            }
          }
        }

        this.lastTouchingSq = closestDistanceSq;
      }
    }
    if (this.gravityEnabledFor) {
      if (!gravitySet || Math.abs(ballPosition.xspeed) < 0.8) {
        this.resetBallGravity();
      }
    }
    if (this.ballState !== BallState.reset) {
      const dx = this.lastBallPosition.x - ballPosition.x;
      const dy = this.lastBallPosition.y - ballPosition.y;
      this.setBallColor(dx*dx+dy*dy);
    }
    this.ballXDirection = Math.sign(ballPosition.x - this.lastBallPosition.x);
    if (this.ballState !== BallState.reset && ballPosition.x === 0) {
      this.lastBallPosition.x = this.lastBallPosition.x < 0 ? -1e-5 : 1e-5; // do not set to zero but to value close to zero just to keep simple other calculations
      this.lastBallPosition.y = ballPosition.y;
    } else {
      this.lastBallPosition = ballPosition;
    }
  }

  private setBallColor(ball_speed_sq: number) {
    const clamp = (v: number) => v < 0 ? 0 : v > 100 ? 100 : v;
    const t_sq = clamp(ball_speed_sq); // 0–100
    const t = t_sq / 100;
    // Żółty: RGB(224, 222, 95), Czerwony: RGB(224, 56, 22)
    const g = 222 - Math.round((222 - 56) * t);
    const b = 95 - Math.round((95 - 22) * t);
    const color = (224 << 16) | (g << 8) | b;
    this.hbRoom.room.setDiscProperties(0, { color });
  }

  private setBallGravity(ballPosition: DiscPropertiesObject) {
    if (!Tennis.GravityEnabled) return;
    const XGravity = 0.04;
    const xgravity = ballPosition.xspeed >= 0 ? -XGravity : XGravity;
    this.hbRoom.room.setDiscProperties(0, { xgravity: xgravity });
  }

  private resetBallGravity() {
    if (!Tennis.GravityEnabled) return;
    this.hbRoom.room.setDiscProperties(0, { xgravity: 0 });
    this.gravityEnabledFor = 0;
    // TNLog(`ballState gravity reset`);
  }

  handleGameStart() {
    this.totalTouchesInTeam = 0;
    this.lastTouchTime = 0;
    this.ballInTeam = 0;
    this.lastTouchByPlayerId = -1;
    this.ballInTeamFromTime = 0;
    this.lastTouchingSq = 1000;
    this.ballState = BallState.reset;
    this.gravityEnabledFor = 0;
    this.penaltyGiven = false;
    this.lastBallPosition = this.getZeroedBallPosition();
    this.ballXDirection = 0;
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
    this.gravityEnabledFor = 0;
    this.penaltyGiven = false;
    this.lastBallPosition = this.getZeroedBallPosition();
    this.ballXDirection = 0;
  }

  handlePlayerBallKick(currentTime: number, player: PlayerData, redTeam: number[], blueTeam: number[]) {
    if (!this.isEnabled()) return;
    if (this.ballState === BallState.reset) return;
    if (player.team === 0) return;
    // TNLog(`handlePlayerBallKick (ballInTeam: ${this.ballInTeam}) Player ${player.name} kopnął piłkę!`);
    if (this.lastTouchByPlayerId === player.id && this.ballState !== BallState.kicked && this.ballState !== BallState.movingFromPlayer) {
      // TNLog(`handlePlayerBallKick (ballInTeam: ${this.ballInTeam}) Player ${player.name} kopnął piłkę ponownie!`);
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
      this.totalTouchesInTeam = 0;
      // TNLog(`handlePlayerBallKick (ballInTeam: ${this.ballInTeam}) Player ${player.name} kopnął z X pierwszy raz u siebie!`);
    }
    this.totalTouchesInTeam++;
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
  console.log(`[${getTimestampHMS()}] #TENNIS# ${txt}`);
}
