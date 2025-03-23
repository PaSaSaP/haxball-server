import crypto from 'crypto';
import sqlite3 from 'sqlite3';
import { hb_log } from '../log';
import { BaseDB } from './base_db';
import { normalizeNameString } from '../utils';

interface AccountShort {
  user_id: number;
  user_name: string;
}

interface Account extends AccountShort {
  password: string;
  main_auth_id: string;
  invited_by: number;
  claimed: boolean;
  token: string;
}

export class AccountsDB extends BaseDB {
  constructor(db: sqlite3.Database) {
    super(db);
  }
  async setupDatabase(): Promise<void> {
    await this.setupWalAndSync();
    const createPlayersTableQuery = `
      CREATE TABLE IF NOT EXISTS accounts (
        user_id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_name TEXT UNIQUE NOT NULL,
        password TEXT,
        main_auth_id TEXT UNIQUE,
        main_conn_id TEXT,
        invited_by INTEGER DEFAULT 0,
        claimed BOOLEAN DEFAULT 0,
        state INTEGER DEFAULT 0,
        token TEXT DEFAULT '',
        FOREIGN KEY (invited_by) REFERENCES users(user_id) ON DELETE SET NULL
      );
    `;

    const tokenHistoryTableQuery = `
    CREATE TABLE IF NOT EXISTS accounts_token_history (
      history_id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      token TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES accounts(user_id)
    );`
    const tokenHistoryTriggerQuery = `
    CREATE TRIGGER IF NOT EXISTS trigger_insert_account_token_history
      AFTER UPDATE OF token ON accounts
      FOR EACH ROW
      BEGIN
        IF NEW.token IS NOT NULL AND NEW.token != '' THEN
          INSERT INTO accounts_token_history (user_id, token)
          VALUES (NEW.user_id, NEW.token);
        END IF;
      END;`
    await this.promiseQuery(createPlayersTableQuery, 'accounts');
    await this.promiseQuery(tokenHistoryTableQuery, 'accounts_token_history');
    await this.promiseQuery(tokenHistoryTriggerQuery, 'trigger_insert_account_token_history');
  }

  async addAccount(user_name: string, password: string, auth_id: string, conn_id: string, invited_by: number): Promise<number> {
    user_name = normalizeNameString(user_name);
    let token = this.generateShortToken(auth_id);
    let isTokenUnique = await this.checkTokenUnique(token);
    while (!isTokenUnique) {
      token = this.generateShortToken(auth_id);
      isTokenUnique = await this.checkTokenUnique(token);
    }
    return new Promise((resolve, reject) => {
      const insertQuery = `
        INSERT INTO accounts (user_name, password, main_auth_id, main_conn_id, invited_by, claimed, state, token) 
        VALUES (?, ?, ?, ?, 0, 0, ?)
        RETURNING user_id;
      `;

      this.db.get(insertQuery, [user_name, password, auth_id, conn_id, invited_by, token], (err, row: Account) => {
        if (err) {
          console.error("Error inserting account:", err);
          reject('Error inserting account: ' + err.message);
        } else {
          resolve(row?.user_id || -1);
        }
      });
    });
  }

  async getAccountByAuthId(main_auth_id: string): Promise<Account | null> {
    return new Promise((resolve, reject) => {
      const selectQuery = `
        SELECT user_id, user_name, password, main_auth_id, invited_by, claimed, state, token 
        FROM accounts 
        WHERE main_auth_id = ?;
      `;

      this.db.get(selectQuery, [main_auth_id], (err, row) => {
        if (err) {
          console.error("Error fetching account:", err);
          reject('Error fetching account: ' + err.message);
        } else {
          resolve(row ? row as Account : null);
        }
      });
    });
  }

  async getAccountByAuthIdShort(main_auth_id: string): Promise<AccountShort | null> {
    return new Promise((resolve, reject) => {
      const selectQuery = `
        SELECT user_id, user_name
        FROM accounts 
        WHERE main_auth_id = ?;
      `;

      this.db.get(selectQuery, [main_auth_id], (err, row) => {
        if (err) {
          console.error("Error fetching account:", err);
          reject('Error fetching account: ' + err.message);
        } else {
          resolve(row ? row as AccountShort : null);
        }
      });
    });
  }

private async checkTokenUnique(token: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const query = `SELECT COUNT(*) AS count FROM accounts WHERE token = ?`;

    this.db.get(query, [token], (err, row :{count: number}) => {
      if (err) {
        console.error("Error checking token uniqueness:", err);
        reject('Error checking token uniqueness: ' + err.message);
      } else {
        resolve(row?.count === 0);
      }
    });
  });
}

  static AccountsSecretKey = 'Walka trwa!';
  private generateShortToken(auth_id: string): string {
    const nonce = crypto.randomBytes(8).toString('hex');
    const token = crypto.createHmac('sha256', AccountsDB.AccountsSecretKey)
      .update(auth_id + nonce)
      .digest('hex');
    const shortToken = token.substring(0, 16);
    return shortToken;
  }
}
