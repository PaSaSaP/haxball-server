import * as fs from 'fs/promises';
import { PlayerData } from './structs';
import { HaxballRoom } from './hb_room';
import { getIpInfoFromMonitoring } from './ip_info';
import { Colors } from './colors';

export class PlayerJoinLogger {
  hbRoom: HaxballRoom;
  filename: string;
  positions: Map<number, [number, number, number][]>;
  ballPositions: [number, number, number][];
  positionsEnabled = false;
  monitoredPlayers: PlayerData[];
  constructor(hbRoom: HaxballRoom) {
    this.hbRoom = hbRoom;
    this.filename = `./dynamic/connected_players_${hbRoom.room_config.selector}_${hbRoom.room_config.subselector}.csv`;
    this.positions = new Map();
    this.monitoredPlayers = [];
    this.ballPositions = [];
    if (this.hbRoom.room_config.selector === '3vs3') this.positionsEnabled = true;
  }

  r() {
    return this.hbRoom.room;
  }

  startMonitoring(player: PlayerData) {
    player.monitor_enabled = true;
    this.monitoredPlayers.push(player);
    MONLog(`CMD start for ${player.name}`);
    this.r().startMonitorInput(player.id);
  }

  stopMonitoring(player: PlayerData) {
    this.monitoredPlayers = this.monitoredPlayers.filter(e => e.id != player.id);
    MONLog(`CMD stop for ${player.name}`);
  }

  pos(player: PlayerData) {
    return this.r().getPlayerDiscProperties(player.id);
  }

  handlePlayerJoin(playerExt: PlayerData) {
    // there is still zero trust level, is not set
    const now = new Date().toISOString();
    this.appendLineToFile(this.filename, `${now},${playerExt.auth_id},${playerExt.conn_id},${playerExt.real_ip},${playerExt.name}`);
    this.hbRoom.game_state.probableBotExists(playerExt.auth_id, playerExt.conn_id).then((isBot) => {
      if (isBot) {
        playerExt.bot = true;
        playerExt.monitor_enabled = true;
        MONLog(`BOT AT ${now} WITH NAME: ${playerExt.name} AUTH: ${playerExt.auth_id} CONN: ${playerExt.conn_id} IP: ${playerExt.real_ip}`);
      }
    }).catch((e) => MONLog(`!! probableBotExists error ${e}`));
    if (playerExt.trust_level < 2) {
      this.startMonitoring(playerExt);
    }
  }

  async handlePlayerJoinWithIp(playerExt: PlayerData, players: Map<number, PlayerData>) {
    if (playerExt.trust_level < 2) {
      try {
        const ip = playerExt.real_ip.split(',').at(-1)?.trim() ?? '';
        let ipInfo = await getIpInfoFromMonitoring(ip);
        if (!ipInfo) return;
        MONLog(`IP ${playerExt.name} => ${ip} => ${ipInfo.country}, ${ipInfo.city}, ${ipInfo.isp}, ${ipInfo.hostname}`);
        if (ipInfo.hostname.length === 0) return;
        for (let hostname of ipInfo.hostname) {
          if (PlayerJoinLogger.MobileInternetHostnames.some(e => hostname.includes(e))) {
            const txt = `Do pokoju dołączył ${playerExt.name} [${playerExt.id}] prawdopodobnie z mobilnego internetu.`;
            players.forEach(player => {
              if (player.id !== playerExt.id && player.discord_user && player.discord_user.state) {
                this.hbRoom.sendMsgToPlayer(player,txt, Colors.BrightGreen, 'bold', 2);
              }
            })
          }
        }
      } catch (e) {
        MONLog(`!! getIpInfoFromMonitoring error ${e}`);
      }
    }
  }

  handlePlayerLeave(playerExt: PlayerData) {
    this.monitoredPlayers = this.monitoredPlayers.filter(e => e.id != playerExt.id);
  }

  handleGameTick(currentTime: number, players: PlayerData[]) {
    if (!this.positionsEnabled && !this.hbRoom.bot_stopping_enabled) return;
    const ball = this.r().getBallPosition();
    if (ball) {
      this.ballPositions.push([currentTime, ball.x, ball.y]);
    }
    for (let player of players) {
      // if (!player.monitor_enabled) continue;
      // if (player.trust_level) continue; // person
      // if (player.bot) continue; // currently discovered
      // save for all players so we can compare players vs bots
      const pos = this.pos(player);
      if (!pos) continue;
      if (this.positionsEnabled && player.monitor_enabled) {
        if (!this.positions.has(player.id)) this.positions.set(player.id, [[currentTime, -180, 0]]);
        let positions = this.positions.get(player.id)!;
        const last_pos = positions.at(-1)!;
        const new_pos: [number, number, number] = [currentTime, pos.x, pos.y];
        const dx = last_pos[0] - new_pos[0];
        const dy = last_pos[1] - new_pos[1];
        if (dx * dx + dy * dy > 0.0001) {
          positions.push(new_pos);
        }
      }

      if (this.hbRoom.bot_stopping_enabled && player.bot  && Math.random() < 0.005) {
        this.hbRoom.room.setPlayerDiscProperties(player.id, { "xspeed": -pos.xspeed*2, "yspeed": -pos.yspeed*2 });
      }
    }
  }

