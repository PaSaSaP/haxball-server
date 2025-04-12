import { Colors } from "./colors";
import { HaxballRoom } from "./hb_room";
import { Distances } from "./possesion_tracker";
import { PlayerData } from "./structs";
import { getTimestampHMS } from "./utils";

enum BallState {
  reset,
  inGame,
}

interface Position {
  x: number;
  y: number;
}

export class Handball {
  private hbRoom: HaxballRoom;
  private C: CollisionFlagsObject;
  private enabled: boolean;
  // private penaltyGiven: boolean;
  private lastBallPosition: DiscPropertiesObject;
  // private ballXDirection: number;
  // private lastTouchingSq: number;
  private ballState: BallState;
  private gravityEnabledFor: number;
  private closerRed: number;
  private closerBlue: number;
  private currentTick: number;
  private static readonly SegmentIdsRed = [0, 1, 2];
  private static readonly SegmentIdsBlue = [3, 4, 5];
  private static readonly CheckDistance = 285;
  private static readonly CheckDistanceBig = 485;
  constructor(hbRoom: HaxballRoom, enabled: boolean = false) {
    this.hbRoom = hbRoom;
    this.C = hbRoom.room.CollisionFlags;
    this.enabled = enabled;
    // this.lastTouchingSq = 0;
    this.ballState = BallState.reset;
    this.gravityEnabledFor = 0;
    // this.penaltyGiven = false;
    this.lastBallPosition = this.getZeroedBallPosition();
    // this.ballXDirection = 0;
    this.closerRed = -1;
    this.closerBlue = -1;
    this.currentTick = 0;
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  handleGameTick(currentTime: number, scores: ScoresObject, ballPosition: DiscPropertiesObject, players: Map<number, PlayerData>, redTeam: number[], blueTeam: number[], distances: Distances) {
    this.currentTick++;
    if (!this.enabled) return;
    if (!this.isGameInProgress()) return;

    let gravitySet = false;
    if (this.ballState === BallState.reset && this.lastBallPosition.x === 0 && ballPosition.x !== 0) {
      // TNLog(`(ballInTeam: ${this.ballInTeam}) Ball position changed from ${this.lastBallPosition.x} to ${ballPosition.x}`);
      this.ballState = BallState.inGame;
    } else if (this.ballState !== BallState.reset) {
        let segments = this.hbRoom.room.getStadiumSegments();
        if (!segments) {
          TNLog(`segments is null`);
        } else if (segments.length < 6) {
          TNLog(`Too low segments (${segments.length})`);
        } else {
          // if (this.currentTick % 60 === 0) TNLog(`got ${segments.length} segments, closerRed(${this.closerRed}) closerBlue(${this.closerBlue})`);
          if (this.closerRed !== -1 && !redTeam.includes(this.closerRed)) this.closerRed = -1;
          if (this.closerBlue !== -1 && !blueTeam.includes(this.closerBlue)) this.closerBlue = -1;
          const CheckDistance = this.hbRoom.last_selected_map_name === 'handball' ? Handball.CheckDistance : Handball.CheckDistanceBig;

          if (this.closerRed === -1) {
            let closerRed = -1;
            let closerRedDist = Infinity;
            redTeam.forEach(pId => {
              let p = players.get(pId)!;
              if (p.position && p.position.x < -CheckDistance) {
                const d = this.getMinDistanceToSegmentRed(segments, p.position);
                if (d < closerRedDist) {
                  closerRed = pId;
                  closerRedDist = d;
                }
              }
            });
            if (closerRedDist !== Infinity) {
              this.closerRed = closerRed;
              this.deleteMaskForRedPlayer(this.closerRed);
            }
          }

          if (this.closerBlue === -1) {
            let closerBlue = -1;
            let closerDistDist = Infinity;
            blueTeam.forEach(pId => {
              let p = players.get(pId)!;
              if (p.position && p.position.x > CheckDistance) {
                const d = this.getMinDistanceToSegmentBlue(segments, p.position);
                if (d < closerDistDist) {
                  closerBlue = pId;
                  closerDistDist = d;
                }
              }
            });
            if (closerDistDist !== Infinity) {
              this.closerBlue = closerBlue;
              this.deleteMaskForBluePlayer(this.closerBlue);
            }
          }

        }
    }

    if (this.gravityEnabledFor) {
      if (!gravitySet || Math.abs(ballPosition.xspeed) < 0.8) {
        this.resetBallGravity();
      }
    }
    // this.ballXDirection = Math.sign(ballPosition.x - this.lastBallPosition.x);
    if (this.ballState !== BallState.reset && ballPosition.x === 0) {
      this.lastBallPosition.x = this.lastBallPosition.x < 0 ? -1e-5 : 1e-5; // do not set to zero but to value close to zero just to keep simple other calculations
      this.lastBallPosition.y = ballPosition.y;
    } else {
      this.lastBallPosition = ballPosition;
    }
  }

  private getMinDistanceToSegmentRed(segments: any[], disc_pos: Position) {
    return this.getMinDistanceToSegment(segments, 0, 3, disc_pos);
  }

  private getMinDistanceToSegmentBlue(segments: any[], disc_pos: Position) {
    return this.getMinDistanceToSegment(segments, 3, 6, disc_pos);
  }

  private getMinDistanceToSegment(segments: any[], startIdx: number, endIdx: number, disc_pos: Position) {
    let min = Infinity;
    try {
      for (let i = startIdx; i < endIdx; ++i) {
        const s = segments[i];
        let d = this.distanceToRoundedSegmentChecked(disc_pos, s.F.a, s.K.a, s.Ha);
        if (d < min) min = d;
      }
      return min;
    } catch (e) {
      TNLog(`getMinDistanceToSegmentRed error: ${e}`);
      return Infinity;
    }
  }

  private distanceToRoundedSegmentChecked(disc_pos: Position, seg_a: Position, seg_b: Position, segment_radius: number) {
    try {
      return this.distanceToRoundedSegment(disc_pos, seg_a, seg_b, segment_radius);
    } catch (e) {
      TNLog(`distance error: ${e}`);
      return Infinity;
    }
  }

  private distanceToRoundedSegment(disc_pos: Position, seg_a: Position, seg_b: Position, segment_radius: number) {
    const dx = seg_b.x - seg_a.x;
    const dy = seg_b.y - seg_a.y;

    const seg_len_squared = dx * dx + dy * dy;
    if (seg_len_squared === 0) {
      // Zdegenerowany odcinek (punkt)
      const dx0 = disc_pos.x - seg_a.x;
      const dy0 = disc_pos.y - seg_a.y;
      return Math.sqrt(dx0 * dx0 + dy0 * dy0) - segment_radius;
    }

    // Projekcja punktu na linię
    let t = ((disc_pos.x - seg_a.x) * dx + (disc_pos.y - seg_a.y) * dy) / seg_len_squared;
    t = Math.max(0, Math.min(1, t));

    const closest_x = seg_a.x + t * dx;
    const closest_y = seg_a.y + t * dy;

    const dist_x = disc_pos.x - closest_x;
    const dist_y = disc_pos.y - closest_y;

    const dist = Math.sqrt(dist_x * dist_x + dist_y * dist_y);
    return dist - segment_radius;
  }

  private distanceToRoundedSegmentV2(
    disc_pos: Position,
    seg_a: Position,
    seg_b: Position,
    segment_radius: number
  ): number {
    const dx = seg_b.x - seg_a.x;
    const dy = seg_b.y - seg_a.y;

    const seg_len_squared = dx * dx + dy * dy;
    if (seg_len_squared === 0) {
      const dx0 = disc_pos.x - seg_a.x;
      const dy0 = disc_pos.y - seg_a.y;
      return Math.sqrt(dx0 * dx0 + dy0 * dy0) - segment_radius;
    }

    // Projekcja punktu na odcinek
    let t = ((disc_pos.x - seg_a.x) * dx + (disc_pos.y - seg_a.y) * dy) / seg_len_squared;
    t = Math.max(0, Math.min(1, t));

    const closest_x = seg_a.x + t * dx;
    const closest_y = seg_a.y + t * dy;

    const dist_x = disc_pos.x - closest_x;
    const dist_y = disc_pos.y - closest_y;
    const dist = Math.sqrt(dist_x * dist_x + dist_y * dist_y);

    // Wyznacz znak na podstawie iloczynu wektorowego
    const to_disc_x = disc_pos.x - seg_a.x;
    const to_disc_y = disc_pos.y - seg_a.y;
    const cross = dx * to_disc_y - dy * to_disc_x;

    const sign = cross < 0 ? -1 : 1;

    return sign * (dist - segment_radius);
  }

  private setBallGravity(ballPosition: DiscPropertiesObject) {
    const XGravity = 0.04;
    const xgravity = ballPosition.xspeed >= 0 ? -XGravity : XGravity;
    this.hbRoom.room.setDiscProperties(0, { xgravity: xgravity });
  }

  private resetBallGravity() {
    this.hbRoom.room.setDiscProperties(0, { xgravity: 0 });
    this.gravityEnabledFor = 0;
    // TNLog(`ballState gravity reset`);
  }

  private deleteMaskForRedPlayer(playerId: number) {
    return this.deleteMaskForPlayer(playerId, this.C.c0);
  }
  private deleteMaskForBluePlayer(playerId: number) {
    return this.deleteMaskForPlayer(playerId, this.C.c1);
  }

  private deleteMaskForPlayer(playerId: number, cg: number) {
    const props = this.hbRoom.room.getPlayerDiscProperties(playerId);
    if (!props) {
      return;
    }
    const cGroup = props.cGroup & ~cg;
    this.hbRoom.room.setPlayerDiscProperties(playerId, { cGroup });
    // TNLog(`Zmieniam cgroup del dla ${playerId} z ${props.cGroup} na ${cGroup}`);
  }

  // private setMaskForRedPlayer(playerId: number) {
  //   const C = this.C;
  //   const props = this.hbRoom.room.getPlayerDiscProperties(playerId);
  //   if (!props) {
  //     return;
  //   }
  //   const cGroup = props.cGroup | C.c0;
  //   this.hbRoom.room.setPlayerDiscProperties(playerId, { cGroup });
  //   TNLog(`Zmieniam cgroup set dla ${playerId} z ${props.cGroup} na ${cGroup}`);
  // }

  private setMaskForPlayer(playerId: number) {
    const C = this.C;
    const props = this.hbRoom.room.getPlayerDiscProperties(playerId);
    if (!props) {
      // TNLog(`setMaskForPlayer(${playerId}) nie ma props`);
      return;
    }
    const cGroup = props.cGroup | C.c0 | C.c1;
    this.hbRoom.room.setPlayerDiscProperties(playerId, { cGroup });
    // TNLog(`Zmieniam mask dla ${playerId} z ${props.cGroup} na ${cGroup}`);
  }

  handlePlayerTeamChange(playerExt: PlayerData) {
    // TNLog(`handlePlayerTeamChange`);
    if (!this.isEnabled()) return;
    if (!playerExt.team) return;
    this.setMaskForPlayer(playerExt.id);
  }

  handleGameStart(redTeam: number[], blueTeam: number[]) {
    if (!this.isEnabled()) return;
    // this.lastTouchingSq = 1000;
    this.ballState = BallState.reset;
    this.gravityEnabledFor = 0;
    // this.penaltyGiven = false;
    this.lastBallPosition = this.getZeroedBallPosition();
    // this.ballXDirection = 0;
    this.closerRed = -1;
    this.closerBlue = -1;
    redTeam.concat(blueTeam).forEach(playerId => {
      this.setMaskForPlayer(playerId);
    });
  }

  handlePositionsReset(redTeam: PlayerData[], blueTeam: PlayerData[]) {
    if (!this.isEnabled()) return;
    // this.lastTouchingSq = 1000;
    this.ballState = BallState.reset;
    this.gravityEnabledFor = 0;
    // this.penaltyGiven = false;
    this.lastBallPosition = this.getZeroedBallPosition();
    // this.ballXDirection = 0;
    this.closerRed = -1;
    this.closerBlue = -1;
    redTeam.concat(blueTeam).forEach(player => {
      this.setMaskForPlayer(player.id);
    });
  }

  handlePlayerBallKick(currentTime: number, player: PlayerData, redTeam: number[], blueTeam: number[]) {
    // if (!this.isEnabled()) return;
    // if (this.ballState === BallState.reset) return;
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
    // this.penaltyGiven = true;
  }

  private getZeroedBallPosition() {
    return {
      x: 0, y: 0, xspeed: 0, yspeed: 0, xgravity: 0, ygravity: 0, bCoeff: 0, cGroup: 0, cMask: 0, color: 0,
      damping: 0, invMass: 0, radius: 0
    };
  }
}

function TNLog(txt: string) {
  console.log(`[${getTimestampHMS()}] #HAND# ${txt}`);
}
