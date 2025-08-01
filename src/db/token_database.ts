import sqlite3 from 'sqlite3';
import { dbDir } from '../config';
import { BaseDB } from './base_db';

export interface ServerRow {
  selector: string;
  token: string;
  link: string;
  room_name: string;
  player_num: number;
  player_max: number;
  connectable: boolean;
  active: boolean;
}

// ServerData
export class TokenDatabase extends BaseDB {
  constructor(db: sqlite3.Database) {
    super(db);
  }

  async setupDatabase(): Promise<void> {
    await this.setupWalAndSync();
    const createTokensTableQuery = `
      CREATE TABLE IF NOT EXISTS tokens (
        token TEXT PRIMARY KEY,
        player_name TEXT,
        timestamp INTEGER
      )`;
    const createServersTableQuery = `
      CREATE TABLE IF NOT EXISTS servers (
        selector TEXT PRIMARY KEY,
        token TEXT,
        link TEXT,
        room_name TEXT,
        player_num INTEGER,
        player_max INTEGER,
        connectable BOOLEAN,
        active BOOLEAN,
        FOREIGN KEY (token) REFERENCES tokens (token) ON DELETE CASCADE
      )`;
      await this.promiseQuery(createTokensTableQuery, 'tokens');
      await this.promiseQuery(createServersTableQuery, 'servers');
  }

  saveToken(player_name: string, token: string): void {
    const timestamp = Date.now();
    const stmt = this.db.prepare('INSERT OR REPLACE INTO tokens (token, player_name, timestamp) VALUES (?, ?, ?)');
    stmt.run(token, player_name, timestamp, (err: any) => {
      if (err) {
        console.error('Błąd podczas zapisywania tokenu:', err.message);
      }
    });
    stmt.finalize();
  }

  checkToken(token: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT * FROM tokens WHERE token = ?', [token], (err, row) => {
        if (err) {
          console.error('Błąd podczas sprawdzania tokenu:', err.message);
          reject(err);
        }
        resolve(row); // Zwraca dane o tokenie
      });
    });
  }

  // Zapis serwera
  saveServer(serverData: ServerRow): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO servers (selector, token, link, room_name, player_num, player_max, connectable, active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(serverData.selector, serverData.token, serverData.link, serverData.room_name,
        serverData.player_num, serverData.player_max, serverData.connectable, serverData.active, (err: any) => {
      if (err) {
        console.error('Błąd podczas zapisywania serwera:', err.message);
      }
    });
    stmt.finalize();
  }

  // Odczyt serwera po selector, zwraca obiekt typu ServerData
  getServerBySelector(selector: string): Promise<ServerRow | null> {
    return new Promise((resolve, reject) => {
      this.db.get<ServerRow>('SELECT * FROM servers WHERE selector = ?', [selector], (err, row: ServerRow|null) => {
        if (err) {
          console.error('Błąd podczas odczytu serwera po selector:', err.message);
          reject(err);
        }
        resolve(row ? row : null);
      });
    });
  }

  // Odczyt wszystkich aktywnych serwerów, zwraca tablicę obiektów typu ServerData
  getActiveServers(): Promise<ServerRow[]> {
    return new Promise((resolve, reject) => {
      this.db.all<ServerRow>('SELECT * FROM servers WHERE active = TRUE', [], (err, rows) => {
        if (err) {
          console.error('Błąd podczas odczytu aktywnych serwerów:', err.message);
          reject(err);
        }
        const activeServers = rows.map((row) => {
          return {
            selector: row.selector,
            token: row.token,
            link: row.link,
            room_name: row.room_name,
            player_num: row.player_num,
            player_max: row.player_max,
            connectable: row.connectable,
            active: row.active,
          };
        });
        resolve(activeServers); // Zwraca tablicę obiektów typu ServerData
      });
    });
  }

  updateServerStatus(selector: string, active: boolean): void {
    const stmt = this.db.prepare(`
      UPDATE servers
      SET active = ?
      WHERE selector = ?
    `);
    stmt.run(active, selector, (err: any) => {
      if (err) {
        console.error('Błąd podczas aktualizacji statusu serwera:', err.message);
      }
    });
    stmt.finalize();
  }

  // Usuwanie serwera po tokenie
  deleteServerBySelector(selector: string): void {
    const stmt = this.db.prepare('DELETE FROM servers WHERE selector = ?');
    stmt.run(selector, (err: any) => {
      if (err) {
        console.error('Błąd podczas usuwania serwera:', err.message);
      }
    });
    stmt.finalize();
  }

  close() {
    this.db.close((err) => {
      if (err) {
        console.error('Błąd podczas zamykania bazy danych:', err.message);
      }
    });
  }
}

async function setupTokenDatabase(): Promise<void> {
  if (tokenDatabase) return;
  const tokenDatabaseDb = await new Promise<sqlite3.Database>((resolve, reject) => {
    const db = new sqlite3.Database(tokenDatabaseDbFile, (err) => {
      if (err) {
        console.error('Błąd połączenia z bazą danych:', err.message);
        reject(err);
      } else {
        console.log('Połączono z bazą danych');
        resolve(db);
      }
    });
  });

  tokenDatabase = new TokenDatabase(tokenDatabaseDb);
  await tokenDatabase.setupDatabase();
}

const tokenDatabaseDbFile = dbDir + '/verification.db';
let tokenDatabase: TokenDatabase | null = null;
export { tokenDatabase, setupTokenDatabase };
