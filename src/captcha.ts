import { PlayerData } from "./structs";

export class TextCaptcha {
  room: RoomObject;
  pending_captchas: Map<number, { "question": string, "answer": string, "timeout": any }>;
  timeout_ms: number;
  enabled: boolean;

  constructor(room: RoomObject, timeout_ms = 10000) {
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

  clearCaptcha(player: PlayerData) {
    if (!this.hasPendingCaptcha(player)) return;
    let captcha = this.pending_captchas.get(player.id);
    if (captcha) {
      let { timeout } = captcha;
      clearTimeout(timeout);
    }
  }

  askCaptcha(player: PlayerData) {
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
    this.room.sendAnnouncement(`🔒 CAPTCHA: (masz ${this.timeout_ms / 1000}s) Answer/Odpowiedz, ile jest ${captcha.question} = ?`, player.id, 0xFF0000, "bold");
  }

  hasPendingCaptcha(player: PlayerData) {
    return this.pending_captchas.has(player.id);
  }

  checkAnswer(player: PlayerData, message: string) {
    if (!this.hasPendingCaptcha(player)) return false;
    let captcha = this.pending_captchas.get(player.id);
    if (!captcha) return false;
    let { answer, timeout } = captcha;
    if (message.trim() === answer) {
      clearTimeout(timeout);
      this.pending_captchas.delete(player.id);
      this.room.sendAnnouncement(`✅ CAPTCHA: Poprawna odpowiedź od ${player.name}[${player.id}]!`, undefined, 0x00FF00);
      return true;
    }
    return false;
  }
}

export class ScoreCaptcha {
  room: RoomObject;
  pending_captchas: Map<number, { "answer": string, "timeout": any }>;
  timeout_ms: number;
  enabled: boolean;

  constructor(room: RoomObject, timeout_ms = 10000) {
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

  clearCaptcha(player: PlayerData) {
    if (!this.hasPendingCaptcha(player)) return;
    let captcha = this.pending_captchas.get(player.id);
    if (!captcha) return;
    let { timeout } = captcha;
    clearTimeout(timeout);
    this.pending_captchas.delete(player.id);
  }

  askCaptcha(player: PlayerData) {
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

  hasPendingCaptcha(player: PlayerData) {
    return this.pending_captchas.has(player.id);
  }

  checkAnswer(player: PlayerData, message: string) {
    if (!this.hasPendingCaptcha(player)) return false;
    let captcha = this.pending_captchas.get(player.id);
    if (!captcha) return;
    let { timeout } = captcha;
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
        undefined,
        0x00FF00
      );
      return true;
    }
    return false;
  }
}
