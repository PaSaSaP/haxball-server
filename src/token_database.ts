import sqlite3 from 'sqlite3';
import { dbDir } from './config';

const dbName = dbDir + '/verification.db';

interface ServerRow {
  selector: string;
  token: string;
  link: string;
  room_name: string;
  player_num: number;
  player_max: number;
  connectable: boolean;
  active: boolean;
}

export class ServerData implements ServerRow {
  selector: string;
  token: string;
  link: string;
  room_name: string;
  player_num: number;
  player_max: number;
  connectable: boolean;
  active: boolean;

  constructor(selector: string, token: string, link: string, room_name: string, player_num: number, player_max: number, connectable: boolean, active: boolean) {
    this.selector = selector;
    this.token = token;
    this.link = link;
    this.room_name = room_name;
    this.player_num = player_num;
    this.player_max = player_max;
    this.connectable = connectable;
    this.active = active;
  }

  // Metoda do konwersji do formatu dla bazy danych
  toDbFormat(): [string, string, string, string, number, number, boolean, boolean] {
    return [this.selector, this.token, this.link, this.room_name, this.player_num, this.player_max, this.connectable, this.active];
  }
}

export class TokenDatabase {
  private db: sqlite3.Database;

  constructor() {
    this.db = new sqlite3.Database(dbName, (err) => {
      if (err) {
        console.error('Błąd połączenia z bazą danych:', err.message);
      } else {
        console.log('Połączono z bazą danych');
        this.db.run(
          `CREATE TABLE IF NOT EXISTS tokens (
            token TEXT PRIMARY KEY,
            player_name TEXT,
            timestamp INTEGER
          )`
        );
      }
      // Tworzenie tabeli dla serwerów
      this.db.run(
        `CREATE TABLE IF NOT EXISTS servers (
          selector TEXT PRIMARY KEY,
          token TEXT,
          link TEXT,
          room_name TEXT,
          player_num INTEGER,
          player_max INTEGER,
          connectable BOOLEAN,
          active BOOLEAN,
          FOREIGN KEY (token) REFERENCES tokens (token) ON DELETE CASCADE
        )`
      );
    });
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
  saveServer(serverData: ServerData): void {
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
  getServerBySelector(selector: string): Promise<ServerData | null> {
    return new Promise((resolve, reject) => {
      this.db.get<ServerRow>('SELECT * FROM servers WHERE selector = ?', [selector], (err, row) => {
        if (err) {
          console.error('Błąd podczas odczytu serwera po selector:', err.message);
          reject(err);
        }
        if (row) {
          const serverData = new ServerData(
            row.selector,
            row.token,
            row.link,
            row.room_name,
            row.player_num,
            row.player_max,
            row.connectable,
            row.active
          );
          resolve(serverData); // Zwraca obiekt typu ServerData
        } else {
          resolve(null); // Jeśli serwer nie został znaleziony, zwraca null
        }
      });
    });
  }

  // Odczyt wszystkich aktywnych serwerów, zwraca tablicę obiektów typu ServerData
  getActiveServers(): Promise<ServerData[]> {
    return new Promise((resolve, reject) => {
      this.db.all<ServerRow>('SELECT * FROM servers WHERE active = TRUE', [], (err, rows) => {
        if (err) {
          console.error('Błąd podczas odczytu aktywnych serwerów:', err.message);
          reject(err);
        }
        const activeServers = rows.map((row) => {
          return new ServerData(
            row.selector,
            row.token,
            row.link,
            row.room_name,
            row.player_num,
            row.player_max,
            row.connectable,
            row.active
          );
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

const tokenDatabase = new TokenDatabase();
export { tokenDatabase };
