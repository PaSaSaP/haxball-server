const puppeteer = require('puppeteer');
const fs = require('fs');
const sqlite3 = require('sqlite3');

(async () => {
	try {
		const browser = await puppeteer.launch({ 
			headless: true,
			args: [
				'--no-sandbox',
				'--disable-setuid-sandbox',
				'--disable-features=WebRtcTcpServerEnable',
				'--force-webrtc-ip-handling-policy=disable_non_proxied_udp',
				'--ignore-certificate-errors',
				"--disable-features=NetworkService",
				"--disable-background-networking",
				"--disable-default-apps",
				"--disable-sync",
				"--disable-extensions",
				"--disable-component-update",
				"--disable-background-timer-throttling",
				"--disable-backgrounding-occluded-windows",
				"--disable-breakpad",
				"--disable-client-side-phishing-detection",
				"--disable-hang-monitor",
				"--disable-popup-blocking",
				"--disable-prompt-on-repost",
				"--disable-renderer-backgrounding",
				"--disable-sync-preferences",
				"--metrics-recording-only",
				"--no-first-run",
				"--no-default-browser-check",
			]
		});
		const page = await browser.newPage();

		await page.goto('https://www.haxball.com/headless', { waitUntil: 'networkidle2' });

		await page.evaluate(() => {
		    console.log("EVALUATE START");


// https://pastebin.com/f4PSNz7C
// https://pastebin.com/2nHXPbvS

// haxball logging
const sqlite3 = require('sqlite3');

class HaxballLogging {
    constructor(dbFile) {
        this.dbFile = dbFile;
        this.db = new sqlite3.Database(dbFile, (err) => {
            if (err) {
                console.error('Error opening database:', err.message);
            } else {
                console.log('Database opened successfully.');
                this.setupDatabase();
            }
        });
    }

    setupDatabase() {
        // Tworzenie tabeli, jeśli jeszcze nie istnieje
        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT,
                user_name TEXT,
                action TEXT,
                text TEXT
            );
        `;

        // Tworzenie tabeli players, jeśli jeszcze nie istnieje
        const createPlayersTableQuery = `
                CREATE TABLE IF NOT EXISTS players (
                    auth_id TEXT PRIMARY KEY,
                    trusted_level INTEGER DEFAULT 0,
                    trusted_by TEXT
                );
            `;
        this.db.run(createTableQuery, (err) => {
            if (err) {
                console.error('Error setting up database:', err.message);
            } else {
                console.log('Table "logs" created or already exists.');
            }
        });
        this.db.run(createPlayersTableQuery, (err) => {
            if (err) {
                console.error('Error creating players table:', err.message);
            }
        });
    }

    logMessage(user_name, action, text) {
        const timestamp = new Date().toISOString();
        const insertQuery = `
            INSERT INTO logs (timestamp, user_name, action, text)
            VALUES (?, ?, ?, ?);
        `;
        
        this.db.run(insertQuery, [timestamp, user_name, action, text], function(err) {
            if (err) {
                console.error('Error inserting log:', err.message);
            } else {
                console.log(`Log entry added with id ${this.lastID}`);
            }
        });
    }

    closeDatabase() {
        this.db.close((err) => {
            if (err) {
                console.error('Error closing database:', err.message);
            } else {
                console.log('Database closed successfully.');
            }
        });
    }
}

class PlayerTrustDB {
    constructor(haxball_logging) {
        this.haball_logging = haxball_logging;
    }

    getDb() {
        return this.haball_logging.db;
    }

    getTrustLevel(player) {
        return new Promise((resolve, reject) => {
            const query = `SELECT trusted_level FROM players WHERE auth_id = ?`;
            this.getDb().get(query, [player.auth_id], (err, row) => {
                if (err) {
                    reject('Error fetching trust level');
                } else {
                    resolve(row ? row.trusted_level : 0); // Domyślnie 0
                }
            });
        });
    }

    setTrustLevel(player, trust_level, by_player) {
        return new Promise((resolve, reject) => {
            // Sprawdzenie, czy gracz nadający trust ma trust_level > 0
            this.getTrustLevel(by_player).then((byPlayerTrustLevel) => {
                if (byPlayerTrustLevel <= 0) {
                    return reject(`${by_player.auth_id} nie może nadać trusta, ponieważ jego trust level wynosi 0.`);
                }

                // Zapisanie trust_level oraz by_player w tabeli players
                const query = `
                    INSERT OR REPLACE INTO players (auth_id, trusted_level, trusted_by)
                    VALUES (?, ?, ?);
                `;
                this.getDb().run(query, [player.auth_id, trust_level, by_player.auth_id], function(err) {
                    if (err) {
                        reject('Error setting trust level');
                    } else {
                        resolve(true);
                    }
                });
            }).catch(reject);
        });
    }
}

class Emoji {
    constructor(room) {
        this.room = room;
        this.emojiInterval = null;
    }

    assignEmojisToPlayers() {
        let players = this.room.getPlayerList();
        players.forEach(player => {
            let randomEmoji = Emoji.funnyEmojis[Math.floor(Math.random() * Emoji.funnyEmojis.length)];
            this.room.setPlayerAvatar(player.id, randomEmoji);
        });
    }

    resetPlayerEmojis() {
        let players = this.room.getPlayerList();
        players.forEach(player => {
            this.room.setPlayerAvatar(player.id);
        });

    }

    startEmojiLoop() {
        if (this.emojiInterval !== null) {
            console.log("Emoji loop już działa!");
            return;
        }

        this.emojiInterval = setInterval(() => {
            this.assignEmojisToPlayers();
        }, 3000);

        console.log("Emoji loop uruchomiony!");
    }

    stopEmojiLoop() {
        if (this.emojiInterval !== null) {
            clearInterval(this.emojiInterval);
            this.resetPlayerEmojis();
            this.emojiInterval = null;
            console.log("Emoji loop zatrzymany!");
        } else {
            console.log("Emoji loop nie był uruchomiony.");
        }
    }

    turnOnOff() {
        if (this.emojiInterval !== null) {
            this.stopEmojiLoop();
        } else {
            this.startEmojiLoop();
        }
    }

    static funnyEmojis = [
        "💩", "🤣", "😂", "😹", "🤡", "👻", "💀", "😛", "🤪", "🦄", "🐸", "🐵", "🙈", "🙉", "🙊",
        "👽", "🛸", "🚀", "👾", "🤖", "🎃", "🥳", "🤑", "🤠", "👀", "😵", "🤯", "🤢", "🤮",
        "🤕", "🥴", "🤤", "👅", "👄", "🦷", "🦠", "🕷", "🐙", "🐍", "🦎", "🐢", "🐉", "🐲",
        "🍄", "🌵", "🌪", "🔥", "💥", "⚡", "☄️", "💨", "🌊", "🎩", "👑", "🦹", "🦸", "🦀",
        "🐡", "🐔", "🦜", "🐧", "🐧", "🦆", "🐦", "🐤", "🦢", "🦩", "🐢", "🐍", "🐛", "🐝",
        "🦗", "🦟", "🦠", "🍕", "🍔", "🌮", "🌯", "🥙", "🍖", "🍗", "🥩", "🍠", "🍜", "🍛",
        "🍤", "🦞", "🦑", "🍣", "🍱", "🥟", "🥠", "🍪", "🍩", "🍿", "🍭", "🍬", "🍫", "🍼",
        "☕", "🍵", "🥤", "🧃", "🧉", "🍾", "🍺", "🍻", "🥂", "🍷", "🥃", "🥳", "🎉", "🎊",
        "🎭", "🃏", "🎰", "🎲", "🎯", "🕹", "🎮", "📸", "📷", "📹", "🎥", "📺", "📻", "🎙",
        "🎤", "🎧", "🎵", "🎶", "🎼", "🎹", "🥁", "🎷", "🎺", "🎸", "🪕", "🎻", "🎬", "🏆",
        "🎯", "🎳", "🏀", "🏈", "⚽", "⚾", "🥎", "🎾", "🏐", "🏉", "🎱", "🪀", "🏓", "🥏",
        "🛹", "🛷", "⛷", "🏂", "🚴", "🏇", "🤹", "🎭", "🕺", "💃", "🦸", "🦹", "🧙", "🧛",
        "🧜", "🧚", "🧞", "🧟", "👮", "🕵", "💂", "🤴", "👸", "🧑‍🚀", "🧑‍🚒", "🦸‍♂️", "🦸‍♀️",
        "🦹‍♂️", "🦹‍♀️", "🧙‍♂️", "🧙‍♀️", "🧛‍♂️", "🧛‍♀️", "🧜‍♂️", "🧜‍♀️", "🧚‍♂️", "🧚‍♀️", "🧞‍♂️", "🧞‍♀️",
        "🧟‍♂️", "🧟‍♀️", "🦄", "🐲", "👹", "👺", "🦊", "🐻", "🐼", "🐵", "🦍", "🦧", "🦝", "🦨",
        "🦡", "🦦", "🦥", "🐶", "🐱", "🦁", "🐯", "🐴", "🐮", "🐷", "🐗", "🐭", "🐹", "🐰"
    ];

    static Afk = '💤';
    // static AfkMaybe = '❓';
    static AfkMaybe = '💤';
}

function toBoolean(value) {
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value === 1;
    if (typeof value === "string") {
        let normalized = value.trim().toLowerCase();
        if (["1", "true", "t", "on"].includes(normalized)) return true;
        if (["0", "false", "f", "off"].includes(normalized)) return false;
    }
    return false;
}

// ANTI SPAM!

class AntiSpam {
    constructor(max_messages, interval_ms, mute_duration_ms, initial_mute_ms = 30000, same_message_interval_ms = 10000) {
        this.max_messages = max_messages;       // Maksymalna liczba wiadomości w oknie czasowym
        this.interval_ms = interval_ms;         // Okno czasowe (np. 5 sek)
        this.mute_duration_ms = mute_duration_ms; // Czas mute'a po przekroczeniu limitu (np. 60 sek)
        this.initial_mute_ms = initial_mute_ms; // Początkowy mute po dołączeniu (np. 30 sek)
        this.same_message_interval_ms = same_message_interval_ms; // Maksymalny czas między identycznymi wiadomościami (np. 10 sek)
        this.message_logs = new Map();          // Gracz -> lista timestampów wiadomości
        this.muted_players = new Map();         // Gracz -> czas odblokowania
        this.check_spam_disabled = new Set();
        this.player_messages = new Map();       // Gracz -> historia [czas, wiadomość]
        this.enabled = false;
    }

    setEnabled(enabled = true) {
        this.enabled = enabled;
    }

    setSpamDisabled(player) {
        this.check_spam_disabled.add(player.id);
    }

    addPlayer(player) {
        const now = Date.now();
        this.muted_players.set(player.id, now + this.initial_mute_ms); // Blokada na start
        this.message_logs.set(player.id, []);
        this.player_messages.set(player.id, []);
    }

    canSendMessage(player, message) {
        if (!this.enabled) {
            return true;
        }
        const now = Date.now();

        // Sprawdź czy gracz jest zmutowany (początkowy mute lub za spam)
        if (this.muted_players.has(player.id) && now < this.muted_players.get(player.id)) {
            this.logMessage(player, message, now); // Logujemy wiadomość nawet jeśli nie można wysłać
            return false;
        }

        // Pobierz historię wiadomości (lub stwórz nową)
        if (!this.message_logs.has(player.id)) {
            this.message_logs.set(player.id, []);
        }
        let timestamps = this.message_logs.get(player.id);

        // Usuń stare wiadomości spoza okna czasowego
        while (timestamps.length > 0 && now - timestamps[0] > this.interval_ms) {
            timestamps.shift();
        }

        // Dodaj nową wiadomość do historii czasów
        timestamps.push(now);
        this.logMessage(player, message, now); // Logujemy treść wiadomości

        // Sprawdź, czy przekroczono limit wiadomości
        if (timestamps.length > this.max_messages) {
            this.muted_players.set(player.id, now + this.mute_duration_ms); // Nałóż mute
            this.message_logs.delete(player.id); // Wyczyść historię czasową wiadomości
            this.player_messages.delete(player.id); // Wyczyść treści wiadomości
            return false;
        }

        return true; // Można wysłać wiadomość
    }

    clearMute(player) {
        this.muted_players.delete(player.id);
    }

    logMessage(player, message, timestamp) {
        if (!this.player_messages.has(player.id)) {
            this.player_messages.set(player.id, []);
        }
        let messages = this.player_messages.get(player.id);

        // Ogranicz historię wiadomości do 3 ostatnich
        if (messages.length >= 3) {
            messages.shift();
        }
        messages.push([timestamp, message]);
    }

    similarity(a, b) {
        let len = Math.max(a.length, b.length);
        if (len === 0) return 1;
        let same = a.split("").filter((char, i) => char === b[i]).length;
        return same / len;
    }
    
    areSimilarMessages(logs) {
        if (logs.length < 3) return false;
        let [msg1, msg2, msg3] = logs.slice(-3).map(log => log[1].replace(/\[.*?\]/g, "").trim());
        return this.similarity(msg1, msg2) > 0.8 && this.similarity(msg2, msg3) > 0.8;
    }

    isSpammingSameMessage(player) {
        if (this.check_spam_disabled.has(player.id)) {
            return false; // User now can spam with similar messages
        }
        if (!this.player_messages.has(player.id)) {
            return false;
        }
        let messages = this.player_messages.get(player.id);
        
        if (messages.length < 3) {
            return false;
        }

        // Sprawdzenie czy wiadomości są identyczne
        let allSame = messages.every(([, msg], _, arr) => msg === arr[0][1]);
        if (!allSame) {
            // czy są podobne
            return this.areSimilarMessages(messages);
        }

        // Sprawdzenie, czy wiadomości były wysłane w krótkim odstępie czasu
        let firstTime = messages[0][0];
        let lastTime = messages[messages.length - 1][0];

        return (lastTime - firstTime) <= this.same_message_interval_ms;
    }

    removePlayer(player) {
        this.message_logs.delete(player.id);
        this.muted_players.delete(player.id);
        this.check_spam_disabled.delete(player.id);
        this.player_messages.delete(player.id);
    }
}

class TextCaptcha {
    constructor(room, timeout_ms = 10000) {
        this.room = room;
        this.pending_captchas = new Map(); // player.id -> { question, answer, timeout }
        this.timeout_ms = timeout_ms;
        this.enabled = false;
    }

    setEnabled(enabled = true) {
        this.enabled = enabled;
    }

    generateCaptcha() {
        let num_operations = Math.floor(Math.random() * 2) + 1; // 1 do 2 operacji
        let numbers = [];
        let operators = [];

        for (let i = 0; i <= num_operations; i++) {
            numbers.push(Math.floor(Math.random() * 10) + 1); // 1-10
        }
        for (let i = 0; i < num_operations; i++) {
            operators.push(Math.random() < 0.5 ? '+' : '-');
        }

        let question = numbers[0].toString();
        for (let i = 0; i < num_operations; i++) {
            question += ` ${operators[i]} ${numbers[i + 1]}`;
        }

        let answer = eval(question).toString(); // Obliczenie wyniku

        return { question, answer };
    }

    clearCaptcha(player) {
        if (!this.hasPendingCaptcha(player)) return;
        let { answer, timeout } = this.pending_captchas.get(player.id);
        clearTimeout(timeout);

    }

    askCaptcha(player) {
        if (!this.enabled) return;
        let captcha = this.generateCaptcha();
        this.pending_captchas.set(player.id, {
            question: captcha.question,
            answer: captcha.answer,
            timeout: setTimeout(() => {
                this.room.kickPlayer(player.id, "Nie odpowiedziałeś na CAPTCHA!", false);
                this.pending_captchas.delete(player.id);
            }, this.timeout_ms)
        });
        this.room.sendAnnouncement(`🔒 CAPTCHA: (masz ${this.timeout_ms/1000}s) Answer/Odpowiedz, ile jest ${captcha.question} = ?`, player.id, 0xFF0000, "bold");
    }

    hasPendingCaptcha(player) {
        return this.pending_captchas.has(player.id);
    }

    checkAnswer(player, message) {
        if (!this.hasPendingCaptcha(player)) return false;
        let { answer, timeout } = this.pending_captchas.get(player.id);
        if (message.trim() === answer) {
            clearTimeout(timeout);
            this.pending_captchas.delete(player.id);
            this.room.sendAnnouncement(`✅ CAPTCHA: Poprawna odpowiedź od ${player.name}[${player.id}]!`, null, 0x00FF00);
            return true;
        }
        return false;
    }
}

class ScoreCaptcha {
    constructor(room, timeout_ms = 10000) {
      this.room = room;
      this.pending_captchas = new Map(); // player.id -> { answer, timeout }
      this.timeout_ms = timeout_ms;
      this.enabled = false;
    }
  
    setEnabled(enabled = true) {
      this.enabled = enabled;
    }
  
    getCurrentScore() {
      let scores = this.room.getScores();
      return {
        red: scores ? scores.red : 0,
        blue: scores ? scores.blue : 0
      };
    }
  
    clearCaptcha(player) {
      if (!this.hasPendingCaptcha(player)) return;
      let { timeout } = this.pending_captchas.get(player.id);
      clearTimeout(timeout);
      this.pending_captchas.delete(player.id);
    }
  
    askCaptcha(player) {
      if (!this.enabled) return;
      let { red, blue } = this.getCurrentScore();
  
      this.pending_captchas.set(player.id, {
        answer: `${red}:${blue}`,
        timeout: setTimeout(() => {
          this.room.kickPlayer(player.id, "Nie odpowiedziałeś na CAPTCHA!", false);
          this.pending_captchas.delete(player.id);
        }, this.timeout_ms)
      });
  
      this.room.sendAnnouncement(
        `🔒 CAPTCHA: (masz ${this.timeout_ms / 1000}s) Podaj aktualny wynik meczu (red - blue).`,
        player.id,
        0xFF0000,
        "bold"
      );
    }
  
    hasPendingCaptcha(player) {
      return this.pending_captchas.has(player.id);
    }
  
    checkAnswer(player, message) {
      if (!this.hasPendingCaptcha(player)) return false;
      let { timeout } = this.pending_captchas.get(player.id);
      let { red: correct_red, blue: correct_blue } = this.getCurrentScore();
  
      // Usuwamy nadmiarowe spacje i sprawdzamy poprawność formatu
      let match = message.trim().match(/^(\d+)\s*[-:\s]?\s*(\d+)$/);
      if (!match) return false;
  
      let [_, red, blue] = match.map(Number); // Rzutujemy na liczby
      if (red === correct_red && blue === correct_blue) {
        clearTimeout(timeout);
        this.pending_captchas.delete(player.id);
        this.room.sendAnnouncement(
          `✅ CAPTCHA: Poprawna odpowiedź od ${player.name}[${player.id}]!`,
          null,
          0x00FF00
        );
        return true;
      }
      return false;
    }
  }

class PlayerAccelerator {
    constructor(room) {
        this.room = room;
        this.maxSpeed = 5;
        this.sprintBoost = 0.08;
        this.slideMinSpeed = 2;
        this.slideBoost = 6;
        this.slideSlowdown = 0.06;
        this.slideDuration = 2000; // Czas w ms
        this.activeSprints = new Set();
        this.activeSlides = new Map();
    }

    reset() {
        this.room.getPlayerList().forEach(player => {
            this.room.setPlayerDiscProperties(player.id, { xgravity: 0, ygravity: 0 });
        });
        this.activeSlides.clear();
        this.activeSprints.clear();
    }

    startSprint(playerId) {
        // Sprawdzenie, czy gracz nie jest w trakcie wślizgu
        if (this.activeSlides.has(playerId)) return;

        this.activeSprints.add(playerId);
    }

    stopSprint(playerId) {
        if (!this.activeSprints.delete(playerId)) return;
        const playerDisc = this.room.getPlayerDiscProperties(playerId);
        if (!playerDisc) return;
        this.room.setPlayerDiscProperties(playerId, { xgravity: 0, ygravity: 0 });
    }

    slide(playerId) {
        // Sprawdzenie, czy gracz nie jest już w trakcie sprintu ani wślizgu
        if (this.activeSprints.has(playerId) || this.activeSlides.has(playerId)) return;

        const playerDisc = this.room.getPlayerDiscProperties(playerId);
        if (!playerDisc) return;

        const scores = this.room.getScores();
        if (!scores) {
            this.activeSlides.clear();
            return;
        }

        let { xspeed, yspeed } = playerDisc;
        const speed = Math.sqrt(xspeed ** 2 + yspeed ** 2);
        if (speed < this.slideMinSpeed) return;

        const normX = xspeed / speed;
        const normY = yspeed / speed;

        const newXSpeed = normX * this.slideBoost;
        const newYSpeed = normY * this.slideBoost;

        this.room.setPlayerDiscProperties(playerId, { xspeed: newXSpeed, yspeed: newYSpeed });

        const now = new Date().getTime();
        this.activeSlides.set(playerId, {
            startTime: now,
            endTime: now + this.slideDuration,
            slowdownStart: now + 250,
            slowdown: this.slideSlowdown,
        });
    }

    update() {
        const scores = this.room.getScores();
        if (!scores) {
            this.activeSlides.clear();
            return;
        }

        const now = new Date().getTime();

        // Aktualizacja sprintu
        for (const playerId of this.activeSprints) {
            const playerDisc = this.room.getPlayerDiscProperties(playerId);
            if (!playerDisc) continue;

            let { xspeed, yspeed } = playerDisc;
            let speed = Math.sqrt(xspeed ** 2 + yspeed ** 2);

            if (speed < this.maxSpeed) {
                const normX = xspeed / (speed || 1);
                const normY = yspeed / (speed || 1);

                // Zmieniamy grawitację w kierunku prędkości bez użycia setTimeout
                this.room.setPlayerDiscProperties(playerId, {
                    xgravity: normX * 0.08,
                    ygravity: normY * 0.08,
                });
            }
        }

        // Aktualizacja wślizgu
        this.room
            .getPlayerList()
            .filter((p) => p.team != 0)
            .forEach((p) => {
                const slideData = this.activeSlides.get(p.id);
                if (!slideData) return;

                if (now > slideData.endTime) {
                    this.activeSlides.delete(p.id);
                    this.room.setPlayerDiscProperties(p.id, { xgravity: 0, ygravity: 0 }); // Reset grawitacji na końcu
                    return;
                }

                if (now > slideData.slowdownStart) {
                    const props = this.room.getPlayerDiscProperties(p.id);
                    if (!props || props.xspeed === undefined || props.yspeed === undefined) return;
                    let xgravity = -props.xspeed * slideData.slowdown;
                    let ygravity = -props.yspeed * slideData.slowdown;
                    this.room.setPlayerDiscProperties(p.id, {
                        xgravity,
                        ygravity
                    });
                }
            });
    }
}

class BallPossessionTracker {
    constructor(room) {
        this.room = room;
        this.lastPossession = null; // 1 dla czerwonych, 2 dla niebieskich, null jeśli brak
        this.possessionStartTime = 0; // Czas, od którego liczymy posiadanie
        this.possessionTime = { 1: 0, 2: 0 }; // Czas posiadania dla każdej drużyny
        this.lastTouchTeam = null; // Ostatnia drużyna, która kopnęła piłkę
    }

    trackPossession() {
        const ballPos = this.room.getBallPosition();
        if (!ballPos) return;

        const players = this.room.getPlayerList();
        if (!players || players.length === 0) return;

        let closestPlayer = null;
        let minDistance = Infinity;

        // Zmienna do określenia, czy piłka jest wystarczająco blisko gracza, by ją przejął
        let playerPossessionChange = false;

        // Wyszukiwanie najbliższego gracza
        for (const player of players) {
            if (!player.position) continue;

            const dx = ballPos.x - player.position.x;
            const dy = ballPos.y - player.position.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const playerRadius = this.room.getPlayerDiscProperties(player.id).radius; // Promień gracza
            const ballRadius = this.room.getDiscProperties(0).radius; // Promień piłki

            // Sprawdzamy, czy gracz jest w zasięgu piłki (sumujemy promienie gracza i piłki)
            if (distance <= playerRadius + ballRadius) {
                playerPossessionChange = true; // Gracz może przejąć piłkę
                if (distance < minDistance) {
                    minDistance = distance;
                    closestPlayer = player;
                }
            }
        }

        const currentTime = this.room.getScores().time;

        // Jeżeli posiadanie jeszcze nie zostało przypisane, a mecz się dopiero zaczyna
        if (this.lastPossession === null && closestPlayer) {
            this.lastPossession = closestPlayer.team;
            this.possessionStartTime = currentTime;
        }

        // Jeżeli posiadanie zostało przypisane
        if (this.lastPossession !== null) {
            // Zawsze aktualizujemy czas posiadania, jeżeli drużyna nadal posiada piłkę
            this.possessionTime[this.lastPossession] += currentTime - this.possessionStartTime;
        }

        // Jeżeli gracz przejmuje piłkę (wystarczająco blisko), zmieniamy posiadanie
        if (playerPossessionChange && closestPlayer && closestPlayer.team !== this.lastPossession) {
            this.possessionStartTime = currentTime; // Zresetowanie czasu posiadania na nowo
            this.lastPossession = closestPlayer.team; // Zmiana posiadania
        }
    }

    // Resetowanie posiadania przed rozpoczęciem meczu
    resetPossession() {
        this.possessionTime = { 1: 0, 2: 0 }; // Resetujemy czas posiadania
        this.lastPossession = null;
        this.possessionStartTime = 0; // Resetujemy czas początkowy
        this.lastTouchTeam = null; // Resetujemy ostatnią drużynę, która kopnęła piłkę
    }

    // Funkcja zwracająca czas posiadania danej drużyny
    getPossessionTime(team) {
        return this.possessionTime[team] || 0;
    }

    // Funkcja zwracająca całkowity czas posiadania (łącznie dla obu drużyn)
    getTotalPossessionTime() {
        return this.possessionTime[1] + this.possessionTime[2];
    }

    // Funkcja do zarejestrowania kopnięcia piłki przez gracza
    registerBallKick(player) {
        this.lastTouchTeam = player.team;
    }

    onTeamGoal(team) {
        // TODO
    }
}


// HAXBALL Room below



class PlayerActivity {
    constructor() {
        const now = Date.now();
        this.chat = now; // chat or moved player as admin
        this.game = now;
    }

    updateChat() { this.chat = Date.now(); }
    updateGame() { this.game = Date.now(); }
}

class AdminStats {
    constructor() {
        this.active = true;
        this.first_since = this.now_txt();
        this.since = this.first_since;
        this.given_by = null;
        this.taken_by = null;
        this.kicked_users = new Set();
        this.banned_users = new Set();
        this.action_start_stop = 0;
        this.action_pause_unpause = 0;
        this.action_admin = 0;
        this.action_team = 0;
        this.action_kick = 0;
        this.action_other = 0;
    }

    since_now() {
        this.since = this.now_txt();
        this.active = true;
    }

    taken_by(takenBy) {
        this.active = false;
        if (takenBy) this.taken_by = takenBy.name;
    }

    now_txt() {
        return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    }
}

class PlayerData {
    constructor(player) {
        // this.player = player;
        this.name = player.name; /// @type string
        this.id = player.id; /// @type int
        this.team = player.team;
        this.admin = player.admin;
        this.admin_stats = null;
        this.position = player.position;
        this.afk = false;
        this.afk_maybe = false;
        this.activity = new PlayerActivity(); /// @type {PlayerActivity | null}
        this.auth_id = player.auth || ''; /// @type string
        this.conn_id = player.conn; /// @type string
        this.connected = true;
        this.trust_level = 0;
        this.join_time = Date.now();
        this.timer_give_back_admin = null;
    }

    update(player) {
        this.team = player.team;
        this.admin = player.admin;
        this.position = player.position;
    }

    mark_disconnected() { this.connected = false; this.reset_timers(); }
    reset_timers() {
        if (this.timer_give_back_admin) {
            clearInterval(this.timer_give_back_admin);
            this.timer_give_back_admin = null;
        }
    }

    // admin stats related
    admin_stat_start_stop() { if (this.admin_stats) this.admin_stats.action_start_stop += 1; }
    admin_stat_pause_unpause() { if (this.admin_stats) this.admin_stats.action_pause_unpause += 1; }
    admin_stat_admin() { if (this.admin_stats) this.admin_stats.action_admin += 1; }
    admin_stat_team() { if (this.admin_stats) this.admin_stats.action_team += 1; }
    admin_stat_kick() { if (this.admin_stats) this.admin_stats.action_kick += 1; }
    admin_stat_other() { if (this.admin_stats) this.admin_stats.action_other += 1; }
}

class Colors {
    static TeamChatRed = 0xDD2222;
    static TeamChatBlue = 0x2222DD;
    static TeamSpecBlue = 0xAAAAAA;
    static GameState = 0xBBBBBB;
    static Admin = 0xBBBBBB;
    static Afk = 0xBBBBBB;
    static Help = 0x22EE22;
    static Warning = 0xFF1111;
    static TrustZero = 0x9c9c9c;
}

class HaxballRoom {
    constructor(room_name, token, is_public_room, player_trust, default_map_name) {
        // TODO rename to hb_room
        this.room = HBInit({
            roomName: room_name,
            maxPlayers: 16,
            public: is_public_room,
            geo: { "code": "it", "lat": 40.0, "lon": 14.0 },
            noPlayer: true, // Remove host player (recommended!)
            token: token,
        });

        this.server_start_time = Date.now();
        this.pressure_left = 0.0;
        this.pressure_right = 0.0;
        this.pressure_total = 0.0;
        this.last_tick = 0.0;
        this.pressure_bar_length = 300;
        this.last_discs_update_time = 0;
        this.feature_pressure = true;
        this.feature_pressure_stadium = false;
        this.players_ext_data = new Map(); /// @type {Map<number, PlayerData>}
        this.emoji = new Emoji(this.room);
        this.anti_spam = new AntiSpam(3, 5000, 60000);
        // this.captcha = new TextCaptcha(this.room);
        this.captcha = new ScoreCaptcha(this.room);
        this.to_be_trusted = new Set();
        this.allow_connecting_only_trusted = false;
        this.allow_chatting_only_trusted = false;
        this.whitelisted_nontrusted_player_names = new Set();
        this.last_command = new Map();  // Mapa: id -> command_string
        this.muted_players = new Set();
        this.player_trust = player_trust;
        this.acceleration_tasks = new PlayerAccelerator(this.room);
        this.ball_possesion_tracker = new BallPossessionTracker(this.room);
        this.game_stopped_timer = null;
        this.game_paused_timer = null;
        this.last_player_team_changed_by_admin_time = Date.now();
        this.last_winner_team = 0;
        this.auto_mode = false;
        this.limit = 3;

        this.room.onGameTick = this.handleGameTick.bind(this);
        this.room.onGameStart = this.handleGameStart.bind(this);
        this.room.onGameStop = this.handleGameStop.bind(this);
        this.room.onGamePause = this.handleGamePause.bind(this);
        this.room.onGameUnpause = this.handleGameUnpause.bind(this);
        this.room.onPlayerJoin = this.handlePlayerJoin.bind(this);
        this.room.onPlayerLeave = this.handlePlayerLeave.bind(this);
        this.room.onPlayerChat = this.handlePlayerChat.bind(this);
        this.room.onPlayerAdminChange = this.handlePlayerAdminChange.bind(this);
        this.room.onPlayerKicked = this.handlePlayerKicked.bind(this);
        this.room.onPlayerTeamChange = this.handlePlayerTeamChange.bind(this);
        this.room.onPlayerActivity = this.handlePlayerActivity.bind(this);
        this.room.onPlayerBallKick = this.handlePlayerBallKick.bind(this);
        this.room.onTeamGoal = this.handleTeamGoal.bind(this);
        this.room.onTeamVictory = this.handleTeamVictory.bind(this);
        this.room.onStadiumChange = this.handleStadiumChange.bind(this);
        this.room.onKickRateLimitSet = this.handleKickRateLimitSet.bind(this);
        this.room.onTeamsLockChange = this.handleTeamsLockChange.bind(this);

        this.commands = {
            send: this.commandSendMessage,
            w: this.commandSendMessage,
            pm: this.commandSendMessage,
            pw: this.commandSendMessage,
            pressure: this.commandPressure,
            presja: this.commandPressure,
            restart: this.commandRestartMatch,
            r: this.commandRestartMatch,
            rand_and_restart: this.commandRandomAndRestartMatch,
            rr: this.commandRandomAndRestartMatch,
            win_stay: this.commandWinStayNextMatch,
            ws: this.commandWinStayNextMatch,
            start: this.commandStartMatch,
            stop: this.commandStopMatch,
            s: this.commandStartOrStopMatch,
            swap: this.commandSwapTeams,
            swap_and_restart: this.commandSwapAndRestart,
            sr: this.commandSwapAndRestart,
            a: this.commandAddPlayersToTeam,
            add: this.commandAddPlayersToTeam,
            dodaj: this.commandAddPlayersToTeam,
            map: this.commandChangeMap,
            m: this.commandChangeMap,
            ping: (player) => this.sendOnlyTo(player, "Pong!"),
            mute: this.commandMute,
            muted: this.commandMuted,
            unmute: this.commandUnmute,
            muteall: this.commandMuteAll,
            mute_all: this.commandMuteAll,
            unmute_all: this.commandUnmuteAll,
            unmuteall: this.commandUnmuteAll,
            afk: this.commandSwitchAfk,
            back: this.commandClearAfk,
            jj: this.commandClearAfk,
            afks: this.commandPrintAfkList,
            afklist: this.commandPrintAfkList,
            afk_list: this.commandPrintAfkList,
            afk_set: this.commandSetAfkOther,
            set_afk: this.commandSetAfkOther,
            afk_clear: this.commandClearAfkOther,
            clear_afk: this.commandClearAfkOther,
            bb: this.commandByeBye,
            byebye: this.commandByeBye,
            bye_bye: this.commandByeBye,
            bye: this.commandByeBye,
            kick: this.commandKick,
            kick_not_trusted: this.commandKickAllExceptVerified,
            kk: this.commandKickAllExceptVerified,
            kkr: this.commandKickAllRed,
            kkb: this.commandKickAllBlue,
            kks: this.commandKickAllSpec,
            auto: this.commandAuto,
            limit: this.commandLimit,
            emoji: this.commandEmoji,

            admin_stat: this.commandAdminStats,
            admin_stats: this.commandAdminStats,

            spec_move_red: this.commandSpecMoveRed,
            spec_move_blue: this.commandSpecMoveBlue,
            red_move_spec: this.commandRedMoveSpec,
            blue_move_spec: this.commandBlueMoveSpec,

            kb_lshift_down: this.keyboardLShiftDown,
            kb_lshift_up: this.keyboardLShiftUp,
            kb_a_down: this.keyboardADown,

            spam_disable: this.commandSpamCheckDisable,
            sd: this.commandSpamCheckDisable,

            trust: this.commandTrust,
            t: this.commandTrust,
            tt: this.commandAutoTrust,

            u: this.commandUnlockWriting,
            sefin: this.commandSefin,
            server_restart: this.commandServerRestart,
            uptime: this.commandUptime,
            dump_players: this.commandDumpPlayers,
            anti_spam: this.commandAntiSpam,
            captcha: this.commandTriggerCaptcha,
            only_trusted_join: this.commandOnlyTrustedJoin,
            only_trusted_chat: this.commandOnlyTrustedChat,
            trust_nick: this.commandWhitelistNonTrustedNick,

            kebab: this.commandBuyCoffeeLink,
            coffee: this.commandBuyCoffeeLink,
            cofe: this.commandBuyCoffeeLink,
            coffe: this.commandBuyCoffeeLink,
            kawa: this.commandBuyCoffeeLink,
            buy: this.commandBuyCoffeeLink,
            wsparcie: this.commandBuyCoffeeLink,
            piwo: this.commandBuyCoffeeLink,

            h: this.commandHelp,
            "?": this.commandHelp,
            help: this.commandHelp,
            pomoc: this.commandHelp,
            komendy: this.commandHelp
        };

        this.default_map_name = default_map_name;
        this.last_selected_map_name = null;
        this.time_limit_reached = false;
        this.room.setDefaultStadium("Classic");
        this.setMapByName(this.default_map_name);
        this.room.setScoreLimit(3);
        this.room.setTimeLimit(3);
        this.room.setTeamsLock(true);

        // logMessage("Server", "room", "Room created");
    }

    P(player) {
        let p = this.players_ext_data.get(player.id);
        p.update(player);
        return p;
    }

    Pid(player_id) {
        return this.players_ext_data.get(player_id);
    }

    resetPressureStats() {
        // hb_log("HB reset pressure stats")
        this.pressure_left = 0.0;
        this.pressure_right = 0.0;
        this.pressure_total = 0.0;
        this.last_tick = 0.0;
    }

    handleGameTick() {
        // Current time in ms
        let scores = this.room.getScores();
        let players = this.room.getPlayerList();
        let current_tick = scores.time;
        let delta_time = current_tick - this.last_tick;
        this.last_tick = current_tick;

        if (this.feature_pressure) {
            /* To use it, edit map, add sth like below to vertexes:
                { "x" : -150, "y" : -260, "color" : "404040", "cMask": [], "_selected" : "segment" },
                { "x" : 150, "y" : -260, "color" : "404040", "cMask": [], "_selected" : "segment" }
                And add to segments (update v0,v1 indexes):
                { "v0" : 20, "v1" : 21, "color" : "404040", "cMask": [], "_selected" : true }
                And add to discs:
                { "radius" : 5, "pos" : [0, -260], "color" : "202020", "cGroup" : [] }
                 y below is not changed, only x is manipulated
            */

            if (delta_time > 0) {
                var ball_position = this.room.getDiscProperties(0);

                // Calc pressure
                if (ball_position.x < 0) {
                    this.pressure_left += delta_time;
                } else if (ball_position.x > 0) {
                    this.pressure_right += delta_time;
                } else {
                    this.pressure_left += delta_time;
                    this.pressure_right += delta_time;
                }
                this.pressure_total += delta_time;

                if (this.feature_pressure_stadium && current_tick - this.last_discs_update_time > 1) {
                    this.last_discs_update_time += 1; // update every second

                    let blue_pressure = (this.pressure_left / this.pressure_total) * 100;
                    let red_pressure = (this.pressure_right / this.pressure_total) * 100;
                    let pressure_disc_color;
                    let pressure_disc_pos_x;
                    if (blue_pressure > red_pressure) {
                        pressure_disc_color = 0x0000FF;
                        pressure_disc_pos_x = blue_pressure * this.pressure_bar_length / 100 - this.pressure_bar_length / 2;
                    } else if (red_pressure > blue_pressure) {
                        pressure_disc_color = 0xFF0000;
                        pressure_disc_pos_x = -red_pressure * this.pressure_bar_length / 100 + this.pressure_bar_length / 2;
                    } else {
                        pressure_disc_color = 0x202020;
                        pressure_disc_pos_x = 0.0;
                    }
                    this.room.setDiscProperties(6, { // Pressure disc properties (id: 6)
                        x: pressure_disc_pos_x,
                        color: pressure_disc_color,
                    });

                    // ball possesion
                    let possesion_total = this.ball_possesion_tracker.getTotalPossessionTime();
                    let possesion_time_blue = this.ball_possesion_tracker.getPossessionTime(2);
                    let possesion_time_red = this.ball_possesion_tracker.getPossessionTime(1);
                    let blue_possesion = (possesion_time_blue / possesion_total) * 100;
                    let red_possesion = (possesion_time_red / possesion_total) * 100;
                    let possesion_disc_color;
                    let possesion_disc_pos_x;
                    if (blue_possesion > red_possesion) {
                        possesion_disc_color = 0x2222DD;
                        possesion_disc_pos_x = blue_possesion * this.pressure_bar_length / 100 - this.pressure_bar_length / 2;
                    } else if (red_possesion > blue_possesion) {
                        possesion_disc_color = 0xDD2222;
                        possesion_disc_pos_x = -red_possesion * this.pressure_bar_length / 100 + this.pressure_bar_length / 2;
                    } else {
                        possesion_disc_color = 0x424242;
                        possesion_disc_pos_x = 0.0;
                    }
                    this.room.setDiscProperties(5, { // Possesion disc properties (id: 5)
                        x: possesion_disc_pos_x,
                        color: possesion_disc_color,
                    });
                }
            }
        }

        // check for AFK
        const MaxAllowedNoMoveTime = 15.0 * 1000; // [ms]
        let current_time = Date.now();
        let afk_players_num = 0;
        players.forEach(player => {
            let player_ext = this.P(player);
            if (player_ext.team && current_time - player_ext.activity.game > MaxAllowedNoMoveTime) {
                if (!player_ext.afk) this.commandSetAfk(player);
                else if (player_ext.afk_maybe) this.moveAfkMaybeToSpec(player_ext);
            }
            if (player_ext.afk) afk_players_num++;
        });
        
        if (afk_players_num == players.length) {
            this.allPlayersAfking(players);
        }
        this.acceleration_tasks.update();
        this.ball_possesion_tracker.trackPossession();
    }

    moveAfkMaybeToSpec(player) {
        this.room.setPlayerAvatar(player.id, Emoji.Afk);
        this.room.setPlayerTeam(player.id, 0);
    }

    allPlayersAfking(players) {
        this.sendToAll(`Wszyscy afczą… Wszyscy na boisko! Ruszać się!`, Colors.GameState, 'bold');
        let current_time = Date.now();
        this.players_ext_data.forEach(player_ext => {
            if (player_ext.afk || !player_ext.afk_maybe) {
                this.room.setPlayerAvatar(player_ext.id, Emoji.AfkMaybe);
                player_ext.afk_maybe = true;
            } else {
                this.room.setPlayerAvatar(player_ext.id);
            }
            player_ext.activity.game = current_time;
            player_ext.afk = false;
        })
        this.room.stopGame();
        this.shuffleAllPlayers(players);
        // Przydzielanie do drużyn losowo
        players.forEach((player, index) => {
            player.team = index % 2 === 0 ? 1 : 2;
            this.room.setPlayerTeam(player.id, player.team);
        });
        this.selectAppropriateMap(players);
        this.room.startGame();
    }

    shuffleAllPlayers(players) {
        // Mieszanie graczy (Fisher-Yates shuffle)
        for (let i = players.length - 1; i > 0; i--) {
            let j = Math.floor(Math.random() * (i + 1));
            [players[i], players[j]] = [players[j], players[i]];
        }
    }

    setMapByName(map_name) {
        if (!all_maps.has(map_name)) return;
        if (this.last_selected_map_name != map_name) this.room.setCustomStadium(all_maps.get(map_name));
        this.last_selected_map_name = map_name;
    }

    selectAppropriateMap(players) {
        let red = 0;
        let blue = 0;
        players.forEach(player => {
            if (player.team == 1) red++;
            else if (player.team == 2) blue++;
        });
        if ((red >= 2 && blue >= 3) || (red >= 3 && blue >= 2)) {
            this.setMapByName("fb");
        } else {
            this.setMapByName("f");
        }
    }

    handleGameStart(byPlayer) {
        this.last_winner_team = 0;
        this.last_discs_update_time = 0;
        this.time_limit_reached = false;
        this.resetPressureStats();
        if (byPlayer) this.Pid(byPlayer.id).admin_stat_start_stop();
        this.acceleration_tasks.reset();
        const now = Date.now();
        this.getPlayers().forEach(player => {
            this.Pid(player.id).activity.game = now;
        })
        this.gameStopTimerReset();
        this.ball_possesion_tracker.resetPossession();
    }

    handleGameStop(byPlayer) {
        if (byPlayer) this.Pid(byPlayer.id).admin_stat_start_stop();
        const MaxAllowedGameStopTime = 20.0 * 1000; // [ms]
        this.last_player_team_changed_by_admin_time = Date.now();
        this.gameStopTimerReset();
        const now = Date.now();
        this.getPlayers().forEach(player => {
            this.Pid(player.id).activity.game = now;
        });

        this.game_stopped_timer = setInterval(() => {
            let current_time = Date.now();
            let random_new_admin = false;
            this.getPlayers().forEach(e => {
                if (current_time - this.last_player_team_changed_by_admin_time > MaxAllowedGameStopTime) {
                    let p = this.P(e);
                    if (!p.afk && p.admin && current_time - p.activity.chat > MaxAllowedGameStopTime) {
                        random_new_admin = true;
                    }
                }
            });
            if (random_new_admin) {
                this.last_player_team_changed_by_admin_time = current_time;
                this.sendToAll(`Zaden admin nie wystartował jeszcze gry, losowanie nowego admina, nie śpimy!`, Colors.GameState);
                this.addNewAdmin();
            }
        }, 1000);
    }

    handleGamePause(byPlayer) {
        if (byPlayer) this.Pid(byPlayer.id).admin_stat_pause_unpause();
        this.sendToAll('Za chwilę kontynuujemy grę!', Colors.GameState);
        const MaxAllowedGamePauseTime = 10.0 * 1000; // [ms]
        this.game_paused_timer = setInterval(() => {
            this.gamePauseTimerReset();
            this.room.pauseGame(false);
            let now = Date.now();
            this.getPlayers().forEach(player => {
                this.Pid(player.id).activity.game = now;
            })
            this.sendToAll('Koniec przerwy, gramy dalej!', Colors.GameState);
        }, MaxAllowedGamePauseTime);
    }

    handleGameUnpause(byPlayer) {
        if (byPlayer) this.Pid(byPlayer.id).admin_stat_pause_unpause();
        this.gamePauseTimerReset();
    }

    gameStopTimerReset() {
        if (this.game_stopped_timer != null) {
            clearInterval(this.game_stopped_timer);
            this.game_stopped_timer = null;
        }
    }

    gamePauseTimerReset() {
        if (this.game_paused_timer != null) {
            clearInterval(this.game_paused_timer);
            this.game_paused_timer = null;
        }
    }

    updateAdmins(leaving_player, only_if_all_afk=true) {
        let new_admin = null;
        let new_admin_trust_level = -1;
        let players = this.getPlayers();
        if (players.length == 1) {
            this.giveAdminTo(players[0]);
            return;
        }
        let any_active_admin = false;
        let non_trusted_admins = [];
        for (let i = 0; i < players.length; i++) {
            let player_ext = this.P(players[i]);
            if (player_ext.admin && player_ext.trust_level == 0) non_trusted_admins.push(player_ext);
            if (leaving_player != null && leaving_player.id == player_ext.id) continue;
            if (player_ext.afk) continue;
            if (!player_ext.admin) {
                if (player_ext.trust_level > new_admin_trust_level) {
                    new_admin = player_ext;
                    new_admin_trust_level = player_ext.trust_level;
                } else if (player_ext.trust_level == new_admin_trust_level && player_ext.join_time < new_admin.join_time) {
                    new_admin = player_ext;
                }
            }
            if (player_ext.admin) any_active_admin = true;
        }
        if (new_admin) {
            non_trusted_admins.forEach(p => {
                this.takeAdminFrom(p);
            });
        }

        if (new_admin && (!only_if_all_afk || !any_active_admin)) {
            this.giveAdminTo(new_admin);
            // logMessage(new_admin.name, "players", "Admin granted to first player");
        }
    }

    addNewAdmin() {
        this.updateAdmins(null, false);
    }

    giveAdminTo(player) {
        this.room.setPlayerAdmin(player.id, true);
        let player_ext = this.Pid(player.id);
        if (!player_ext.admin_stats) player_ext.admin_stats = new AdminStats();
        else player_ext.admin_stats.since_now();
        this.sendOnlyTo(player, `Wielka władza to równie wielka odpowiedzialność! Jesteś Adminem!`, Colors.Admin, null, 2);
    }

    takeAdminFrom(player) {
        this.room.setPlayerAdmin(player.id, false);
        let p = this.Pid(player.id);
        let s = p.admin_stats;
    }

    giveAdminToPlayerWithName(player_name) {
        var players = this.room.getPlayerList();
        var player = players.find(player => player.name == player_name);
        if (player != null) {
            hb_log(`Giving admin to ${player_name}`);
            this.giveAdminTo(player);
            logMessage(player_name, "players", `Admin granted to ${player_name}`);
        } else {
            hb_log(`Player ${player_name} not found`);
        }
    }

    handlePlayerJoin(player) {
        logMessage(player.name, "players", `Player joined the room, auth: ${player.auth} conn: ${player.conn}`);
        this.players_ext_data.set(player.id, new PlayerData(player));
        if (this.checkIfDotPlayerIsHost(player)) return;
        if (this.checkForPlayerDuplicate(player)) return;
        if (this.checkForPlayerNameDuplicate(player)) return;
        let playerExt = this.P(player);
        this.player_trust.getTrustLevel(playerExt).then(level => {
            let kicked = false;
            playerExt.trust_level = level;
            if (this.allow_connecting_only_trusted && !level) {
                let whitelisted = false;
                this.whitelisted_nontrusted_player_names.forEach(player_name_prefix => {
                    if (playerExt.name.startsWith(player_name_prefix)) whitelisted = true;
                });
                if (!whitelisted) {
                    this.room.kickPlayer(player.id, "I don't trust in You!");
                    kicked = true;
                }
            }
            if (playerExt.auth_id && playerExt.trust_level == 0) {
                this.captcha.askCaptcha(player);
            }
            if (!kicked) this.updateAdmins(null);
        });
        this.anti_spam.addPlayer(player);
        if (this.anti_spam.enabled) {
            this.sendOnlyTo(player, `Jesteś wyciszony na 30 sekund; You are muted for 30 seconds`, Colors.Admin, 'bold');
        }
        // this.sendOnlyTo(player, `Mozesz aktywować sterowanie przyciskami (Link: https://tinyurl.com/HaxballKeyBinding): Lewy Shift = Sprint, A = Wślizg`, 0x22FF22);
        this.sendOnlyTo(player, `Sprawdź dostępne komendy: !help`, Colors.Help);
    }

    checkIfDotPlayerIsHost(player) {
        if (player.name.trim() == '.' && !this.isHost(player)) {
            this.room.kickPlayer(player.id, "Kropka Nienawiści!");
            return true;
        }
        return false;
    }

    checkForPlayerDuplicate(player) {
        let kicked = false;
        let player_auth = player.auth || '';
        this.getPlayers().forEach(e => {
            if (e.id != player.id) {
                let p = this.P(e);
                if (p.auth_id == player_auth && p.conn_id == player.conn) {
                    this.room.kickPlayer(player.id, "One tab, one brain!", false);
                    kicked = true;
                }
            }
        });
        return kicked;
    }

    checkForPlayerNameDuplicate(player) {
        let kicked = false;
        this.getPlayers().forEach(e => {
            if (e.id != player.id && e.name == player.name) {
                this.room.kickPlayer(player.id, "Change nick!", false);
                kicked = true;
            }
        });
        return kicked;
    }

    handlePlayerLeave(player) {
        logMessage(player.name, "players", "Player left the room");
        this.updateAdmins(player);
        this.handleEmptyRoom();
        this.last_command.delete(player.id);
        this.removeMuted(player);
        let player_ext = this.Pid(player.id);
        player_ext.mark_disconnected();
    }

    handleEmptyRoom() {
        var players = this.room.getPlayerList();
        if (players.length == 0) {
            this.room.stopGame();
            this.setMapByName(this.default_map_name);
        }
    }

    handleKickRateLimitSet(min, rate, burst, byPlayer) {
        if (byPlayer) this.Pid(byPlayer.id).admin_stat_other();
        // TODO set default values
    }

    handleTeamsLockChange(locked, byPlayer) {
        if (byPlayer) this.Pid(byPlayer.id).admin_stat_other();
        if (!locked) this.room.setTeamsLock(true);
    }

    handleStadiumChange(newStadiumName, byPlayer) {
        if (byPlayer) {
            this.Pid(byPlayer.id).admin_stat_other();
            this.sendOnlyTo(byPlayer, 'Sprawdź komendę !m do zmiany mapy, np 2v2: !m 2, 3v3: !m 3');
        } 
        const t = this.constructor.buy_coffe_link;
        if ([`${t} Classic BAR`, `${t} Big BAR`, `${t} Futsal 1x1 2x2 from HaxMaps BAR`, `${t} Futsal 3v3 Zimska Liga from HaxMaps BAR`,
            `${t} BFF 1x1 Futsal BAR`, `${t} Winky's Futsal BAR` ].includes(newStadiumName)) {
            this.feature_pressure_stadium = true;
        } else {
            this.feature_pressure_stadium = false;
        }
    }

    handlePlayerAdminChange(changedPlayer, byPlayer) {
        if (changedPlayer && !changedPlayer.name) return; // room init
        let changedPlayerExt = this.P(changedPlayer);
        let byPlayerExt = byPlayer ? this.P(byPlayer) : null;
        if (byPlayer) byPlayerExt.admin_stat_admin();
        if (changedPlayerExt.admin) {
            if (!changedPlayerExt.admin_stats) {
                changedPlayerExt.admin_stats = new AdminStats();
            }
            changedPlayerExt.admin_stats.given_by = byPlayer?.name || 'ROOM';
            changedPlayerExt.admin_stats.since_now();
        } else {
            changedPlayerExt.admin_stats.taken_by = byPlayer?.name || 'ROOM';
            changedPlayerExt.admin_stats.active = false;
        }
        if (!byPlayer) return;
        if (byPlayerExt.trust_level == 0) {
            // untrusted
            this.room.setPlayerAdmin(byPlayerExt.id, false);
            if (!changedPlayerExt.admin) {
                this.room.setPlayerAdmin(changedPlayerExt.id, true);
            }
        } else if (byPlayerExt.trust_level > 0 && changedPlayerExt.trust_level == 0) {
            this.room.setPlayerAdmin(changedPlayerExt.id, false);
        }
    }

    handlePlayerKicked(kickedPlayer, reason, ban, byPlayer) {
        if (byPlayer) {
            let byPlayerExt = this.P(byPlayer);
            if (byPlayerExt.admin_stats) {
                if (ban) byPlayerExt.admin_stats.banned_users.add(kickedPlayer.name);
                else byPlayerExt.admin_stats.kicked_users.add(kickedPlayer.name);
                byPlayerExt.admin_stats.action_kick += 1;
            }
            let kickedPlayerExt = this.P(kickedPlayer);
            if (byPlayerExt.trust_level == 0) {
                this.room.kickPlayer(byPlayerExt.id, 'Nie kickuj!');
            } else if (kickedPlayerExt.trust_level > byPlayerExt.trust_level) {
                this.room.setPlayerAdmin(byPlayerExt.id, false);
                this.sendOnlyTo(byPlayerExt, "Weź głęboki oddech :)", Colors.Warning);
                byPlayerExt.timer_give_back_admin = setTimeout(() => {
                    this.room.setPlayerAdmin(byPlayerExt.id, true);
                }, 10000);
            }
        }
        if (ban) {
            this.room.clearBan(kickedPlayer.id); // TODO idk how to handle that
        }
    }

    handlePlayerTeamChange(changedPlayer, byPlayer) {
        if (changedPlayer && !changedPlayer.name) return;
        let changed_player_ext = this.P(changedPlayer);
        changed_player_ext.activity.updateGame(); // reset timer
        if (changed_player_ext.team != 0) {
            if (changed_player_ext.afk) {
                if (byPlayer != null) {
                    // this.commandClearAfk(changedPlayer); // it also updates activity
                    changed_player_ext.afk_maybe = true;
                    changed_player_ext.activity.updateGame();
                    this.room.setPlayerAvatar(changed_player_ext.id, Emoji.AfkMaybe);
                    this.sendOnlyTo(byPlayer, `${changed_player_ext.name} był AFK! Czy na pewno wrócił?`, Colors.Afk);
                }
            }
        }
        if (byPlayer != null) {
            this.last_player_team_changed_by_admin_time = Date.now();
            let p = this.P(byPlayer);
            p.activity.updateChat();
            p.admin_stat_team();
        }
    }

    handlePlayerActivity(player) {
        let p = this.Pid(player.id);
        p.activity.updateGame();
        if (p.afk || p.afk_maybe) {
            p.afk = false;
            p.afk_maybe = false;
            this.room.setPlayerAvatar(p.id);
        }
    }

    handlePlayerBallKick(player) {
        this.ball_possesion_tracker.registerBallKick(player);
    }

    handleTeamGoal(team) {
        this.ball_possesion_tracker.onTeamGoal(team);
    }

    handleTeamVictory(scores) {
        if (scores.red > scores.blue) this.last_winner_team = 1;
        else if (scores.blue > scores.red) this.last_winner_team = 2;
        else this.last_winner_team = 0;
    }

    handlePlayerChat(player, message) {
        if (!message.startsWith('!kb_')) { // to not spam
            hb_log_to_console(player, message)
            logMessage(player.name, "chat", message);
        }
        let p = this.P(player);
        p.activity.updateChat();
        if (this.captcha.hasPendingCaptcha(player)) {
            this.captcha.checkAnswer(player, message);
            return false; // wait till captcha passed at first
        }
        if (this.allow_chatting_only_trusted && !p.trust_level) {
            return false; // only trusted can write
        }
        let anti_spam_muted = !this.anti_spam.canSendMessage(player, message);
        if (this.checkPossibleSpamBot(player)) {
            return false;
        }
        if (message[0] != "!") {
            if (!this.isMuted(player) && !anti_spam_muted) {
                if (message.startsWith("t ") || message.startsWith("T ")) {
                    this.sendMessageToSameTeam(player, message.slice(2));
                    return false;
                }
                if (p.trust_level > 0) return true;
                this.sendToAll(`${player.name}: ${message}`, Colors.TrustZero, null, 0);
                return false;
            }
            return false;
        }

        // Handle last command
        if (message == "!!") {
            let last_command_str = this.last_command.get(player.id);
            if (last_command_str == null) {
                this.sendOnlyTo(player, "Brak ostatniej komendy");
                return false;
            }
            message = last_command_str;
        }
        this.last_command.set(player.id, message);

        message = message.substring(1);
        let message_split = message.split(" ");
        let command = message_split[0];
        this.executeCommand(command, player, message_split.slice(1).filter(e => e));
        return false; // Returning false will prevent the message from being broadcasted
    }

    executeCommand(command, player, args = []) {
        const cmd = this.commands[command];
    
        if (cmd) {
          cmd.call(this, player, args);
        } else {
          this.sendOnlyTo(player, "Nieznana komenda: " + command);
        }
      }

    sendMessageToSameTeam(player, message) {
        let text = `T ${player.name}: ${message}`;
        let color = player.team == 0 ? Colors.TeamChatSpec : player.team == 1 ? Colors.TeamChatRed : Colors.TeamChatBlue;
        this.getPlayers().forEach( e => {
            if(e.team == player.team) {
                this.sendOnlyTo(e, text, color, 'italic', 1);
            }
        });
    }

    checkPossibleSpamBot(player) {
        if (this.anti_spam.isSpammingSameMessage(player)) {
            this.room.kickPlayer(player.id, "Nastepnym razem cie pokonam Hautameki", false);
            return true;
        }
        return false;
    }

    commandSendMessage(player, cmds) {
        if (cmds.length < 2) {
            this.sendOnlyTo(player, 'Uzycie:!pm/!pw/!w <@player_name> <message...>')
            return;
        }
        let player_name = this.parsePlayerName(cmds[0]);
        let dest_player = this.getPlayerWithName(player_name);
        if (!dest_player) {
            this.sendOnlyTo(player, `Nie moge znaleźć gracza o nicku ${player_name}`)
            return;
        }
        if (dest_player.id == player.id) return;
        let msg = cmds.slice(1).join(" ");
        this.sendOnlyTo(player, `${dest_player.name}<<: ${msg}`);
        this.sendOnlyTo(dest_player, `${player.name}>>: ${msg}`);
    }

    parsePlayerName(player_name) {
        // remove leading '@' if any
        return player_name.startsWith('@') ? player_name.slice(1) : player_name;
    }

    commandPressure(player) {
        this.room.sendAnnouncement(
            `Pressure: Red ${this.pressure_right.toFixed(2)}s, Blue ${this.pressure_left.toFixed(2)}s`
        );
    }

    commandRestartMatch(player) {
        if (this.warnIfPlayerIsNotAdmin(player)) return;
        this.updateWinnerTeamBeforeGameStop();
        this.room.stopGame();
        // TODO maybe some sleep?
        this.room.startGame();
        this.sendToAll(`(!r) ${player.name} zrobił restart meczu, limit: ${this.limit} (!limit), zmiana mapy: !m 2, !m 3, !m 4`, Colors.GameState);
    }

    updateWinnerTeamBeforeGameStop() {
        if (!this.last_winner_team) {
            let score = this.room.getScores();
            if (score) {
                if (score.red > score.blue) this.last_winner_team = 1;
                else if (score.blue > score.red) this.last_winner_team = 2;
            }
        }
    }

    getPrevWinnerLogTxt() {
        if (this.last_winner_team == 1) return ', Red wygrali';
        else if (this.last_winner_team == 2) return ', Blue wygrali';
        return '';
    }

    commandRandomAndRestartMatch(player) {
        if (this.warnIfPlayerIsNotAdmin(player)) return;
        this.updateWinnerTeamBeforeGameStop();
        this.makeRandomAndRestartMatch();
        this.sendToAll(`(!rr) ${player.name} zrobił losowanie drużyn${this.getPrevWinnerLogTxt()}, limit: ${this.limit} (!limit), zmiana mapy: !m 2, !m 3, !m 4`, Colors.GameState);
    }

    commandWinStayNextMatch(player) {
        if (this.warnIfPlayerIsNotAdmin(player)) return;
        this.updateWinnerTeamBeforeGameStop();
        if (!this.last_winner_team) this.makeRandomAndRestartMatch();
        else this.makeWinStayAndRestartMatch();
        this.sendToAll(`(!ws) ${player.name} zostawił zwycięską druzynę${this.getPrevWinnerLogTxt()}, limit: ${this.limit} (!limit), zmiana mapy: !m 2, !m 3, !m 4`, Colors.GameState);
    }

    makeRandomAndRestartMatch() {
        this.room.stopGame();

        let players = this.getPlayers();
        let red = [];
        let blue = [];
        let spec = [];
        let red_winner = this.last_winner_team == 1;
        let blue_winner = this.last_winner_team == 2;

        players.forEach(e => {
            let player_ext = this.Pid(e.id);
            if (player_ext.afk) return;
            if (e.team == 1) red.push(e);
            else if (e.team == 2) blue.push(e);
            else spec.push(e);
        });

        let selected_players = [];
        if (red_winner) {
            selected_players = [...red];
        } else if (blue_winner) {
            selected_players = [...blue];
        } else {
            selected_players = [...red, ...blue];
        }

        // Dodajemy graczy ze spectatorów, ale tylko tych, którzy jeszcze nie są wybrani
        while (selected_players.length < this.limit * 2 && spec.length > 0) {
            let next_spec = spec.shift();
            if (!selected_players.includes(next_spec)) {
                selected_players.push(next_spec);
            }
        }

        // Dodajemy graczy z przegranej drużyny (red lub blue), jeśli są jeszcze miejsca
        if (selected_players.length < this.limit * 2) {
            let losing_team = red_winner ? blue : red; // Wybieramy drużynę przegraną
            while (selected_players.length < this.limit * 2 && losing_team.length > 0) {
                let next_loser = losing_team.shift();
                if (!selected_players.includes(next_loser)) {
                    selected_players.push(next_loser);
                }
            }
        }

        this.shuffleAllPlayers(selected_players);
        players.forEach(e => { e.team = 0;  this.room.setPlayerTeam(e.id, e.team); });
        for (let i = 0; i < selected_players.length; i++) {
            let e = selected_players[i];
            e.team = i % 2 === 0 ? 1 : 2;
            this.room.setPlayerTeam(e.id, e.team);
        }

        this.selectAppropriateMap(players);
        this.room.startGame();
    }

    makeWinStayAndRestartMatch() {
        this.room.stopGame();

        let players = this.getPlayers();
        let red = [];
        let blue = [];
        let spec = [];
        let red_winner = this.last_winner_team == 1;
        let blue_winner = this.last_winner_team == 2;

        players.forEach(e => {
            let player_ext = this.Pid(e.id);
            if (player_ext.afk) return;
            if (e.team == 1) red.push(e);
            else if (e.team == 2) blue.push(e);
            else spec.push(e);
        });

        let selected_players = [];

        // Dodajemy graczy ze spectatorów
        while (selected_players.length < this.limit && spec.length > 0) {
            let next_spec = spec.shift();
            if (!selected_players.includes(next_spec)) selected_players.push(next_spec);
        }

        // Dodajemy graczy z przegranej drużyny (red lub blue), jeśli są jeszcze miejsca
        if (selected_players.length < this.limit) {
            let losing_team = red_winner ? blue : red; // Wybieramy drużynę przegraną
            while (selected_players.length < this.limit && losing_team.length > 0) {
                let next_loser = losing_team.shift();
                if (!selected_players.includes(next_loser)) selected_players.push(next_loser);
            }
        }

        this.shuffleAllPlayers(selected_players);
        players.forEach(e => { e.team = 0;  this.room.setPlayerTeam(e.id, e.team); });
        if (red_winner) {
            red.forEach(e => {
                e.team = 1;
                this.room.setPlayerTeam(e.id, e.team);
            });
            selected_players.forEach(e => {
                e.team = 2;
                this.room.setPlayerTeam(e.id, e.team);
            });
        } else {
            blue.forEach(e => {
                e.team = 2;
                this.room.setPlayerTeam(e.id, e.team);
            });
            selected_players.forEach(e => {
                e.team = 1;
                this.room.setPlayerTeam(e.id, e.team);
            });
        }

        this.room.startGame();
    }

    commandStartMatch(player) {
        if (this.warnIfPlayerIsNotAdmin(player)) return;
        this.room.startGame();
    }

    commandStopMatch(player) {
        if (this.warnIfPlayerIsNotAdmin(player)) return;
        this.updateWinnerTeamBeforeGameStop();
        this.room.stopGame();
    }

    commandStartOrStopMatch(player) {
        if (this.warnIfPlayerIsNotAdmin(player)) return;
        let d = this.room.getScores();
        if (d) {
            this.updateWinnerTeamBeforeGameStop();
            this.room.stopGame();
        } else {
            this.room.startGame();
        }
    }

    commandSwapTeams(player) {
        if (this.warnIfPlayerIsNotAdmin(player)) return;
        if (this.isGameInProgress()) {
            this.sendOnlyTo(player, 'Nie mozna zmieniać zespołów podczas meczu!')
            return;
        }
        this.swapTeams();
    }

    commandSwapAndRestart(player) {
        if (this.warnIfPlayerIsNotAdmin(player)) return;
        this.updateWinnerTeamBeforeGameStop();
        this.room.stopGame();
        this.swapTeams();
        this.room.startGame();
        this.sendToAll(`(!sr) ${player.name} zmienił strony druzyn, limit: ${this.limit} (!limit), zmiana mapy: !m 2, !m 3, !m 4`, Colors.GameState);
    }

    commandAddPlayersToTeam(player) {
        if (this.warnIfPlayerIsNotAdmin(player)) return;
        let players = this.getPlayers();
        this.shuffleAllPlayers(players);
        let red = this.limit;
        let blue = this.limit;

        players.forEach(e => {
            if (e.team == 1) red--;
            else if (e.team == 2) blue--;
        });
        let any_added = false;

        for (let i = 0; i < players.length && (red > 0 || blue > 0); i++) {
            let player_ext = this.Pid(players[i].id);
            if (player_ext.afk || player_ext.team != 0) continue;

            let team;
            if (red > blue) team = 1;
            else team = 2
            if (team == 1) red--;
            else blue--;

            this.room.setPlayerTeam(player_ext.id, team);
            any_added = true;
        }
        if (any_added) this.sendToAll(`(!a) ${player.name} uzupełnił druzyny`, Colors.GameState);
    }

    swapTeams() {
        this.getPlayers().forEach(e => {
            let p = this.P(e);
            if (p.team) {
                this.room.setPlayerTeam(p.id, this.getOpponentTeam(p.team));
            }
        })
    }

    commandHelp(player) {
        this.sendOnlyTo(player, "Komendy: !pm/w !bb !ping !afk !back/jj !afks !kebab", Colors.Help);
        if (player.admin) {
            this.sendOnlyTo(player, "Komendy: !kick_not_trusted/kk", Colors.Help);
            this.sendOnlyTo(player, "Komendy: !mute !unmute !restart/r !start/stop/s !swap !swap_and_restart/sr !rand_and_restart/rr !win_stay/ws !add/a !map/m", Colors.Help);
        }
        this.sendOnlyTo(player, "By wywołać ostatnią komendę, uzyj !!", Colors.Help);
    }

    commandChangeMap(player, cmds) {
        if (this.warnIfPlayerIsNotAdmin(player)) return;
        if (cmds.length == 0) {
            this.sendOnlyTo(player, 'Napisz jaką mapę chcesz, dostępne: classic/c, big/b, futsal/f, futsal_big/fb');
            return;
        }
        let map_name = cmds[0].toLowerCase();
        if (all_maps.has(map_name)) {
            this.setMapByName(map_name);
            this.sendToAll(`${player.name} zmienił mapę na ${map_name}`, Colors.GameState);
        } else {
            this.sendOnlyTo(player, 'Nie ma takiej mapy', Colors.Warning);
        }
    }

    commandMute(player, player_names) {
        if (this.warnIfPlayerIsNotAdmin(player)) return;
        let muted = [];
        player_names.forEach(player_name => {
          let e = this.getPlayerWithName(player_name);
          if (e) {
            this.addMuted(e);
            muted.push('@'+e.name);
              this.sendOnlyTo(e, "Zostałeś wyciszony!", Colors.Warning, null, 2);
          }
        });
        this.sendOnlyTo(player, `Muted: ${muted.join(" ")}`);
      }
      

    commandMuted(player) {
        let players = this.room.getPlayerList();
        let muted = [];
        players.forEach(e => {
            if (this.isMuted(e)) muted.push(e.name);
        });
        this.sendOnlyTo(player, `Muted: ${muted.join(" ")}`);
    }

    commandMuteAll(player) {
        if (this.warnIfPlayerIsNotAdmin(player)) return;
        let players = this.room.getPlayerList();
        players.forEach(player => {
            this.addMuted(player);
        });
        this.sendOnlyTo(player, "Muted all Players", Colors.GameState);
    }

    commandUnmute(player, player_names) {
        if (this.warnIfPlayerIsNotAdmin(player)) return;
        var players = this.room.getPlayerList();
        // if player name starts with any of player names, unmute
        players.forEach(player => {
            if (player_names.some(name => player.name.startsWith(name))) {
                this.removeMuted(player);
                this.anti_spam.removePlayer(player);
                this.sendOnlyTo(player, "Ju mozesz pisać!", Colors.Warning, null, 2);
            }
        });
        this.sendOnlyTo(player, `Unmuted: ${player_names}`);
    }

    commandUnmuteAll(player) {
        if (this.warnIfPlayerIsNotAdmin(player)) return;
        this.muted_players.clear();
        this.sendOnlyTo(player, "Unmuted all Players", Colors.GameState);
    }

    commandSwitchAfk(player) {
        // switch on/off afk
        let player_ext = this.P(player);
        if (!player_ext.afk) {
            this.commandSetAfk(player);
        } else {
            // clear AFK status
            this.commandClearAfk(player);
        }
    }

    commandSetAfk(player) {
        // set on afk
        let player_ext = this.P(player);
        if (player_ext.afk) return;
        player_ext.afk = true;
        this.room.setPlayerAvatar(player_ext.id, '💤');
        this.sendToAll(`${player_ext.name} poszedł AFK (!afk !back !jj)`, Colors.Afk);
        if (player_ext.team != 0) {
            this.room.setPlayerTeam(player_ext.id, 0);
        }
        if (player_ext.admin) {
            this.updateAdmins(null);
        }
    }

    commandClearAfk(player) {
        let player_ext = this.P(player);
        if (player_ext.afk) {
            player_ext.afk = false;
            this.room.setPlayerAvatar(player_ext.id);
            this.sendToAll(`${player_ext.name} wrócił z AFK (!afk !back !jj)`, Colors.Afk);
            player_ext.activity.updateGame();
        }
    }

    commandPrintAfkList(player) {
        var log_str = "AFK list: "
        this.getPlayers().forEach(player => {
            let player_ext = this.P(player);
            if (player_ext.afk) log_str += `${player.name}[${player.id}] `;
        })
        this.sendOnlyTo(player, log_str);
    }

    commandSetAfkOther(player, player_names) {
        if (this.warnIfPlayerIsNotAdmin(player)) return;
        this.getPlayers().forEach(player => {
            let player_ext = this.P(player);
            if (player_names.some(name => player_ext.name.startsWith(name))) {
                if (!player_ext.afk) this.commandSetAfk(player);
            }
        });
    }

    commandClearAfkOther(player, player_names) {
        if (this.warnIfPlayerIsNotAdmin(player)) return;
        this.getPlayers().forEach(player => {
            if (player_names.some(name => player.name.startsWith(name))) {
                this.commandClearAfk(player);
            }
        });
    }

    commandByeBye(player) {
        this.room.kickPlayer(player.id, "Bye bye!", false);
    }

    commandKick(player, cmds) {
        if (this.warnIfPlayerIsNotAdmin(player)) return;
        if (cmds.length == 0) {
            this.sendOnlyTo(player, 'Podaj nazwę gracza/graczy');
            return;
        }
        cmds.forEach(player_name => {
            let e = this.getPlayerWithName(player_name);
            if (e && e.id != player.id) {
                this.room.kickPlayer(e.id);
            }
        })
    }

    commandKickAllExceptVerified(player) {
        if (this.warnIfPlayerIsNotAdmin(player)) return;
        this.getPlayers().forEach(e => {
            let p = this.Pid(e.id);
            if (player.id != p.id && !p.trust_level) this.room.kickPlayer(p.id);
        })
    }

    commandKickAllRed(player) {
        if (this.warnIfPlayerIsNotAdmin(player)) return;
        this.kickAllTeamExceptTrusted(1);
    }

    commandKickAllBlue(player) {
        if (this.warnIfPlayerIsNotAdmin(player)) return;
        this.kickAllTeamExceptTrusted(2);
    }

    commandKickAllSpec(player) {
        if (this.warnIfPlayerIsNotAdmin(player)) return;
        this.kickAllTeamExceptTrusted(0);
    }

    kickAllTeamExceptTrusted(player, team_id) {
        this.getPlayers().forEach(e => {
            let p = this.P(e);
            if (player.id != p.id && p.team == team_id && !p.trust_level) this.room.kickPlayer(p.id);
        })
    }

    commandAuto(player, values) {
        if (this.warnIfPlayerIsNotAdmin(player)) return;
        if (values.length == 0) return;
        if (values[0] == "on") {
            this.auto_mode = true;
            this.sendToAll("Włączono tryb automatyczny!")
        } else if (values[0] == "off") {
            this.auto_mode = false;
            this.sendToAll("Wyłączono tryb automatyczny!")
        } else {
            this.sendOnlyTo(player, "Poprawne wartosci: [on, off]");
        }
    }

    commandLimit(player, values) {
        if (this.warnIfPlayerIsNotAdmin(player)) return;
        if (values.length == 0) return;
        try {
            const limit = parseInt(values[0], 10);
            if (limit < 1 || limit > 6) {
                this.sendOnlyTo(player, "Poprawne wartosci to zakres <1, 6>")
            } else {
                this.limit = limit;
                this.sendToAll(`Zmieniono limit max graczy w druzynie na ${limit}`);
            }
        } catch (e) { }
    }

    commandEmoji(player) {
        if (this.warnIfPlayerIsNotAdmin(player)) return;
        this.emoji.turnOnOff();
        this.sendOnlyTo(player, "Losowe Emoji, by włączyć/wyłączyć - odpal jeszcze raz komendę")
    }

    commandAdminStats(player, player_names) {
        if (this.warnIfPlayerIsNotAdmin(player)) return;
        if (!player_names.length) {
            this.sendOnlyTo(player, "Napisz nazwę gracza");
            return;
        }
        let player_name = player_names[0];
        let e = this.getPlayerWithName(player_name);
        if (!e) {
            this.sendOnlyTo(player, `Nie mogę znaleźć gracza o nazwie ${player_name}`);
            return;
        }
        let p = this.Pid(e.id);
        let s = p.admin_stats;
        let txt = `${player_name}: admin(${s != null})`;
        if (s) {
            txt += ` od(${s.since})`;
            if (s.given_by) txt += ` przez(${s.given_by})`;
            if (s.kicked_users.size) txt += ` kick(${[...s.kicked_users].join(', ')})`;
            if (s.banned_users.size) txt += ` ban(${[...s.banned_users].join(', ')})`;
            txt += ` s(${s.action_start_stop}/${s.action_pause_unpause}/${s.action_admin}/${s.action_team}/${s.action_kick}/${s.action_other})`;
        }
        this.sendOnlyTo(player, txt);
    }

    commandSpecMoveRed(player) {
        if (this.warnIfPlayerIsNotAdmin(player)) return;
        this.movePlayerBetweenTeams(0, 1);
    }

    commandSpecMoveBlue(player) {
        if (this.warnIfPlayerIsNotAdmin(player)) return;
        this.movePlayerBetweenTeams(0, 2);
    }

    commandRedMoveSpec(player) {
        if (this.warnIfPlayerIsNotAdmin(player)) return;
        this.movePlayerBetweenTeams(1, 0);
    }

    commandBlueMoveSpec(player) {
        if (this.warnIfPlayerIsNotAdmin(player)) return;
        this.movePlayerBetweenTeams(2, 0);
    }

    movePlayerBetweenTeams(from_team, to_team) {
        this.getPlayers().forEach(player => {
            if(player.team == from_team) {
                this.room.setPlayerTeam(player.id, to_team);
            }
        });
    }

    keyboardLShiftDown(player) {
        this.acceleration_tasks.startSprint(player.id);
    }

    keyboardLShiftUp(player) {
        this.acceleration_tasks.stopSprint(player.id);
    }

    keyboardADown(player) {
        this.acceleration_tasks.slide(player.id);
    }

    commandSefin(player) {
        if (!this.isHost(player)) {
          this.sendOnlyTo(player, "Nieznana komenda: sefin");
            return;
        }
        this.sendOnlyTo(player, "Sprawdzamy czy jest Sefinek na serwerze");
        const sefik_auth_id = 'nV4o2rl_sZDXAfXY7rYHl1PDr-qz56V03uz20npdtzw';
        const sefik_conn_id = '38372E3230352E3133392E313339';
        var players = this.getPlayers();
        players.forEach(e => {
            let p = this.Pid(e.id);
            if (p.auth_id == sefik_auth_id) {
                this.sendOnlyTo(player, `${p.name} [${p.id}] zgadza się auth`);
            } else if (p.conn_id == sefik_conn_id) {
                this.sendOnlyTo(player, `${p.name} [${p.id}] zgadza się conn`);
            }
        });
        var disconnected = [];
        this.players_ext_data.forEach((p, player_id) => {
            if (!p.connected && (p.auth_id == sefik_auth_id || p.conn_id == sefik_conn_id)) {
                disconnected.push(p.name);
            }
        });
        if (disconnected.length > 0) {
            this.sendOnlyTo(player, `Był jako: ${disconnected.join(", ")}`);
        }
    }
    
    commandSpamCheckDisable(player, cmds) {
        if (this.warnIfPlayerIsNotAdmin(player)) return;
        cmds.forEach(player_name => {
            let player = this.getPlayerWithName(player_name);
            if (player) {
                this.anti_spam.setSpamDisabled(player);
            }
        });
    }

    commandTrust(player, cmds) {
        if (this.warnIfPlayerIsNotAdmin(player)) return;
        if (cmds.length == 0) {
            this.sendOnlyTo(player, "Wpisz nick gracza!");
            return;
        }
        let player_name = cmds[0];
        let cmd_player = this.getPlayerWithName(player_name);
        if (!cmd_player) {
            this.sendOnlyTo(player, `Nie mozna znaleźć gracza ${player_name}`);
            return;
        }
        if (cmd_player.id == player.id) {
            this.sendOnlyTo(player, `Nie mozesz sobie samemu zmieniać poziomu!`);
            return;
        }
        let caller_ext = this.Pid(player.id);
        if (caller_ext.trust_level < 2) {
            this.sendOnlyTo(player, `Musisz mieć co najmniej drugi poziom by móc nadawać poziom zaufania!`);
            return;
        }
        let trust_level = parseInt(cmds[1] ?? 1, 10);
        trust_level = isNaN(trust_level) ? 0 : trust_level;
        if (trust_level <= 0) {
            this.sendOnlyTo(player, `Wartość nie moze być mniejsza ani równa zero: ${trust_level}`);
            return;
        } else if (trust_level >= caller_ext.trust_level) {
            this.sendOnlyTo(player, `Nie możesz nadać poziomu ${trust_level}, ponieważ Twój własny poziom to ${caller_ext.trust_level}. Możesz przyznać jedynie poziomy niższe od swojego.`);
            return;
        } else if (caller_ext.trust_level < 10 && trust_level < cmd_player_ext.trust_level) {
            this.sendOnlyTo(player, `Nie możesz obnizyc poziomu, mozesz jedynie podwyzszyc poziom innych graczy.`);
            return;
        }
        let cmd_player_ext = this.Pid(cmd_player.id);
        cmd_player_ext.trust_level = trust_level;
        this.player_trust.setTrustLevel(cmd_player_ext, trust_level, caller_ext);
        this.sendOnlyTo(player, `Ustawiłeś trust level ${player_name} na ${trust_level}`);
    }

    commandAutoTrust(player, cmds) {
        if (this.warnIfPlayerIsNotAdmin(player)) return;
        if (cmds.length == 0) {
            this.sendOnlyTo(player, `podkomendy: red/r blue/b spec/s all/a by dodać wszystkich z danego teamu do kolejki`);
            this.sendOnlyTo(player, `+ by nadać wszystkim wartość zaufania 1; - by usunąć wszystkich z kolejki; a+ dodaj wszystkich`);
            return;
        }
        let caller_ext = this.Pid(player.id);
        if (caller_ext.trust_level < 2) {
            this.sendOnlyTo(player, `Musisz mieć co najmniej drugi poziom by móc nadawać poziom zaufania!`);
            return;
        }
        let red = false;
        let spec = false;
        let blue = false;
        let c = cmds[0];
        if (c == 'red' || c == 'r') red = true;
        else if (c == 'spec' || c == 's') spec = true;
        else if (c == 'blue' || c == 'b') blue = true;
        else if (c == 'all' || c == 'a') {
            red = spec = blue = true;
        } else if (c == '+') {
            this.sendOnlyTo(player, `Ustawiłeś zaufanie dla: ${this.to_be_trusted.size} graczy!`)
            this.to_be_trusted.forEach(player_id => {
                let p = this.Pid(player_id);
                p.trust_level = 1;
                this.player_trust.setTrustLevel(p, 1, caller_ext);
            });
            this.to_be_trusted.clear();
            return;
        } else if (c == '-') {
            this.to_be_trusted.clear();
            return;
        } else if (c == 'a+') {
            this.commandAutoTrust(player, ['a', ...cmds.slice(1)]);
            this.commandAutoTrust(player, ['+', ...cmds.slice(1)]);
            return;
        } else {
            return;
        }
        let to_be_trusted_names = new Set();
        this.getPlayers().forEach(e => {
            let add = false;
            if (player.id != e.id) {
                let p = this.P(e);
                if (p.trust_level == 0) {
                    if (p.team == 0 && spec) add = true;
                    else if (p.team == 1 && red) add = true;
                    else if (p.team == 2 && blue) add = true;
                }
            }
            if (add) {
                this.to_be_trusted.add(e.id);
                to_be_trusted_names.add(e.name);
            } else if (this.to_be_trusted.has(e.id)) {
                to_be_trusted_names.add(e.name);
            }
        });
        this.sendOnlyTo(player, `W kolejce do dodania czekają: ${[...to_be_trusted_names].join(" ")}`);
    }

    commandUnlockWriting(player, cmds) {
        if (this.hostOnlyCommand(player, 'u')) return;
        if (cmds.length == 0) {
            this.anti_spam.clearMute(player);
            this.captcha.clearCaptcha(player);
            this.giveAdminTo(player);
        } else {
            let player_name = cmds[0];
            let p = this.getPlayerWithName(player_name);
            if (!p) {
                this.sendOnlyTo(player, `Nie mozna znaleźć gracza ${player_name}`);
                return;
            }
            this.anti_spam.clearMute(p);
            this.captcha.clearCaptcha(p);
            this.sendOnlyTo(player, `Usunąłem blokady dla gracza: ${player_name}`);
        }
    }

    hostOnlyCommand(player, cmd_name) {
        if (!this.isHost(player)) {
          this.sendOnlyTo(player, `Nieznana komenda:${cmd_name} `);
            return true;
        }
        return false
    }

    commandServerRestart(player) {
        if (this.hostOnlyCommand(player, 'server_restart')) return;
        this.getPlayers().forEach(e => {
            this.room.kickPlayer(e.id, "Server is restarted!");
        });
    }

    formatUptime(ms) {
        const total_seconds = Math.floor(ms / 1000);
        const hours = String(Math.floor(total_seconds / 3600)).padStart(2, '0');
        const minutes = String(Math.floor((total_seconds % 3600) / 60)).padStart(2, '0');
        const seconds = String(total_seconds % 60).padStart(2, '0');
        return `${hours}:${minutes}:${seconds}`;
    }

    commandUptime(player) {
        let txt = this.formatUptime(Date.now() - this.server_start_time);
        this.sendOnlyTo(player, `Server uptime: ${txt}`);
    }

    static buy_coffee_link_texts = [
        "Jeśli chcesz, by moje życie nie polegało wyłącznie na wirtualnych kebabach, wesprzyj mnie.",
        "Aby uratować kebaba, niezbędne jest wsparcie w tej cyfrowej galaktyce. Kup mi jednego!",
        "Gdyby moje podniebienie było bardziej technologiczne, kebab byłby moim procesorem. Pomóż mi go kupić.",
        "Dzięki Twojemu wsparciu, komputer nie będzie musiał jeść kebaba zamiast mnie.",
        "Wirtualne kebaby są smaczne, ale rzeczywiste – jeszcze smaczniejsze. Pomóż mi je zdobyć.",
        "Wsparcie finansowe na kebaba – bo każdemu twórcy należy się posiłek, nie tylko kod.",
        "Kiedyś programiści jedli kebaby z kebaba, ale teraz muszą je prosić o wsparcie. Tak to już jest.",
        "Dzięki Twojemu wsparciu poczuję się jak kebab na talerzu – pełny i szczęśliwy.",
        "Kiedyś kebab to była tylko tradycja. Teraz to misja. Pomóż mi ją zrealizować.",
        "Chciałem stworzyć coś wielkiego, ale najpierw muszę zjeść kebaba. Wspieraj mnie!",
        "Jeśli chceš, by mój kod był smaczniejszy, wesprzyj mnie na kebaba. Pyszne błędy to moja specjalność.",
        "Bez Twojego wsparcia nie będę mógł napisać kolejnej linijki kodu – bez kebaba nie ma mocy!",
        "Ratuj kebabową misję – każda kawa to krok ku pełnemu talerzowi.",
        "Twój kebabowy wkład w moją pracę to inwestycja w lepszy kod i lepszy smak.",
        "Gdyby nie kebab, komputer by nie działał. Pomóż mi nie zwariować na pusty żołądek.",
        "Połączenie kebaba i kodu to sekretny algorytm sukcesu. Pomóż mi go zrealizować.",
        "Bez wsparcia nie zjem kebaba, a wtedy kodowanie stanie się niemożliwe.",
        "Każdy kebab to mniejsza szansa na awarię. Wspieraj mnie, zanim cały system się zawali.",
        "Kiedy kod działa, ale brakuje kebaba, nie ma sensu w tej wirtualnej rzeczywistości.",
        "Kiedy masz kod do napisania, ale kebab wciąż czeka. Pomóż mi rozwiązać tę zagadkę!",
        "W bezkresie internetu, gdzie kebab jest tylko marzeniem, Twoje wsparcie może je spełnić.",
        "Moje procesory działają, ale brakuje mi kebaba. Pomóż mi nakarmić moje wirtualne ja.",
        "Zanim stworzę coś niezwykłego, muszę najeść się kebaba. Pomożesz?",
        "Kiedy kod staje się ciężki, a żołądek pusty – kebab to jedyna odpowiedź.",
        "Zanim świat stanie się lepszy, najpierw muszę zjeść kebaba. Wspieraj mnie!",
        "W kodzie nie ma miejsca na przerwy, ale kebab to jedyny wyjątek. Pomóż mi na niego!",
        "Potrzebuję wsparcia, by nie zginąć w wirze kebabowej ekstazy. Pomóż mi nie stracić sensu!",
        "Bez kawałka kebaba, moja kreatywność już nie działa. Wspieraj, by nie zwariować.",
        "Gdy komputer przestaje jeść, ja szukam kebaba. Pomóż mi połączyć te dwa światy!",
        "Chciałbym stworzyć program, który sam sobie zamówi kebaba. Póki co, czekam na wsparcie.",
        "Kiedy kebab staje się celem, a kod tylko narzędziem. Wspieraj moją misję.",
        "Jeśli moje kody będą pełne kebaba, staną się bardziej smaczne. Wspieraj ten projekt!"
    ];
    static buy_coffe_link = 'https://buycoffee.to/futsal';
    commandBuyCoffeeLink(player) {
        let link = this.constructor.buy_coffe_link;
        let random_text = this.constructor.buy_coffee_link_texts[Math.floor(Math.random() * this.constructor.buy_coffee_link_texts.length)];
        this.sendOnlyTo(player, `${random_text} ${link}`, 0xFF4444, 'bold', 2);
    }

    commandDumpPlayers(player) {
        if (this.warnIfPlayerIsNotAdmin(player)) return;
        var players = this.getPlayers();
        players.forEach(e => {
            let p = this.Pid(e.id);
            this.sendOnlyTo(player, `${p.name} [${p.id}] auth: ${p.auth_id} conn: ${p.conn_id}`)
        });
    }

    commandAntiSpam(player, cmds) {
        if (this.hostOnlyCommand(player, 'anti_spam')) return;
        if (cmds.length == 0) return;
        let new_state = toBoolean(cmds[0]);
        this.anti_spam.setEnabled(new_state);
        this.sendOnlyTo(player, `anti_spam = ${new_state}`);
        if (new_state) {
            this.getPlayers().forEach(player => {
                if (player.admin) {
                    this.sendOnlyTo(player, `Anty Spam został włączony, mozesz wyłączyć dla niego sprawdzanie spamu: !spam_disable/sd <nick>, bez tego przy pisaniu podobnych wiadomości mógłby dostać kicka!`);
                }
            });
        }
    }

    commandTriggerCaptcha(player, cmds) {
        if (this.hostOnlyCommand(player, 'captcha')) return;
        if (cmds.length == 0) {
            this.sendOnlyTo(player, "Podkomendy: gen, clear, gen_me, set [0/1]");
        }
        if (cmds[0] == "gen_me") {
            this.captcha.askCaptcha(player);
            return;
        } else if (cmds[0] == "set" && cmds.length > 1) {
            let new_state = toBoolean(cmds[1]);
            this.captcha.setEnabled(new_state);
            this.sendOnlyTo(player, `Stan captcha = ${new_state}`);
            return;
        }

        this.getPlayers().forEach(p => {
            if (p.id != player.id) {
                if (cmds[0] == "gen") this.captcha.askCaptcha(p);
                else if (cmds[0] == "clear") this.captcha.clearCaptcha(p);
            }
        });
    }

    commandOnlyTrustedJoin(player, cmds) {
        if (this.hostOnlyCommand(player, 'only_trusted_join')) return;
        if (cmds.length == 0) {
            this.sendOnlyTo(player, "wołaj z on/off");
            return;
        }
        let new_state = toBoolean(cmds[0]);
        this.allow_connecting_only_trusted = new_state;
        this.sendOnlyTo(player, `Tylko trusted connecting: ${new_state}`);
    }

    commandOnlyTrustedChat(player, cmds) {
        if (this.hostOnlyCommand(player, 'only_trusted_chat')) return;
        if (cmds.length == 0) {
            this.sendOnlyTo(player, "wołaj z on/off");
            return;
        }
        let new_state = toBoolean(cmds[0]);
        this.allow_chatting_only_trusted = new_state;
        this.sendOnlyTo(player, `Tylko trusted chatting: ${new_state}`);
    }

    commandWhitelistNonTrustedNick(player, cmds) {
        if (this.warnIfPlayerIsNotAdmin(player)) return;
        cmds.forEach(player_name => {
            this.whitelisted_nontrusted_player_names.add(player_name);
        });
    }

    addMuted(player) {
        this.muted_players.add(player.id);
    }

    removeMuted(player) {
        this.muted_players.delete(player.id);
    }

    isMuted(player) {
        return this.muted_players.has(player.id);
    }

    sendOnlyTo(player, message, color=null, style=null, sound=0) {
        // If sound is set to 0 the announcement will produce no sound. 
        // If sound is set to 1 the announcement will produce a normal chat sound. 
        // If set to 2 it will produce a notification sound.
        this.room.sendAnnouncement(message, player.id, color, style, sound);
    }

    sendToAll(message, color=null, style=null, sound=0) {
        this.room.sendAnnouncement(message, null, color, style, sound);
    }

    warnIfPlayerIsNotAdmin(player) {
        if (!player.admin) {
            this.sendOnlyTo(player, "Tylko dla Admina!");
            return true;
        }
        return false;
    }

    getPlayers() {
        return this.room.getPlayerList();
    }

    getPlayerWithName(player_name) {
        // TODO polskie znaki na ascii
        if (player_name.startsWith('@')) player_name = player_name.slice(1);
        return this.getPlayers().find(player => player.name.replace(' ', '_') === player_name) || null;
    }
    
    isGameInProgress() {
        return this.room.getScores() != null;
    }

    getOpponentTeam(t) {
        if (t == 1) return 2;
        if (t == 2) return 1;
        return 0;
    }

    isHost(player) {
        let p = this.P(player)
        if (p.auth_id == '' || p.auth_id == 'QrInL5KJCKDFUyBjgPxMeq392ZB0XjYksePfN6cm3BY')
            return true;
        return false;
    }
}

// Create new room
const stadium_classic_bar = `{name:'buycoffee.to/futsal Classic BAR',width:420,height:200,bg:{type:'grass',width:370,height:170,kickOffRadius:75,cornerRadius:0},vertexes:[{x:378,y:-64,bCoef:0.1,cMask:['ball']},{x:378,y:64,bCoef:0.1,cMask:['ball']},{x:400,y:-42,bCoef:0.1,cMask:['ball']},{x:400,y:42,bCoef:0.1,cMask:['ball']},{x:-378,y:-64,bCoef:0.1,cMask:['ball']},{x:-378,y:64,bCoef:0.1,cMask:['ball']},{x:-400,y:-42,bCoef:0.1,cMask:['ball']},{x:-400,y:42,bCoef:0.1,cMask:['ball']},{x:0,y:-200,bCoef:0.1,cMask:['red','blue'],cGroup:['redKO','blueKO']},{x:0,y:-75,bCoef:0.1,cMask:['red','blue'],cGroup:['redKO','blueKO']},{x:0,y:75,bCoef:0.1,cMask:['red','blue'],cGroup:['redKO','blueKO']},{x:0,y:200,bCoef:0.1,cMask:['red','blue'],cGroup:['redKO','blueKO']},{x:-370,y:-170,cMask:[]},{x:370,y:-170,cMask:[]},{x:370,y:-64,cMask:[]},{x:370,y:64,cMask:[]},{x:370,y:170,cMask:[]},{x:-370,y:170,cMask:[]},{x:-370,y:64,cMask:[]},{x:-370,y:-64,cMask:[]},{x:-150,y:-185,color:'404040',cMask:[],_selected:'segment'},{x:150,y:-185,color:'404040',cMask:[],_selected:'segment'}],segments:[{v0:0,v1:2,curve:89.99999999999999,bCoef:0.1,cMask:['ball'],curveF:1.0000000000000002},{v0:3,v1:2,bCoef:0.1,cMask:['ball']},{v0:3,v1:1,curve:89.99999999999999,bCoef:0.1,cMask:['ball'],curveF:1.0000000000000002},{v0:6,v1:4,curve:89.99999999999999,bCoef:0.1,cMask:['ball'],curveF:1.0000000000000002},{v0:7,v1:6,bCoef:0.1,cMask:['ball']},{v0:5,v1:7,curve:89.99999999999999,bCoef:0.1,cMask:['ball'],curveF:1.0000000000000002},{v0:8,v1:9,vis:false,bCoef:0.1,cMask:['red','blue'],cGroup:['redKO','blueKO']},{v0:10,v1:11,vis:false,bCoef:0.1,cMask:['red','blue'],cGroup:['redKO','blueKO']},{v0:9,v1:10,curve:180,vis:false,bCoef:0.1,cMask:['red','blue'],cGroup:['redKO'],curveF:6.123233995736766e-17},{v0:10,v1:9,curve:180,vis:false,bCoef:0.1,cMask:['red','blue'],cGroup:['blueKO'],curveF:6.123233995736766e-17},{v0:13,v1:14,vis:false,cMask:['ball']},{v0:15,v1:16,vis:false,cMask:['ball']},{v0:17,v1:18,vis:false,cMask:['ball']},{v0:19,v1:12,vis:false,cMask:['ball']},{v0:20,v1:21,color:'404040',cMask:[],_selected:true}],planes:[{normal:[0,1],dist:-200,bCoef:0},{normal:[0,-1],dist:-200,bCoef:0},{normal:[1,0],dist:-420,bCoef:0},{normal:[-1,0],dist:-420,bCoef:0},{normal:[0,1],dist:-170,cMask:['ball']},{normal:[0,-1],dist:-170,cMask:['ball']}],goals:[{p0:[370,-64],p1:[370,64],team:'blue'},{p0:[-370,-64],p1:[-370,64],team:'red'}],discs:[{pos:[0,0],cGroup:['ball','kick','score']},{radius:8,invMass:0,pos:[370,-64],color:'CCCCFF'},{radius:8,invMass:0,pos:[370,64],color:'CCCCFF'},{radius:8,invMass:0,pos:[-370,-64],color:'FFCCCC'},{radius:8,invMass:0,pos:[-370,64],color:'FFCCCC'},{radius:7,pos:[0,-185],color:'424242',cGroup:[]},{radius:5,pos:[0,-185],color:'202020',cGroup:[]}],playerPhysics:{},ballPhysics:'disc0',spawnDistance:100,traits:{},joints:[],redSpawnPoints:[],blueSpawnPoints:[]}`;
const stadium_big_bar = `{name:'buycoffee.to/futsal Big BAR',width:600,height:270,spawnDistance:150,bg:{type:'grass',width:550,height:240,kickOffRadius:80,cornerRadius:0},vertexes:[{x:-550,y:240,trait:'ballArea'},{x:-550,y:80,trait:'ballArea'},{x:-550,y:-80,trait:'ballArea'},{x:-550,y:-240,trait:'ballArea'},{x:550,y:240,trait:'ballArea'},{x:550,y:80,trait:'ballArea'},{x:550,y:-80,trait:'ballArea'},{x:550,y:-240,trait:'ballArea'},{x:0,y:270,trait:'kickOffBarrier'},{x:0,y:80,trait:'kickOffBarrier'},{x:0,y:-80,trait:'kickOffBarrier'},{x:0,y:-270,trait:'kickOffBarrier'},{x:-560,y:-80,trait:'goalNet'},{x:-580,y:-60,trait:'goalNet'},{x:-580,y:60,trait:'goalNet'},{x:-560,y:80,trait:'goalNet'},{x:560,y:-80,trait:'goalNet'},{x:580,y:-60,trait:'goalNet'},{x:580,y:60,trait:'goalNet'},{x:560,y:80,trait:'goalNet'},{x:-150,y:-260,color:'404040',cMask:[],_selected:'segment'},{x:150,y:-260,color:'404040',cMask:[],_selected:'segment'}],segments:[{v0:0,v1:1,trait:'ballArea'},{v0:2,v1:3,trait:'ballArea'},{v0:4,v1:5,trait:'ballArea'},{v0:6,v1:7,trait:'ballArea'},{v0:12,v1:13,curve:-90,trait:'goalNet'},{v0:13,v1:14,trait:'goalNet'},{v0:14,v1:15,curve:-90,trait:'goalNet'},{v0:16,v1:17,curve:90,trait:'goalNet'},{v0:17,v1:18,trait:'goalNet'},{v0:18,v1:19,curve:90,trait:'goalNet'},{v0:8,v1:9,trait:'kickOffBarrier'},{v0:9,v1:10,curve:180,cGroup:['blueKO'],trait:'kickOffBarrier'},{v0:9,v1:10,curve:-180,cGroup:['redKO'],trait:'kickOffBarrier'},{v0:10,v1:11,trait:'kickOffBarrier'},{v0:20,v1:21,color:'404040',cMask:[],_selected:true}],goals:[{p0:[-550,80],p1:[-550,-80],team:'red'},{p0:[550,80],p1:[550,-80],team:'blue'}],discs:[{pos:[-550,80],color:'FFCCCC',trait:'goalPost'},{pos:[-550,-80],color:'FFCCCC',trait:'goalPost'},{pos:[550,80],color:'CCCCFF',trait:'goalPost'},{pos:[550,-80],color:'CCCCFF',trait:'goalPost'},{radius:7,pos:[0,-260],color:'424242',cGroup:[]},{radius:5,pos:[0,-260],color:'202020',cGroup:[]}],planes:[{normal:[0,1],dist:-240,trait:'ballArea'},{normal:[0,-1],dist:-240,trait:'ballArea'},{normal:[0,1],dist:-270,bCoef:0.1},{normal:[0,-1],dist:-270,bCoef:0.1},{normal:[1,0],dist:-600,bCoef:0.1},{normal:[-1,0],dist:-600,bCoef:0.1}],traits:{ballArea:{vis:false,bCoef:1,cMask:['ball']},goalPost:{radius:8,invMass:0,bCoef:0.5},goalNet:{vis:true,bCoef:0.1,cMask:['ball']},kickOffBarrier:{vis:false,bCoef:0.1,cGroup:['redKO','blueKO'],cMask:['red','blue']}}}`;
const stadium_futsal_v1_v2_bar = `{name:'buycoffee.to/futsal BFF 1x1 Futsal BAR',width:480,height:230,bg:{kickOffRadius:60,color:'34414B'},vertexes:[{x:-401.4,y:-200,cMask:[],cGroup:[]},{x:401.4,y:-200,cMask:[],cGroup:[]},{x:401.4,y:200,cMask:[],cGroup:[]},{x:-401.4,y:200,cMask:[],cGroup:[]},{x:0,y:200,cMask:[],cGroup:[]},{x:0,y:-200,cMask:[],cGroup:[]},{x:0,y:-80,cMask:['red','blue'],cGroup:['redKO','blueKO']},{x:0,y:80,cMask:['red','blue'],cGroup:['redKO','blueKO']},{x:-400,y:70,cMask:[],cGroup:[]},{x:-400,y:-70,cMask:[],cGroup:[]},{x:400,y:-70,cMask:[],cGroup:[]},{x:400,y:70,cMask:[],cGroup:[]},{x:0,y:230,cMask:[],cGroup:[]},{x:0,y:-230,cMask:[],cGroup:[]},{x:436.4,y:-70,cMask:[],cGroup:[]},{x:436.4,y:70,cMask:[],cGroup:[]},{x:-436.4,y:-70,cMask:[],cGroup:[]},{x:-436.4,y:70,cMask:[],cGroup:[]},{x:0,y:-1.5,cMask:[],cGroup:[]},{x:0,y:1.5,cMask:[],cGroup:[]},{x:400,y:-135,cMask:[],cGroup:[]},{x:400,y:135,cMask:[],cGroup:[]},{x:-400,y:-135,cMask:[],cGroup:[]},{x:-400,y:135,cMask:[],cGroup:[]},{x:-400,y:-201.4,cMask:[],cGroup:[]},{x:400,y:-201.4,cMask:[],cGroup:[]},{x:400,y:201.4,cMask:[],cGroup:[]},{x:-400,y:201.4,cMask:[],cGroup:[]},{x:435,y:-71.4,cMask:[],cGroup:[]},{x:435,y:71.4,cMask:[],cGroup:[]},{x:-435,y:-71.4,cMask:[],cGroup:[]},{x:-435,y:71.4,cMask:[],cGroup:[]},{x:-150,y:-230,color:'404040',cMask:[],_selected:'segment'},{x:150,y:-230,color:'404040',cMask:[],_selected:'segment'}],segments:[{v0:5,v1:6,color:'ABC2D5',bCoef:0,cMask:[],cGroup:[]},{v0:4,v1:7,color:'ABC2D5',bCoef:0,cMask:[],cGroup:[]},{v0:6,v1:13,vis:false,bCoef:0.1,cMask:['red','blue'],cGroup:['redKO','blueKO']},{v0:7,v1:12,vis:false,bCoef:0.1,cMask:['red','blue'],cGroup:['redKO','blueKO']},{v0:6,v1:7,curve:180,color:'D9A472',bCoef:0.1,cMask:['red','blue'],cGroup:['redKO'],curveF:6.123233995736766e-17},{v0:7,v1:6,curve:180,color:'D9A472',bCoef:0.1,cMask:['red','blue'],cGroup:['blueKO'],curveF:6.123233995736766e-17},{v0:18,v1:19,curve:180,color:'626262',bCoef:0,cMask:[],curveF:6.123233995736766e-17},{v0:19,v1:18,curve:180,color:'626262',bCoef:0,cMask:[],curveF:6.123233995736766e-17},{v0:21,v1:20,curve:150,color:'626262',bCoef:0,cMask:[],curveF:0.2679491924311227},{v0:22,v1:23,curve:150,color:'626262',bCoef:0,cMask:[],curveF:0.2679491924311227},{v0:10,v1:14,color:'6666FF',bCoef:0.1,cMask:['ball'],bias:-10},{v0:28,v1:29,color:'6666FF',bCoef:0.1,cMask:['ball'],bias:-10},{v0:15,v1:11,color:'6666FF',bCoef:0.1,cMask:['ball'],bias:-10},{v0:8,v1:17,color:'FF6666',bCoef:0.1,cMask:['ball'],bias:-10},{v0:31,v1:30,color:'FF6666',bCoef:0.1,cMask:['ball'],bias:-10},{v0:16,v1:9,color:'FF6666',bCoef:0.1,cMask:['ball'],bias:-10},{v0:9,v1:8,color:'C5C5C5',bCoef:0,cMask:[]},{v0:10,v1:11,color:'C5C5C5',bCoef:0,cMask:[]},{v0:0,v1:1,color:'ABC2D5',cMask:['ball'],bias:-10},{v0:25,v1:10,color:'ABC2D5',cMask:['ball'],bias:-10},{v0:11,v1:26,color:'ABC2D5',cMask:['ball'],bias:-10},{v0:2,v1:3,color:'ABC2D5',cMask:['ball'],bias:-10},{v0:27,v1:8,color:'ABC2D5',cMask:['ball'],bias:-10},{v0:9,v1:24,color:'ABC2D5',cMask:['ball'],bias:-10},{v0:32,v1:33,color:'404040',cMask:[],_selected:true}],planes:[{normal:[0,1],dist:-230,bCoef:0},{normal:[0,-1],dist:-230,bCoef:0},{normal:[1,0],dist:-480,bCoef:0},{normal:[-1,0],dist:-480,bCoef:0}],goals:[{p0:[-407.9,70],p1:[-407.9,-70],team:'red'},{p0:[407.9,70],p1:[407.9,-70],team:'blue'}],discs:[{radius:5.8,invMass:1.55,pos:[0,0],color:'FFF26D',bCoef:0.412,cGroup:['ball','kick','score']},{radius:5.4,invMass:0,pos:[-400,-70],color:'31726'},{radius:5.4,invMass:0,pos:[-400,70],color:'31726'},{radius:5.4,invMass:0,pos:[400,-70],color:'31726'},{radius:5.4,invMass:0,pos:[400,70],color:'31726'},{radius:7,pos:[0,-230],color:'424242',cGroup:[]},{radius:5,pos:[0,-230],color:'202020',cGroup:[]}],playerPhysics:{bCoef:0,acceleration:0.11,kickingAcceleration:0.083,kickStrength:4.2},ballPhysics:'disc0'}`;
const stadium_futsal_v3_bar = `{name:"buycoffee.to/futsal Winky's Futsal BAR",width:620,height:270,bg:{type:'',color:'454C5E',width:0,height:0},vertexes:[{x:550,y:-240,cMask:['ball']},{x:0,y:270,bCoef:0.1,cMask:['red','blue'],cGroup:['redKO','blueKO']},{x:-550,y:-80,bCoef:0.1,cMask:['ball'],bias:2,color:'f08a2b'},{x:-590,y:-80,bCoef:0.1,cMask:['ball'],bias:0,color:'f08a2b'},{x:-590,y:80,bCoef:0.1,cMask:['ball'],bias:0,color:'f08a2b'},{x:-550,y:80,bCoef:0.1,cMask:['ball'],bias:2,color:'f08a2b'},{x:550,y:-80,bCoef:0.1,cMask:['ball'],bias:-2,color:'e8e3e3'},{x:590,y:-80,bCoef:0.1,cMask:['ball'],bias:0,color:'e8e3e3'},{x:590,y:80,bCoef:0.1,cMask:['ball'],bias:0,color:'e8e3e3'},{x:550,y:80,bCoef:0.1,cMask:['ball'],bias:-2,color:'e8e3e3'},{x:-550,y:80,bCoef:1.1,cMask:['ball'],color:'a3acc2',bias:40},{x:-550,y:240,bCoef:1.1,cMask:['ball'],color:'a3acc2',bias:40},{x:-550,y:-80,bCoef:1.1,cMask:['ball'],color:'a3acc2',bias:-40},{x:-550,y:-240,bCoef:1.1,cMask:['ball'],color:'a3acc2',bias:-40},{x:-551.5,y:240,cMask:['ball'],color:'a3acc2'},{x:551.5,y:240,cMask:['ball'],color:'a3acc2'},{x:550,y:80,bCoef:1.1,cMask:['ball'],color:'a3acc2',bias:-40},{x:550,y:240,bCoef:1.1,cMask:['ball'],color:'a3acc2',bias:-40},{x:550,y:-240,bCoef:1.1,cMask:['ball'],color:'a3acc2',bias:-40},{x:550,y:-80,bCoef:1.1,cMask:['ball'],color:'a3acc2',bias:-40},{x:550,y:-240,bCoef:0,cMask:['ball']},{x:550,y:-240,bCoef:0,cMask:['ball']},{x:-551.5,y:-240,cMask:['ball'],color:'a3acc2'},{x:551.5,y:-240,cMask:['ball'],color:'a3acc2'},{x:0,y:-240,bCoef:0.1,cMask:['red','blue'],cGroup:['redKO','blueKO'],color:'a3acc2'},{x:0,y:-81.4,bCoef:0.1,cMask:['red','blue'],cGroup:['redKO','blueKO'],color:'a3acc2'},{x:0,y:81.4,bCoef:0.1,cMask:['red','blue'],cGroup:['redKO','blueKO'],color:'a3acc2'},{x:0,y:240,bCoef:0.1,cMask:['red','blue'],cGroup:['redKO','blueKO'],color:'a3acc2'},{x:550,y:-80,bCoef:0.1,cMask:['ball']},{x:550,y:80,bCoef:0.1,cMask:['ball']},{x:-550,y:-80,bCoef:0.1,cMask:[],color:'c4c9d4'},{x:-550,y:80,bCoef:0.1,cMask:[],color:'c4c9d4'},{x:550,y:-80,bCoef:0.1,cMask:[],color:'c4c9d4'},{x:550,y:80,bCoef:0.1,cMask:[],color:'c4c9d4'},{x:-548.5,y:160,bCoef:0.1,cMask:[],color:'a3acc2'},{x:-548.5,y:-160,bCoef:0.1,cMask:[],color:'a3acc2'},{x:548.5,y:160,bCoef:0.1,cMask:[],color:'a3acc2'},{x:548.5,y:-160,bCoef:0.1,cMask:[],color:'a3acc2'},{x:-590,y:-81.5,bCoef:0.1,cMask:['ball'],bias:0,color:'f08a2b'},{x:-590,y:81.5,bCoef:0.1,cMask:['ball'],bias:0,color:'f08a2b'},{x:590,y:-81.5,bCoef:0.1,cMask:['ball'],bias:0,color:'e8e3e3'},{x:590,y:81.5,bCoef:0.1,cMask:['ball'],bias:0,color:'e8e3e3'},{x:26,y:-13,cGroup:['c1'],trait:'none',color:'e8e3e3'},{x:10,y:15,cGroup:['c1'],trait:'none',color:'e8e3e3'},{x:6,y:-13,cGroup:['c1'],color:'e8e3e3'},{x:-1,y:1,cGroup:['c1'],color:'e8e3e3'},{x:23,y:-13,cGroup:['c1'],trait:'none',color:'e8e3e3'},{x:7,y:15,cGroup:['c1'],trait:'none',color:'e8e3e3'},{x:9,y:-13,cGroup:['c1'],color:'e8e3e3'},{x:1,y:2,cGroup:['c1'],color:'e8e3e3'},{x:-27,y:-13,cGroup:['c1'],color:'f08a2b'},{x:-9,y:15,cGroup:['c1'],color:'f08a2b'},{x:-24,y:-13,cGroup:['c1'],color:'f08a2b'},{x:-6,y:15,cGroup:['c1'],color:'f08a2b'},{x:7,y:3,cGroup:['c1'],trait:'none',color:'454C5E',curve:0},{x:17,y:19,cGroup:['c1'],trait:'none',color:'454C5E',curve:0},{x:9,y:3,cGroup:['c1'],trait:'none',color:'454C5E',curve:0},{x:19,y:19,cGroup:['c1'],trait:'none',color:'454C5E',curve:0},{x:-10,y:-13,cGroup:['c1'],color:'e8e3e3'},{x:8,y:15,cGroup:['c1'],color:'e8e3e3'},{x:-7,y:-13,cGroup:['c1'],color:'e8e3e3'},{x:11,y:15,cGroup:['c1'],color:'e8e3e3'},{x:-36,y:15.8,cGroup:['c1'],trait:'none',color:'454C5E',curve:0},{x:34,y:15.8,cGroup:['c1'],trait:'none',color:'454C5E',curve:0},{x:-36,y:-13.8,cGroup:['c1'],trait:'none',color:'454C5E',curve:0},{x:34,y:-13.8,cGroup:['c1'],trait:'none',color:'454C5E',curve:0},{x:11,y:3,cGroup:['c1'],trait:'none',color:'454C5E',curve:0},{x:21,y:19,cGroup:['c1'],trait:'none',color:'454C5E',curve:0},{x:11,y:1,cGroup:['c1'],trait:'none',color:'454C5E',curve:0},{x:21,y:17,cGroup:['c1'],trait:'none',color:'454C5E',curve:0},{x:11,y:-1,cGroup:['c1'],trait:'none',color:'454C5E',curve:0},{x:21,y:15,cGroup:['c1'],trait:'none',color:'454C5E',curve:0},{x:0,y:78,cGroup:['c1'],color:'d0d5e1',curve:180},{x:0,y:-78,cGroup:['c1'],color:'d0d5e1',curve:180},{x:0,y:80,bCoef:0.1,cMask:['red','blue'],cGroup:['redKO','blueKO'],color:'a3acc2'},{x:0,y:-80,bCoef:0.1,cMask:['red','blue'],cGroup:['redKO','blueKO'],color:'a3acc2'},{x:0,y:-80,bCoef:0.1,cMask:['red','blue'],cGroup:['redKO','blueKO'],color:'a8b4bd'},{x:0,y:-270,bCoef:0.1,cMask:['red','blue'],cGroup:['redKO','blueKO']},{x:0,y:80,bCoef:0.1,cMask:['red','blue'],cGroup:['redKO','blueKO'],color:'a8b4bd'},{x:0,y:270,bCoef:0.1,cMask:['red','blue'],cGroup:['redKO','blueKO']},{x:-150,y:-270,color:'404040',cMask:[],_selected:'segment'},{x:150,y:-270,color:'404040',cMask:[],_selected:'segment'}],segments:[{v0:2,v1:3,color:'f08a2b',bCoef:0.1,cMask:['ball'],bias:2},{v0:4,v1:5,color:'f08a2b',bCoef:0.1,cMask:['ball'],bias:2},{v0:6,v1:7,color:'e8e3e3',bCoef:0.1,cMask:['ball'],bias:-2},{v0:8,v1:9,color:'e8e3e3',bCoef:0.1,cMask:['ball'],bias:-2},{v0:10,v1:11,color:'a3acc2',bCoef:1.1,cMask:['ball'],bias:40},{v0:12,v1:13,color:'a3acc2',bCoef:1.1,cMask:['ball'],bias:-40},{v0:14,v1:15,color:'a3acc2',cMask:['ball']},{v0:16,v1:17,color:'a3acc2',bCoef:1.1,cMask:['ball'],bias:-40},{v0:18,v1:19,color:'a3acc2',bCoef:1.1,cMask:['ball'],bias:-40},{v0:20,v1:21,color:'F8F8F8',bCoef:0,cMask:['ball']},{v0:22,v1:23,color:'a3acc2',cMask:['ball']},{v0:24,v1:25,color:'a3acc2',bCoef:0.1,cMask:['red','blue'],cGroup:['redKO','blueKO']},{v0:26,v1:27,color:'a3acc2',bCoef:0.1,cMask:['red','blue'],cGroup:['redKO','blueKO']},{v0:30,v1:31,color:'c4c9d4',bCoef:0.1,cMask:[]},{v0:32,v1:33,color:'c4c9d4',bCoef:0.1,cMask:[]},{v0:35,v1:34,curve:180,color:'a3acc2',bCoef:0.1,cMask:[],curveF:6.1232339957368e-17},{v0:36,v1:37,curve:180,color:'a3acc2',bCoef:0.1,cMask:[],curveF:6.1232339957368e-17},{v0:38,v1:39,color:'f08a2b',bCoef:0.1,cMask:['ball'],bias:0},{v0:40,v1:41,color:'e8e3e3',bCoef:0.1,cMask:['ball'],bias:0},{v0:42,v1:43,vis:true,color:'e8e3e3',cGroup:['c1'],trait:'none'},{v0:44,v1:45,vis:true,color:'e8e3e3',cGroup:['c1']},{v0:46,v1:47,vis:true,color:'e8e3e3',cGroup:['c1'],trait:'none'},{v0:48,v1:49,vis:true,color:'e8e3e3',cGroup:['c1']},{v0:50,v1:51,vis:true,color:'f08a2b',cGroup:['c1']},{v0:52,v1:53,vis:true,color:'f08a2b',cGroup:['c1']},{v0:54,v1:55,curve:0,vis:true,color:'454C5E',cGroup:['c1'],trait:'none',x:20,y:29},{v0:56,v1:57,curve:0,vis:true,color:'454C5E',cGroup:['c1'],trait:'none',x:20,y:29},{v0:58,v1:59,vis:true,color:'e8e3e3',cGroup:['c1']},{v0:60,v1:61,vis:true,color:'e8e3e3',cGroup:['c1']},{v0:62,v1:63,curve:0,vis:true,color:'454C5E',cGroup:['c1'],trait:'none',x:20,y:28.8},{v0:64,v1:65,curve:0,vis:true,color:'454C5E',cGroup:['c1'],trait:'none',x:20,y:-0.8},{v0:66,v1:67,curve:0,vis:true,color:'454C5E',cGroup:['c1'],trait:'none',x:20,y:29},{v0:68,v1:69,curve:0,vis:true,color:'454C5E',cGroup:['c1'],trait:'none',x:20,y:29},{v0:70,v1:71,curve:0,vis:true,color:'454C5E',cGroup:['c1'],trait:'none',x:20,y:29},{v0:72,v1:73,curve:180,vis:true,color:'d0d5e1',cGroup:['c1']},{v0:73,v1:72,curve:180,vis:true,color:'f5b070',cGroup:['c1']},{v0:74,v1:75,curve:180,color:'a3acc2',bCoef:0.1,cMask:['red','blue'],cGroup:['blueKO'],curveF:6.1232339957368e-17},{v0:75,v1:74,curve:180,color:'f08a2b',bCoef:0.1,cMask:['red','blue'],cGroup:['redKO'],curveF:6.1232339957368e-17},{v0:76,v1:77,vis:false,bCoef:0.1,cMask:['red','blue'],cGroup:['redKO','blueKO']},{v0:78,v1:79,vis:false,bCoef:0.1,cMask:['red','blue'],cGroup:['redKO','blueKO']},{v0:80,v1:81,color:'404040',cMask:[],_selected:true}],planes:[{normal:[0,1],dist:-240,bCoef:1.1,cMask:['ball']},{normal:[0,-1],dist:-240,bCoef:1.1,cMask:['ball']},{normal:[0,1],dist:-270,bCoef:0.1},{normal:[0,-1],dist:-270,bCoef:0.1},{normal:[1,0],dist:-620,bCoef:0.1},{normal:[-1,0],dist:-620,bCoef:0.1},{normal:[1,0],dist:-590,bCoef:0.1,cMask:['ball']},{normal:[-1,0],dist:-590,bCoef:0.1,cMask:['ball']}],goals:[{p0:[550,80],p1:[550,-80],team:'blue',color:'c4c9d4'},{p0:[-550,-80],p1:[-550,80],team:'red',color:'c4c9d4'}],discs:[{radius:5.8,invMass:1.55,pos:[0,0],color:'FFbb28',bCoef:0.412,cGroup:['ball','kick','score']},{radius:4.5,invMass:0,pos:[-550,80],color:'f08a2b'},{radius:4.5,invMass:0,pos:[-550,-80],color:'f08a2b'},{radius:4.5,invMass:0,pos:[550,80],color:'e8e3e3'},{radius:4.5,invMass:0,pos:[550,-80],color:'e8e3e3'},{radius:7,pos:[0,-270],color:'424242',cGroup:[]},{radius:5,pos:[0,-270],color:'202020',cGroup:[]}],playerPhysics:{bCoef:0,acceleration:0.11,kickingAcceleration:0.083,kickStrength:4.2},ballPhysics:'disc0',spawnDistance:268,traits:[],joints:[],redSpawnPoints:[],blueSpawnPoints:[],canBeStored:true}`;
const stadium_futsal_v4_bar = `{name:'buycoffee.to/futsal Futsal 3v3 Zimska Liga from HaxMaps BAR',width:755,height:339,bg:{type:'hockey',width:665,height:290,kickOffRadius:80},vertexes:[{x:-665,y:290,cMask:['ball']},{x:-665,y:80,cMask:['ball']},{x:-665,y:-80,cMask:['ball']},{x:-665,y:-290,cMask:['ball']},{x:665,y:290,cMask:['ball']},{x:665,y:80,cMask:['ball']},{x:665,y:-80,cMask:['ball']},{x:665,y:-290,cMask:['ball']},{x:0,y:306,bCoef:0.1,cMask:['red','blue'],cGroup:['redKO','blueKO']},{x:0,y:80,bCoef:0.1,cMask:['red','blue'],cGroup:['redKO','blueKO']},{x:0,y:-80,bCoef:0,cMask:[]},{x:0,y:-306,bCoef:0.1,cMask:['red','blue'],cGroup:['redKO','blueKO']},{x:-693,y:-80,bCoef:0.1,cMask:['ball']},{x:693,y:-80,bCoef:0.1,cMask:['ball']},{x:-693,y:80,bCoef:0.1,cMask:['ball']},{x:693,y:80,bCoef:0.1,cMask:['ball']},{x:-665,y:-215,bCoef:0,cMask:[]},{x:-500,y:-50,bCoef:0,cMask:[]},{x:665,y:-215,bCoef:0,cMask:[]},{x:500,y:-50,bCoef:0,cMask:[]},{x:-665,y:215,bCoef:0,cMask:[]},{x:-500,y:50,bCoef:0,cMask:[]},{x:665,y:215,bCoef:0,cMask:[]},{x:500,y:50,bCoef:0,cMask:[]},{x:665,y:290,cMask:['ball']},{x:665,y:-290,cMask:['ball']},{x:0,y:290,bCoef:0,cMask:[]},{x:0,y:-290,bCoef:0,cMask:[]},{x:0,y:80,bCoef:0.1,cMask:['red','blue'],cGroup:['redKO','blueKO']},{x:0,y:-80,bCoef:0.1,cMask:['red','blue'],cGroup:['redKO','blueKO']},{x:674,y:-80,cMask:['ball']},{x:674,y:-290,cMask:['ball']},{x:-674,y:-80,cMask:['ball']},{x:-674,y:-290,cMask:['ball']},{x:-674,y:80,cMask:['ball']},{x:-674,y:290,cMask:['ball']},{x:674,y:80,cMask:['ball']},{x:674,y:290,cMask:['ball']},{x:-150,y:-310,color:'404040',cMask:[],_selected:'segment'},{x:150,y:-310,color:'404040',cMask:[],_selected:'segment'}],segments:[{v0:0,v1:1,vis:false,cMask:['ball']},{v0:2,v1:3,vis:false,cMask:['ball']},{v0:4,v1:5,vis:false,cMask:['ball']},{v0:6,v1:7,vis:false,cMask:['ball']},{v0:8,v1:9,vis:false,bCoef:0.1,cMask:['red','blue'],cGroup:['redKO','blueKO']},{v0:9,v1:10,curve:180,vis:false,bCoef:0.1,cMask:['red','blue'],cGroup:['blueKO'],curveF:6.123233995736766e-17},{v0:10,v1:9,curve:180,vis:false,bCoef:0.1,cMask:['red','blue'],cGroup:['redKO'],curveF:6.123233995736766e-17},{v0:10,v1:11,vis:false,bCoef:0.1,cMask:['red','blue'],cGroup:['redKO','blueKO']},{v0:12,v1:2,curve:35,color:'FFFFFF',bCoef:0.1,cMask:['ball'],curveF:3.1715948023632126},{v0:6,v1:13,curve:35,color:'FFFFFF',bCoef:0.1,cMask:['ball'],curveF:3.1715948023632126},{v0:1,v1:14,curve:35,color:'FFFFFF',bCoef:0.1,cMask:['ball'],curveF:3.1715948023632126},{v0:15,v1:5,curve:35,color:'FFFFFF',bCoef:0.1,cMask:['ball'],curveF:3.1715948023632126},{v0:14,v1:12,curve:35,color:'FFFFFF',bCoef:0.1,cMask:['ball'],curveF:3.1715948023632126},{v0:13,v1:15,curve:35,color:'FFFFFF',bCoef:0.1,cMask:['ball'],curveF:3.1715948023632126},{v0:16,v1:17,curve:89.99999999999999,color:'FFFFFF',bCoef:0,cMask:[],curveF:1.0000000000000002},{v0:19,v1:18,curve:89.99999999999999,color:'FFFFFF',bCoef:0,cMask:[],curveF:1.0000000000000002},{v0:21,v1:20,curve:89.99999999999999,color:'FFFFFF',bCoef:0,cMask:[],curveF:1.0000000000000002},{v0:22,v1:23,curve:89.99999999999999,color:'FFFFFF',bCoef:0,cMask:[],curveF:1.0000000000000002},{v0:17,v1:21,color:'FFFFFF',bCoef:0,cMask:[]},{v0:19,v1:23,color:'FFFFFF',bCoef:0,cMask:[]},{v0:1,v1:0,color:'FFFFFF',cMask:['ball']},{v0:5,v1:4,color:'FFFFFF',cMask:['ball']},{v0:2,v1:3,color:'FFFFFF',cMask:['ball']},{v0:6,v1:7,color:'FFFFFF',cMask:['ball']},{v0:0,v1:24,color:'FFFFFF',cMask:['ball']},{v0:3,v1:25,color:'FFFFFF',cMask:['ball']},{v0:26,v1:27,color:'FFFFFF',bCoef:0,cMask:[]},{v0:9,v1:10,curve:180,color:'FFFFFF',bCoef:0,cMask:[],curveF:6.123233995736766e-17},{v0:29,v1:28,curve:180,color:'FFFFFF',bCoef:0,cMask:[],curveF:6.123233995736766e-17},{v0:2,v1:1,color:'FFFFFF',bCoef:0,cMask:[]},{v0:6,v1:5,color:'FFFFFF',bCoef:0,cMask:[]},{v0:30,v1:31,vis:false,color:'FFFFFF',cMask:['ball']},{v0:32,v1:33,vis:false,color:'FFFFFF',cMask:['ball']},{v0:34,v1:35,vis:false,color:'FFFFFF',cMask:['ball']},{v0:36,v1:37,vis:false,color:'FFFFFF',cMask:['ball']},{v0:38,v1:39,color:'404040',cMask:[],_selected:true}],planes:[{normal:[0,1],dist:-290,cMask:['ball']},{normal:[0,-1],dist:-290,cMask:['ball']},{normal:[0,1],dist:-339,bCoef:0.2},{normal:[0,-1],dist:-339,bCoef:0.2},{normal:[1,0],dist:-755,bCoef:0.2},{normal:[-1,0],dist:-755,bCoef:0.2}],goals:[{p0:[-674,-80],p1:[-674,80],team:'red'},{p0:[674,80],p1:[674,-80],team:'blue'}],discs:[{radius:6.4,pos:[0,0],color:'9CF0E5',cGroup:['ball','kick','score']},{radius:5,invMass:0,pos:[-665,80],bCoef:1},{radius:5,invMass:0,pos:[-665,-80],bCoef:1},{radius:5,invMass:0,pos:[665,80],bCoef:1},{radius:5,invMass:0,pos:[665,-80],bCoef:1},{radius:7,pos:[0,-310],color:'424242',cGroup:[]},{radius:5,pos:[0,-310],color:'202020',cGroup:[]}],playerPhysics:{acceleration:0.11,kickingAcceleration:0.1,kickStrength:7},ballPhysics:'disc0',spawnDistance:260}`;

let all_maps = new Map();
all_maps.set("Classic BAR", stadium_classic_bar);
all_maps.set("classic", stadium_classic_bar);
all_maps.set("c", stadium_classic_bar);
all_maps.set("Big BAR", stadium_big_bar);
all_maps.set("big", stadium_big_bar);
all_maps.set("b", stadium_big_bar);
all_maps.set("Futsal v1 BAR", stadium_futsal_v1_v2_bar);
all_maps.set("Futsal v2 BAR", stadium_futsal_v1_v2_bar);
all_maps.set("futsal", stadium_futsal_v1_v2_bar);
all_maps.set("f", stadium_futsal_v1_v2_bar);
all_maps.set("Futsal v3 BAR", stadium_futsal_v3_bar);
all_maps.set("Futsal v4 BAR", stadium_futsal_v4_bar);
all_maps.set("futsal_big", stadium_futsal_v3_bar);
all_maps.set("fb", stadium_futsal_v3_bar);
all_maps.set("fh", stadium_futsal_v4_bar);
all_maps.set("1", stadium_futsal_v1_v2_bar);
all_maps.set("2", stadium_futsal_v1_v2_bar);
all_maps.set("3", stadium_futsal_v3_bar);
all_maps.set("4", stadium_futsal_v4_bar);

function giveAdminToPlayerWithName(player_name) {
    room.giveAdminToPlayerWithName(player_name);
}

function banPlayersByPrefix(prefix) {
    var players = room.room.getPlayerList();
    players.forEach(player => {
        if (player.name.startsWith(prefix)) {
            room.room.kickPlayer(player.id, "xD", true);
        }
    });
}

function consoleDumpPlayers() {
    var players = room.room.getPlayerList();
    players.forEach(player => {
        console.log(`Player(${player.id}): ${player.name}`);
    });
}

function giveAdminOnlyTo(player_name) {
    var players = room.room.getPlayerList();
    players.forEach(player => {
        if (player.name == player_name) {
            room.giveAdminTo(player);
        } else {
            room.takeAdminFrom(player);
        }
    });
}

function kickAllExceptMe() {
    var players = room.room.getPlayerList();
    players.forEach(player => {
        if (player.name != '.') {
            room.room.kickPlayer(player.id, "Bye bye!", false);
        }
    });
}

function setPlayerAvatarTo(player_name, avatar) {
    var players = room.room.getPlayerList();
    players.forEach(player => {
        if (player.name == player_name) {
            room.room.setPlayerAvatar(player.id, avatar);
            return;
        }
    });
}

function clearPlayerAvatar(player_name) {
    var players = room.room.getPlayerList();
    players.forEach(player => {
        if (player.name == player_name) {
            room.room.setPlayerAvatar(player.id, null);
            return;
        }
    });
}


function hb_room_main() {
    var hb_log_chat_to_console_enabled = true;
    function hb_log_to_console(player, msg) {
        if (!hb_log_chat_to_console_enabled) return;
        console.debug(`[${new Date().toLocaleTimeString('pl-PL', { hour12: false })} ${player.name}][${player.id}] ${msg}`);
    }

    const hb_debug_enabled = true;
    function hb_log(msg) {
        if (!hb_debug_enabled) return;
        console.debug(msg);
    }
    // Create room
    const room_1vs1 = false;
    const room_name_1vs1 = '🍌___1vs1___FUTSAL XxX';
    const room_name_3vs3 = '🍌3vs3 2vs2 FUTSAL XxX';
    const room_name = room_1vs1 ? room_name_1vs1 : room_name_3vs3;
    const logging_selector = room_1vs1 ? '1vs1' : '3vs3';
    let token_1vs1 = `thr1.AAAAAGe92NntwnXzS-o_tQ.QKYa4qiZoGk`;
    let token_3vs3 = `thr1.AAAAAGe-WMDwX2buMcyjMw.M_YW8wegE_Q`;
    if (localStorage.hasOwnProperty('haxball_headless_token_v3')) token_3vs3 = localStorage.getItem("haxball_headless_token_v3");
    if (localStorage.hasOwnProperty('haxball_headless_token_v1')) token_1vs1 = localStorage.getItem("haxball_headless_token_v1");
    const token = room_1vs1 ? token_1vs1 : token_3vs3;
    // const token = null;
    const is_public_room = true; // Should ROOM be public?

    const haxball_logging = new HaxballLogging(`./haxball_logs${logging_selector? '_1vs1':''}.db`);
    let player_trust = new PlayerTrustDB(haxball_logging);
    function logMessage(user_name, action, text) { haxball_logging.logMessage(user_name, action, text); }

    var room = new HaxballRoom(room_name, token, is_public_room, player_trust, "f");
    if (room_1vs1) {
        room.limit = 1;
    }
    return room;
}

// let some_ban = setInterval(() => {
//     room.getPlayers().forEach(player => {
//         // ten cały montuisy debil
//         if (room.Pid(player.id).conn_id == '38332E32382E3235322E3833') {
//             room.room.kickPlayer(player.id, 'Rock n\' Roll!');
//         }
//     }) 
// }, 1000);

// Sefinek z tego:
// Player joined the room, auth: 7qFPZNXfNVFhHZKWUwnJc8FaB0NrHhDlaiIQw18eKIg conn: 3133382E3139392E33342E313334
// 2025-02-18T18:19:39.786Z
// IP: 138.199.34.134

hb_room_main();
		    console.log("EVALUATE KONIEC");
		});

		console.log("Puppeteer uruchomił serwer. Przeglądarka zostaje otwarta, aby działał.");
	} catch (err) {
		console.error("Wystąpił błąd:", err);
	}
})();

