const sqlite3 = require("sqlite3").verbose();
const fs = require("fs");

const db = new sqlite3.Database("haxball_logs.db");

db.serialize(() => {
    db.run("CREATE TABLE IF NOT EXISTS logs (id INTEGER PRIMARY KEY, timestamp TEXT, user_name TEXT, action TEXT, text TEXT)");
    db.run("CREATE TABLE IF NOT EXISTS players (auth_id TEXT PRIMARY KEY, trusted_level INTEGER, trusted_by TEXT)");

    let logs = JSON.parse(fs.readFileSync("logs.json"));
    let players = JSON.parse(fs.readFileSync("players.json"));

    let stmt_logs = db.prepare("INSERT INTO logs (timestamp, user_name, action, text) VALUES (?, ?, ?, ?)");
    logs.forEach(log => {
        stmt_logs.run(log.timestamp, log.user_name, log.action, log.text);
    });
    stmt_logs.finalize();

    let stmt_players = db.prepare("INSERT INTO players (auth_id, trusted_level, trusted_by) VALUES (?, ?, ?)");
    players.forEach(player => {
        stmt_players.run(player.auth_id, player.trusted_level, player.trusted_by);
    });
    stmt_players.finalize();
});

db.close();

