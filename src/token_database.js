"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.tokenDatabase = exports.TokenDatabase = void 0;
const sqlite3_1 = __importDefault(require("sqlite3"));
const dbName = './verification.db';
class TokenDatabase {
    constructor() {
        this.db = new sqlite3_1.default.Database(dbName, (err) => {
            if (err) {
                console.error('Błąd połączenia z bazą danych:', err.message);
            }
            else {
                console.log('Połączono z bazą danych');
                this.db.run(`CREATE TABLE IF NOT EXISTS tokens (
            token TEXT PRIMARY KEY,
            player_name TEXT,
            timestamp INTEGER
          )`);
            }
        });
    }
    saveToken(player_name, token) {
        const timestamp = Date.now();
        const stmt = this.db.prepare('INSERT OR REPLACE INTO tokens (token, player_name, timestamp) VALUES (?, ?, ?)');
        stmt.run(token, player_name, timestamp, (err) => {
            if (err) {
                console.error('Błąd podczas zapisywania tokenu:', err.message);
            }
            else {
                console.log('Token zapisany dla gracza', player_name);
            }
        });
        stmt.finalize();
    }
    checkToken(token) {
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
    close() {
        this.db.close((err) => {
            if (err) {
                console.error('Błąd podczas zamykania bazy danych:', err.message);
            }
            else {
                console.log('Baza danych zamknięta');
            }
        });
    }
}
exports.TokenDatabase = TokenDatabase;
const tokenDatabase = new TokenDatabase();
exports.tokenDatabase = tokenDatabase;
