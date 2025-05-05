import { PlayerData } from "./structs";

export interface Distances {
  ballRadius: number;
  playerRadius: number;
  rangeSq: number;
  touchingSq: number;
  distances: [number, number][];
}

export class BallPossessionTracker {
  private lastPossession: 0|1|2;
  private possessionStartTime: number;
  private possessionTime: Record<number, number>;
  private distances: Distances;
  constructor() {
    this.lastPossession = 0; // 1 dla czerwonych, 2 dla niebieskich, 0 jeśli brak
    this.possessionStartTime = 0; // Czas, od którego liczymy posiadanie
    this.possessionTime = { 1: 0, 2: 0 }; // Czas posiadania dla każdej drużyny

    this.distances = {
      ballRadius: 6.5,
      playerRadius: 15,
      rangeSq: 0,
      touchingSq: 0,
      distances: [],
    };
    this.distances.rangeSq = (this.distances.playerRadius + this.distances.ballRadius) ** 2; // Kwadrat maksymalnego zasięgu
    this.distances.touchingSq = ((this.distances.playerRadius + this.distances.ballRadius) / 2 + 0.1) ** 2; // Kwadrat minimalnego zasięgu
  }

  getDistances() {
    return this.distances;
  }

  updateRadius(anyPlayerProperties: DiscPropertiesObject | null, ballProperties: DiscPropertiesObject | null, ballDefault: number = 6.5) {
    this.distances.ballRadius = ballProperties?.radius ?? ballDefault;
    this.distances.playerRadius = anyPlayerProperties?.radius ?? 15;
    this.distances.rangeSq = (this.distances.playerRadius + this.distances.ballRadius) ** 2;
    this.distances.touchingSq = (this.distances.playerRadius + this.distances.ballRadius + 0.02) ** 2;
  }

  trackPossession(currentMatchTime: number, ballPos: {x: number, y: number}, players: PlayerData[]) {
    if (!ballPos) return;
    if (!players || players.length === 0) return;

    let closestPlayer = null;
    let minDistance = Infinity;

    // Zmienna do określenia, czy piłka jest wystarczająco blisko gracza, by ją przejął
    let playerPossessionChange = false;

    this.distances.distances.length = 0;
    // Wyszukiwanie najbliższego gracza
    for (const player of players) {
      if (!player.team || !player.position) continue;

      const dx = ballPos.x - player.position.x;
      const dy = ballPos.y - player.position.y;
      const distanceSq = dx * dx + dy * dy; // Kwadrat odległości

      // Sprawdzamy, czy gracz jest w zasięgu piłki (sumujemy promienie gracza i piłki)
      if (distanceSq <= this.distances.rangeSq) {
        playerPossessionChange = true; // Gracz może przejąć piłkę
        if (distanceSq < minDistance) {
          minDistance = distanceSq;
          closestPlayer = player;
        }
      }
      this.distances.distances.push([player.id, distanceSq]); // Zapisujemy odległość gracza od piłki
    }
    this.distances.distances.sort((a, b) => a[1] - b[1]); // Sortujemy odległości rosnąco

    // Jeżeli posiadanie jeszcze nie zostało przypisane, a mecz się dopiero zaczyna
    if (this.lastPossession === 0 && closestPlayer) {
      this.lastPossession = closestPlayer.team;
      this.possessionStartTime = currentMatchTime;
    }

    // Jeżeli posiadanie zostało przypisane
    if (this.lastPossession !== 0) {
      // Zawsze aktualizujemy czas posiadania, jeżeli drużyna nadal posiada piłkę
      this.possessionTime[this.lastPossession] += currentMatchTime - this.possessionStartTime;
    }

    // Jeżeli gracz przejmuje piłkę (wystarczająco blisko), zmieniamy posiadanie
    if (playerPossessionChange && closestPlayer && closestPlayer.team !== this.lastPossession) {
      this.possessionStartTime = currentMatchTime; // Zresetowanie czasu posiadania na nowo
      this.lastPossession = closestPlayer.team; // Zmiana posiadania
    }
  }

  // Resetowanie posiadania przed rozpoczęciem meczu
  resetPossession() {
    this.possessionTime = { 1: 0, 2: 0 }; // Resetujemy czas posiadania
    this.lastPossession = 0;
    this.possessionStartTime = 0; // Resetujemy czas początkowy
    this.distances.distances = []; // Resetujemy odległości
  }

  // Funkcja zwracająca czas posiadania danej drużyny
  getPossessionTime(team: number) {
    return this.possessionTime[team] || 0;
  }

  // Funkcja zwracająca całkowity czas posiadania (łącznie dla obu drużyn)
  getTotalPossessionTime() {
    return this.possessionTime[1] + this.possessionTime[2];
  }

  getCurrentTeamId(): 0|1|2 {
    return this.lastPossession;
  }

  onTeamGoal(team: number) {
    // TODO
  }
}
