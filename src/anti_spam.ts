export class AntiSpam {
  max_messages: number;
  interval_ms: number;
  mute_duration_ms: number;
  initial_mute_ms: number;
  same_message_interval_ms: number;
  message_logs: Map<number, number[]>;
  muted_players: Map<number, number>;
  check_spam_disabled: Set<number>;
  player_messages: Map<number, [number, string][]>;
  enabled: boolean;
  onMute: (playerId: number) => void;

  constructor(max_messages: number, interval_ms: number, mute_duration_ms: number, initial_mute_ms: number = 30000, same_message_interval_ms: number = 10000) {
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
    this.onMute = (playerId: number) => { };
  }

  setOnMute(callback: (playerId: number) => void) {
    this.onMute = callback;
  }

  setEnabled(enabled: boolean = true) {
    this.enabled = enabled;
  }

  setSpamDisabled(player: PlayerObject) {
    this.check_spam_disabled.add(player.id);
  }

  addPlayer(player: PlayerObject, initialMute: boolean = false) {
    const now: number = Date.now();
    if (initialMute)
      this.muted_players.set(player.id, now + this.initial_mute_ms); // Blokada na start
    this.message_logs.set(player.id, []);
    this.player_messages.set(player.id, []);
  }

  canSendMessage(player: PlayerObject, message: string) {
    if (!this.enabled) {
      return true;
    }
    const now: number = Date.now();

    // Sprawdź czy gracz jest zmutowany (początkowy mute lub za spam)
    if (this.muted_players.has(player.id) && now < (this.muted_players.get(player.id) ?? 0)) {
      this.logMessage(player, message, now); // Logujemy wiadomość nawet jeśli nie można wysłać
      return false;
    }

    // Pobierz historię wiadomości (lub stwórz nową)
    if (!this.message_logs.has(player.id)) {
      this.message_logs.set(player.id, []);
    }
    let timestamps: number[] = this.message_logs.get(player.id) ?? [];

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
      this.onMute(player.id);
      return false;
    }

    return true; // Można wysłać wiadomość
  }

  clearMute(playerId: number) {
    this.muted_players.delete(playerId);
  }

  logMessage(player: PlayerObject, message: string, timestamp: number) {
    if (!this.player_messages.has(player.id)) {
      this.player_messages.set(player.id, []);
    }
    let messages: [number, string][] = this.player_messages.get(player.id) ?? [];

    // Ogranicz historię wiadomości do 3 ostatnich
    if (messages.length >= 3) {
      messages.shift();
    }
    messages.push([timestamp, message]);
  }

  similarity(a: string, b: string) {
    let len = Math.max(a.length, b.length);
    if (len === 0) return 1;
    let same = a.split("").filter((char, i) => char === b[i]).length;
    return same / len;
  }

  areSimilarMessages(logs: [number, string][]) {
    if (logs.length < 3) return false;
    let [msg1, msg2, msg3] = logs.slice(-3).map(log => log[1].replace(/\[.*?\]/g, "").trim());
    return this.similarity(msg1, msg2) > 0.8 && this.similarity(msg2, msg3) > 0.8;
  }

  isSpammingSameMessage(player: PlayerObject) {
    if (this.check_spam_disabled.has(player.id)) {
      return false; // User now can spam with similar messages
    }
    if (!this.player_messages.has(player.id)) {
      return false;
    }
    let messages: [number, string][] = this.player_messages.get(player.id) ?? [];

    if (messages.length < 3) {
      return false;
    }

    // Sprawdzenie czy wiadomości są identyczne
    let allSame: boolean = messages.every(([, msg], _, arr) => msg === arr[0][1]);
    if (!allSame) {
      // czy są podobne
      return this.areSimilarMessages(messages);
    }

    // Sprawdzenie, czy wiadomości były wysłane w krótkim odstępie czasu
    let firstTime = messages[0][0];
    let lastTime = messages[messages.length - 1][0];

    return (lastTime - firstTime) <= this.same_message_interval_ms;
  }

  removePlayer(player: PlayerObject) {
    this.message_logs.delete(player.id);
    this.muted_players.delete(player.id);
    this.check_spam_disabled.delete(player.id);
    this.player_messages.delete(player.id);
  }
}
