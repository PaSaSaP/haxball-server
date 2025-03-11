import sqlite3 from 'sqlite3';
import { hb_log } from '../log';

export class ReportsDB {
  db: sqlite3.Database;

  constructor(db: sqlite3.Database) {
    this.db = db;
  }

  setupDatabase() {
    // Tworzenie tabeli reports, jeśli jeszcze nie istnieje
    const createReportsTableQuery = `
        CREATE TABLE IF NOT EXISTS reports (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          player_name TEXT,
          auth_id TEXT,
          report TEXT,
          at TEXT
        );
      `;
    this.db.run(createReportsTableQuery, (e) => e && hb_log(`!! create reports error: ${e}`));
  }

  addReport(player_name: string, auth_id: string, report: string) {
    const at = new Date().toISOString(); // Czas raportu w formacie ISO
    const insertReportQuery = `
              INSERT INTO reports (player_name, auth_id, report, at)
              VALUES (?, ?, ?, ?);
          `;

    this.db.run(insertReportQuery, [player_name, auth_id, report, at], function (err) {
      if (err) {
        console.error('Error inserting report:', err.message);
      }
    });
  }
}
