import sqlite3 from 'sqlite3';

export class BaseDB {
  db: sqlite3.Database;
  constructor(db: sqlite3.Database) {
    this.db = db;
  }

  async getCurrentDate(): Promise<string> {
    const query = 'SELECT current_date';
    return new Promise((resolve, reject) => {
      this.db.all(query, [], (err, rows: { current_date: string }[]) => {
        if (err) {
          reject('Error fetching current date: ' + err.message);
        } else {
          resolve(rows[0].current_date);
        }
      });
    });
  }
}
