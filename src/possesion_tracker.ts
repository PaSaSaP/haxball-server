import { PlayerData } from "./structs";

export class BallPossessionTracker {
  room: RoomObject;
  lastPossession: number | null;
  possessionStartTime: number;
  // possessionTime: { "1": number, "2": number };
  possessionTime: Record<number, number>;
  lastTouchTeam: number | null;
  ballRadius: number;
  playerRadius: number;
  constructor(room: RoomObject) {
    this.room = room;
    this.lastPossession = null; // 1 dla czerwonych, 2 dla niebieskich, null jeśli brak
    this.possessionStartTime = 0; // Czas, od którego liczymy posiadanie
    this.possessionTime = { 1: 0, 2: 0 }; // Czas posiadania dla każdej drużyny
    this.lastTouchTeam = null; // Ostatnia drużyna, która kopnęła piłkę

    this.ballRadius = 6.5;
    this.playerRadius = 15;
  }

  updateRadius(anyPlayerProperties: DiscPropertiesObject | null, ballProperties: DiscPropertiesObject | null) {
    this.ballRadius = ballProperties?.radius ?? 6.5;
    this.playerRadius = anyPlayerProperties?.radius ?? 15;
  }

  trackPossession(currentMatchTime: number, ballPos: {x: number, y: number}, players: PlayerData[]) {
    if (!ballPos) return;
    if (!players || players.length === 0) return;

    let closestPlayer = null;
    let minDistance = Infinity;

    // Zmienna do określenia, czy piłka jest wystarczająco blisko gracza, by ją przejął
    let playerPossessionChange = false;
    const rangeSq = (this.playerRadius + this.ballRadius) ** 2; // Kwadrat maksymalnego zasięgu

    // Wyszukiwanie najbliższego gracza
    for (const player of players) {
      if (!player.team || !player.position) continue;

      const dx = ballPos.x - player.position.x;
      const dy = ballPos.y - player.position.y;
      const distanceSq = dx * dx + dy * dy; // Kwadrat odległości

      // Sprawdzamy, czy gracz jest w zasięgu piłki (sumujemy promienie gracza i piłki)
      if (distanceSq <= rangeSq) {
        playerPossessionChange = true; // Gracz może przejąć piłkę
        if (distanceSq < minDistance) {
          minDistance = distanceSq;
          closestPlayer = player;
        }
      }
    }

    // Jeżeli posiadanie jeszcze nie zostało przypisane, a mecz się dopiero zaczyna
    if (this.lastPossession === null && closestPlayer) {
      this.lastPossession = closestPlayer.team;
      this.possessionStartTime = currentMatchTime;
    }

    // Jeżeli posiadanie zostało przypisane
    if (this.lastPossession !== null) {
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
    this.lastPossession = null;
    this.possessionStartTime = 0; // Resetujemy czas początkowy
    this.lastTouchTeam = null; // Resetujemy ostatnią drużynę, która kopnęła piłkę
  }

  // Funkcja zwracająca czas posiadania danej drużyny
  getPossessionTime(team: number) {
    return this.possessionTime[team] || 0;
  }

  // Funkcja zwracająca całkowity czas posiadania (łącznie dla obu drużyn)
  getTotalPossessionTime() {
    return this.possessionTime[1] + this.possessionTime[2];
  }

  // Funkcja do zarejestrowania kopnięcia piłki przez gracza
  registerBallKick(player: PlayerObject) {
    this.lastTouchTeam = player.team;
  }

  onTeamGoal(team: number) {
    // TODO
  }
}