  handleGameStart() {
    this.positions.clear();
    this.ballPositions.length = 0;
    MONLog(`handleGameStart IDs ${this.monitoredPlayers.map(e=>e.name).join(',')}`);
    this.monitoredPlayers.forEach(player => {
      player.monitor_enabled = true;
      this.r().startMonitorInput(player.id);
    });
  }

  handleGameStop() {
    if (!this.positionsEnabled) return;
    const fullSelector = `${this.hbRoom.room_config.selector}-${this.hbRoom.room_config.subselector}`;
    const now = new Date();
    const formattedDate = now.toISOString()
      .replace(/T/, '-')  // Zastępuje 'T' spacją
      .replace(/\..+/, '') // Usuwa milisekundy i strefę czasową
      .replace(/:/g, '-'); // Zamienia ":" na "-"

    const fnameBall = `./dynamic/ball_positions/${fullSelector}-${formattedDate}.csv`;
    this.saveTupleArrayToCsv(fnameBall, this.ballPositions);
    for (let [playerId, positions] of this.positions) {
      if (positions.length < 1000) continue; // too low data to analyze
      let player = this.hbRoom.Pid(playerId);
      const fname = `./dynamic/positions/${fullSelector}-${formattedDate}-${player.auth_id}-${player.conn_id}.csv`;
      this.saveTupleArrayToCsv(fname, positions);
      if (player.monitor_enabled) {
        let data = this.r().endMonitorInput(player.id);
        if (data && data.length) {
          const fname = `./dynamic/inputs/${fullSelector}-${formattedDate}-${player.auth_id}-${player.conn_id}.csv`;
          this.saveTupleArrayToCsv2(fname, data);
        }
        player.monitor_enabled = false;
      }
    }
    MONLog(`BOT zapisałem pliki dla ${this.positions.size}`);
  }

  async saveTupleArrayToCsv(fileName: string, data: [number, number, number][]): Promise<void> {
    try {
      const csv = data.map(row =>
        `${row[0]},${row[1].toFixed(2)},${row[2].toFixed(2)}`
      ).join("\n");
      await fs.writeFile(fileName, csv, 'utf-8');
    } catch (error) {
      MONLog(`Błąd podczas zapisywania CSV do pliku ${fileName}: ${error}`);
    }
  }

  async saveTupleArrayToCsv2(fileName: string, data: [number, number][]): Promise<void> {
    try {
      const csv = data.map(row => row.join(",")).join("\n");
      await fs.writeFile(fileName, csv, 'utf-8');
    } catch (error) {
      MONLog(`Błąd podczas zapisywania CSV do pliku ${fileName}: ${error}`);
    }
  }

  async appendLineToFile(filePath: string, line: string): Promise<void> {
    try {
      await fs.appendFile(filePath, line + '\n');
    } catch (error) {
      MONLog(`Błąd podczas zapisywania do pliku ${filePath}: ${error}`);
    }
  }

  private static MobileInternetHostnames: string[] = [
    // Orange
    'mobile.orange.pl',
    'mobile.ipv4.orange.pl',
    'dynamic.gprs.orange.pl',
    'dynamic.lte.orange.pl',
    'nat.orange.pl',
    'ipv4.supernova.orange.pl', // uwaga: może być też stacjonarny

    // Play
    'nat.play-internet.pl',
    'apn.play-internet.pl',
    'dynamic.play-internet.pl',

    // Plus
    'dynamic.gprs.plus.pl',
    'nat.plusgsm.pl',
    'mobile.plus.pl',

    // T-Mobile
    'dynamic.gprs.t-mobile.pl',
    'nat.t-mobile.pl',
    'mobile.t-mobile.pl',

    // Aero2 (część Plusa)
    'nat.aero2.pl',

    // Multimedia (czasami LTE przez mobilnych MVNO)
    'nat.multimedia.pl',

    // Ogólne wzorce z nazw dynamicznych
    'dynamic.chello.pl',  // czasem stacjonarny (UPC), ale dynamiczny
    'dynamic.inetia.pl',  // zwykle DSL, czasem LTE
    'dynamic.vectranet.pl',

    // Z zagranicy – Telia Lithuania
    'zebra.lt',

    // Zapasowe: popularne nazwy występujące przy adresacji mobilnej
    'nat.',       // często w mobilnych APN z NAT-em
    'gprs.',      // typowy znacznik dla starego internetu mobilnego
    'lte.',       // sieci LTE
    'apn.',       // często w hostach z mobilnego dostępu
    'mobile.',    // niektóre operatorzy mają "mobile" w PTR
  ];
}

function MONLog(txt: string) {
  console.log(`#MONITORING# ${txt}`);
}
