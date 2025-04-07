import { createWriteStream } from 'fs';
import { createGzip } from 'zlib';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';
import { symlink } from 'fs/promises';
import { HaxballRoom } from "./hb_room";

export class Recording {
  private hbRoom: HaxballRoom;
  private dirname: string;
  private filename: string;
  private enabled: boolean;
  private recEnabled: boolean;
  constructor(hbRoom: HaxballRoom, dirname: string, enabled: boolean) {
    this.hbRoom = hbRoom;
    this.dirname = dirname;
    this.filename = '';
    this.enabled = enabled;
    this.recEnabled = false;
  }

  handleGameStart(recEnabled: boolean) {
    if (!this.enabled) return;
    this.recEnabled = recEnabled;
    if (!recEnabled) return;
    this.hbRoom.room.startRecording();
    const selector = this.hbRoom.getSselector();
    const now = new Date();
    const formattedDate = now.toISOString()
      .replace(/T/, '-')
      .replace(/\..+/, '')
      .replace(/:/g, '-');
    this.filename = `${selector}-${formattedDate}.hbr2.gz`;
  }

  handleGameStop(shouldSave: boolean) {
    if (!this.enabled) return false;
    if (!this.recEnabled) return false;
    let data = this.hbRoom.room.stopRecording();
    if (!shouldSave) {
      RECLog('shouldSave is false, so bye!');
      return false;
    }
    if (!data) {
      RECLog('data is null?');
      return false;
    }
    if (!data.length) {
      RECLog('empty data');
      return false;
    }
    this.saveMatch(data, `${this.dirname}/${this.filename}`).catch((e) => e && RECLog(`!!saveMatch error: ${e}`));
    return true;
  }

  linkMatch(filename: string, matchId: number) {
    if (!filename.length || matchId === -1) return;
    const linkName = `${this.dirname}/${this.hbRoom.room_config.selector}-M${matchId}.hbr2.gz`;
    RECLog(`linking ${filename} to matchId: ${matchId} as ${linkName}`);
    this.createSymlink(filename, linkName);
  }

  getFilename() {
    return this.filename;
  }

  private async saveMatch(binaryStream: Uint8Array, path: string) {
    const gzip = createGzip();
    const out = createWriteStream(path);
    const input = Readable.from([binaryStream]);
    await pipeline(input, gzip, out);
  }

  async createSymlink(targetPath: string, linkPath: string) {
    try {
      await symlink(targetPath, linkPath);
      console.log(`Utworzono symlink: ${linkPath} → ${targetPath}`);
    } catch (err) {
      console.error('Błąd podczas tworzenia symlinka:', err);
    }
  }
}

function RECLog(txt: string) {
  console.log(`#REC# ${txt}`);
}