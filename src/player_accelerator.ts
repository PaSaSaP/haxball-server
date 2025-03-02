export class PlayerAccelerator {
  room: RoomObject;
  maxSpeed: number;
  sprintBoost: number;
  slideMinSpeed: number;
  slideBoost: number;
  slideSlowdown: number;
  slideDuration: number;
  activeSprints: Set<number>;
  activeSlides: Map<number, { "startTime": number, "endTime": number, "slowdownStart": number, "slowdown": number }>;
  enabled: boolean;

  constructor(room: RoomObject) {
    this.room = room;
    this.maxSpeed = 5;
    this.sprintBoost = 0.08;
    this.slideMinSpeed = 2;
    this.slideBoost = 6;
    this.slideSlowdown = 0.06;
    this.slideDuration = 2000; // Czas w ms
    this.activeSprints = new Set();
    this.activeSlides = new Map();
    this.enabled = false;
  }

  reset() {
    if (!this.enabled) return;
    this.room.getPlayerList().forEach(player => {
      this.room.setPlayerDiscProperties(player.id, { xgravity: 0, ygravity: 0 });
    });
    this.activeSlides.clear();
    this.activeSprints.clear();
  }

  startSprint(playerId: number) {
    if (!this.enabled) return;
    // Sprawdzenie, czy gracz nie jest w trakcie wślizgu
    if (this.activeSlides.has(playerId)) return;

    this.activeSprints.add(playerId);
  }

  stopSprint(playerId: number) {
    if (!this.enabled) return;
    if (!this.activeSprints.delete(playerId)) return;
    const playerDisc = this.room.getPlayerDiscProperties(playerId);
    if (!playerDisc) return;
    this.room.setPlayerDiscProperties(playerId, { xgravity: 0, ygravity: 0 });
  }

  slide(playerId: number) {
    if (!this.enabled) return;
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
    if (!this.enabled) return;
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
