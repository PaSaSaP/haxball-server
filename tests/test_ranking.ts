import { Match, PlayerStat, PlayerStatInMatch, PlayerData, PlayerLeavedDueTo } from '../src/structs';
import { Ratings } from '../src/rating';
import Glicko2 from 'glicko2';

function assertTrue(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`Assertion failed: ${message} (expected ${expected}, got ${actual})`);
  }
}

function assertApproxEqual(actual: number, expected: number, epsilon: number, message: string): void {
  if (Math.abs(actual - expected) > epsilon) {
    throw new Error(`Assertion failed: ${message} (expected ~${expected}, got ${actual})`);
  }
}

function runTest(testName: string, testFn: () => void): void {
  try {
    testFn();
    console.log(`✓ ${testName} passed`);
  } catch (e: any) {
    console.error(`✗ ${testName} failed: ${e.message}`);
  }
}


function createPlayerStat(id: number, glicko: Glicko2.Glicko2, rating: number = 1500, rd: number = 150, vol: number = 0.02) {
  let stat = new PlayerStat(id);
  stat.glickoPlayer = glicko.makePlayer(rating, rd, vol);
  return stat;
}

runTest("3v3 full match - red team wins", () => {
  let glicko = new Glicko2.Glicko2();
  let ratings = new Ratings(glicko);
  const playerStats = new Map<number, PlayerStat>();
  for (let i = 1; i <= 6; i++) {
    playerStats.set(i, createPlayerStat(i, glicko));
  }

  const match = new Match();
  match.redTeam = [1, 2, 3];
  match.blueTeam = [4, 5, 6];
  match.winnerTeam = 1;
  match.matchEndTime = 3 * 60;

  ratings.updatePlayerStats(match, playerStats);

  for (let i = 1; i <= 3; i++) {
    const player = playerStats.get(i)!;
    assertEqual(player.totalGames, 1, `Player ${i} should have 1 game`);
    assertEqual(player.totalFullGames, 1, `Player ${i} should have 1 full game`);
    assertEqual(player.wonGames, 1, `Player ${i} should have 1 win`);
    const currentRating = player.glickoPlayer!.getRating();
    assertTrue(player.glickoPlayer!.getRating() > 1500, `Player ${i} rating (${currentRating}) should increase`);
  }
  for (let i = 4; i <= 6; i++) {
    const player = playerStats.get(i)!;
    assertEqual(player.totalGames, 1, `Player ${i} should have 1 game`);
    assertEqual(player.totalFullGames, 1, `Player ${i} should have 1 full game`);
    assertEqual(player.wonGames, 0, `Player ${i} should have 0 wins`);
    assertTrue(player.glickoPlayer!.getRating() < 1500, `Player ${i} rating should decrease`);
  }
});

runTest("3v3 one player joins late", () => {
  let glicko = new Glicko2.Glicko2();
  let ratings = new Ratings(glicko);
  const playerStats = new Map<number, PlayerStat>();
  for (let i = 1; i <= 6; i++) {
    playerStats.set(i, createPlayerStat(i, glicko));
  }

  const match = new Match();
  match.redTeam = [1, 2, 3];
  match.blueTeam = [4, 5, 6];
  match.winnerTeam = 1;
  match.matchEndTime = 3 * 60;
  match.stat(2).joinedAt = 150;

  ratings.updatePlayerStats(match, playerStats);

  const player2 = playerStats.get(2)!;
  assertEqual(player2.totalGames, 1, "Player 2 should have 1 game");
  assertEqual(player2.totalFullGames, 0, "Player 2 should have 0 full games");
  assertEqual(player2.wonGames, 1, "Player 2 should have 1 win");
  assertTrue(player2.glickoPlayer!.getRating() > 1500, "Player 2 rating should increase");
  assertApproxEqual(player2.glickoPlayer!.getRating(), 1517, 3, "Player 2 rating change should be small due to late join");
});

runTest("3v3 one player leaves early with lead", () => {
  let glicko = new Glicko2.Glicko2();
  let ratings = new Ratings(glicko);
  const playerStats = new Map<number, PlayerStat>();
  for (let i = 1; i <= 6; i++) {
    playerStats.set(i, createPlayerStat(i, glicko));
  }

  const match = new Match();
  match.redTeam = [1, 2, 3];
  match.blueTeam = [4, 5, 6];
  match.winnerTeam = 1;
  match.goals = [[100, 1], [150, 1], [200, 1]];
  match.matchEndTime = 3 * 60;
  match.stat(3).leftAt = 30;

  ratings.updatePlayerStats(match, playerStats);

  const player3 = playerStats.get(3)!;
  assertEqual(player3.totalGames, 1, "Player 3 should have 1 game");
  assertEqual(player3.totalFullGames, 0, "Player 3 should have 0 full games");
  assertEqual(player3.wonGames, 1, "Player 3 should have 1 win");
  assertTrue(player3.glickoPlayer!.getRating() > 1500, "Player 3 rating should increase");
  assertApproxEqual(player3.glickoPlayer!.getRating(), 1514, 3, "Player 3 rating change should be very small due to early leave");
});

runTest("1000 matches for 20 players with specific win ratios", () => {
  let glicko = new Glicko2.Glicko2();
  let ratings = new Ratings(glicko);
  const playerStats = new Map<number, PlayerStat>();
  for (let i = 1; i <= 20; i++) {
    playerStats.set(i, createPlayerStat(i, glicko));
  }

  const winRatios: Map<number, number> = new Map([
    [1, 0.2],
    [2, 0.8],
    [3, 0.8],
    [4, 0.8],
    [5, 0.2],
    [6, 0.2],
    [7, 0.2],
    [8, 0.2],
    [9, 0.2],
  ]);

    // Liczniki zwycięstw i meczów dla kontroli win ratio
    const wins = new Map<number, number>();
    const games = new Map<number, number>();
    for (let i = 1; i <= 20; i++) {
      wins.set(i, 0);
      games.set(i, 0);
    }

  for (let m = 0; m < 1000; m++) {
    // if (m == 998) ratings.debug = true;
    const match = new Match();
    const allPlayers = Array.from(playerStats.keys());
    const shuffled = allPlayers.sort(() => Math.random() - 0.5);
    match.redTeam = shuffled.slice(0, 3);
    match.blueTeam = shuffled.slice(3, 6);
    match.matchEndTime = 3 * 60;
    
    let redWinProb = 0;
    let redPlayersBelowTarget = 0;
    let bluePlayersBelowTarget = 0;

    match.redTeam.forEach(id => {
      const targetRatio = winRatios.get(id) || 0.5;
      const currentRatio = games.get(id)! > 0 ? wins.get(id)! / games.get(id)! : targetRatio;
      redWinProb += targetRatio;
      if (currentRatio < targetRatio) redPlayersBelowTarget++;
    });

    match.blueTeam.forEach(id => {
      const targetRatio = winRatios.get(id) || 0.5;
      const currentRatio = games.get(id)! > 0 ? wins.get(id)! / games.get(id)! : targetRatio;
      redWinProb -= targetRatio;
      if (currentRatio < targetRatio) bluePlayersBelowTarget++;
    });

    // Decyzja o zwycięzcy z preferencją dla drużyny z graczami poniżej targetu
    match.winnerTeam = redPlayersBelowTarget > bluePlayersBelowTarget || 
                      (redPlayersBelowTarget === bluePlayersBelowTarget && Math.random() < 0.5 + redWinProb / 6) 
                      ? 1 : 2;

    // let redWinProb = 0;
    // match.redTeam.forEach(id => redWinProb += Math.pow(winRatios.get(id) || 0.5, 2)); // Kwadrat wzmacnia różnice
    // match.blueTeam.forEach(id => redWinProb -= Math.pow(winRatios.get(id) || 0.5, 2));
    // match.winnerTeam = Math.random() < (redWinProb / (Math.abs(redWinProb) + 1)) ? 1 : 2; // Normalizacja i losowość


    ratings.updatePlayerStats(match, playerStats);

        // Aktualizacja liczników
        match.redTeam.forEach(id => {
          games.set(id, (games.get(id) || 0) + 1);
          if (match.winnerTeam === 1) wins.set(id, (wins.get(id) || 0) + 1);
        });
        match.blueTeam.forEach(id => {
          games.set(id, (games.get(id) || 0) + 1);
          if (match.winnerTeam === 2) wins.set(id, (wins.get(id) || 0) + 1);
        });
  }
  // ratings.debug = true;
  ratings.LogTop();

  const player1 = playerStats.get(1)!;
  assertApproxEqual(player1.wonGames / player1.totalGames, 0.12, 0.05, "Player 1 win ratio should be ~12%");
  assertTrue(player1.glickoPlayer!.getRating() < 1500, "Player 1 rating should be below average");

  const player2 = playerStats.get(2)!;
  assertApproxEqual(player2.wonGames / player2.totalGames, 0.8, 0.05, "Player 2 win ratio should be ~80%");
  assertTrue(player2.glickoPlayer!.getRating() > 1500, "Player 2 rating should be above average");

  const player5 = playerStats.get(5)!;
  assertApproxEqual(player5.wonGames / player5.totalGames, 0.2, 0.05, "Player 5 win ratio should be ~20%");
  assertTrue(player5.glickoPlayer!.getRating() < 1500, "Player 5 rating should be below average");
});

runTest("3v3 rematch after close win - rating stabilization", () => {
  let glicko = new Glicko2.Glicko2();
  let ratings = new Ratings(glicko);
  // ratings.debug = true;
  const playerStats = new Map<number, PlayerStat>();
  for (let i = 1; i <= 6; i++) {
    playerStats.set(i, createPlayerStat(i, glicko));
  }

  const match1 = new Match();
  match1.redTeam = [1, 2, 3];
  match1.blueTeam = [4, 5, 6];
  match1.winnerTeam = 1;
  match1.goals = [[3 * 60 - 10, 1]]; // Czerwoni wygrywają 1:0 w ostatniej chwili
  match1.matchEndTime = 3 * 60;
  ratings.updatePlayerStats(match1, playerStats);
  ratings.LogTop();

  const match2 = new Match();
  match2.redTeam = [1, 2, 3];
  match2.blueTeam = [4, 5, 6];
  match2.winnerTeam = 2;
  match2.goals = [[3 * 60 - 10, 2]]; // Niebiescy wygrywają 1:0
  match2.matchEndTime = 3 * 60;
  ratings.updatePlayerStats(match2, playerStats);
  ratings.LogTop();

  const player1 = playerStats.get(1)!;
  assertEqual(player1.totalGames, 2, "Player 1 should have 2 games");
  assertEqual(player1.wonGames, 1, "Player 1 should have 1 win");
  assertApproxEqual(player1.glickoPlayer!.getRating(), 1500, 20, "Player 1 rating should stabilize near 1500");

  const player4 = playerStats.get(4)!;
  assertEqual(player4.totalGames, 2, "Player 4 should have 2 games");
  assertEqual(player4.wonGames, 1, "Player 4 should have 1 win");
  assertApproxEqual(player4.glickoPlayer!.getRating(), 1500, 20, "Player 4 rating should stabilize near 1500");
});

runTest("3vs3 rematch - win then lose x 1000", () => {
  let glicko = new Glicko2.Glicko2();
  let ratings = new Ratings(glicko);
  const playerStats = new Map<number, PlayerStat>();
  for (let i = 1; i <= 6; i++) {
    playerStats.set(i, createPlayerStat(i, glicko));
  }
  let rdLog = 300;

  for (let i = 0; i < 500; i++) {
    const match1 = new Match();
    match1.redTeam = [1, 2, 3];
    match1.blueTeam = [4, 5, 6];
    match1.winnerTeam = 1;
    match1.goals = [[3 * 60 - 10, 1]]; // Czerwoni wygrywają 1:0 w ostatniej chwili
    match1.matchEndTime = 3 * 60;
    ratings.updatePlayerStats(match1, playerStats);

    const match2 = new Match();
    match2.redTeam = [1, 2, 3];
    match2.blueTeam = [4, 5, 6];
    match2.winnerTeam = 2;
    match2.goals = [[3 * 60 - 10, 2]]; // Niebiescy wygrywają 1:0
    match2.matchEndTime = 3 * 60;
    ratings.updatePlayerStats(match2, playerStats);

    let rd = playerStats.get(1)!.glickoPlayer!.getRd();
    if (rd < rdLog) {
      rdLog -= 30;
      // console.log(`i=${i} for rd level ${rdLog}, rd=${rd}`);
    }
  }
  // ratings.debug = true;
  ratings.LogTop();

  const player1 = playerStats.get(1)!;
  assertEqual(player1.totalGames, 1000, "Player 1 should have 1000 games");
  assertEqual(player1.wonGames, 500, "Player 1 should have 500 win");
  assertApproxEqual(player1.glickoPlayer!.getRating(), 1500, 20, "Player 1 rating should stabilize near 1500");

  const player4 = playerStats.get(4)!;
  assertEqual(player4.totalGames, 1000, "Player 4 should have 1000 games");
  assertEqual(player4.wonGames, 500, "Player 4 should have 500 win");
  assertApproxEqual(player4.glickoPlayer!.getRating(), 1500, 20, "Player 4 rating should stabilize near 1500");
});

runTest("3v3 unbalanced teams - rating reflects skill gap", () => {
  let glicko = new Glicko2.Glicko2();
  let ratings = new Ratings(glicko);
  // ratings.debug = true;
  const playerStats = new Map<number, PlayerStat>();
  for (let i = 1; i <= 6; i++) {
    playerStats.set(i, createPlayerStat(i, glicko));
    if (i <= 3) playerStats.get(i)!.glickoPlayer!.setRating(2000); // Czerwoni zaczynają z wysokim ratingiem
    if (i <= 3) playerStats.get(i)!.glickoPlayer!.setRd(60); // Czerwoni się utrzymują na tym ratingu
    if (i <= 3) playerStats.get(i)!.glickoPlayer!.setVol(0.04); // Niższa zmienność

  }

  const match = new Match();
  match.redTeam = [1, 2, 3];
  match.blueTeam = [4, 5, 6];
  match.winnerTeam = 1;
  match.matchEndTime = 3 * 60;

  ratings.updatePlayerStats(match, playerStats);
  ratings.LogTop();

  const player1 = playerStats.get(1)!;
  assertTrue(player1.glickoPlayer!.getRating() > 2000, "Player 1 rating should increase slightly from 2000");
  assertApproxEqual(player1.glickoPlayer!.getRating(), 2010, 20, "Player 1 rating change should be small due to expected win");

  const player4 = playerStats.get(4)!;
  assertTrue(player4.glickoPlayer!.getRating() < 1500, "Player 4 rating should decrease");
  assertApproxEqual(player4.glickoPlayer!.getRating(), 1430, 10, "Player 4 rating change should be small due to expected loss");
});

runTest("3v3 partial participation - weights affect rating", () => {
  let glicko = new Glicko2.Glicko2();
  let ratings = new Ratings(glicko);
  const playerStats = new Map<number, PlayerStat>();
  for (let i = 1; i <= 6; i++) {
    playerStats.set(i, createPlayerStat(i, glicko));
  }

  const match = new Match();
  match.redTeam = [1, 2, 3];
  match.blueTeam = [4, 5, 6];
  match.winnerTeam = 1;
  match.matchEndTime = 3 * 60;
  match.stat(1).joinedAt = 90; // Gracz 1 dołącza w połowie
  match.stat(4).leftAt = 90; // Gracz 4 wychodzi w połowie

  ratings.updatePlayerStats(match, playerStats);

  const player1 = playerStats.get(1)!;
  assertEqual(player1.totalGames, 1, "Player 1 should have 1 game");
  assertEqual(player1.totalFullGames, 0, "Player 1 should have 0 full games");
  assertEqual(player1.wonGames, 1, "Player 1 should have 1 win");
  assertTrue(player1.glickoPlayer!.getRating() > 1500, "Player 1 rating should increase");
  assertApproxEqual(player1.glickoPlayer!.getRating(), 1505, 10, "Player 1 rating change should be small due to late join");

  const player4 = playerStats.get(4)!;
  assertEqual(player4.totalGames, 1, "Player 4 should have 1 game");
  assertEqual(player4.totalFullGames, 0, "Player 4 should have 0 full games");
  assertEqual(player4.wonGames, 0, "Player 4 should have 0 wins");
  assertTrue(player4.glickoPlayer!.getRating() < 1500, "Player 4 rating should decrease");
  assertApproxEqual(player4.glickoPlayer!.getRating(), 1495, 10, "Player 4 rating change should be small due to early leave");
});

runTest("3v3 - AFK penalty at halftime", () => {
  let glicko = new Glicko2.Glicko2();
  let ratings = new Ratings(glicko);
  const playerStats = new Map<number, PlayerStat>();
  for (let i = 1; i <= 6; i++) {
    playerStats.set(i, createPlayerStat(i, glicko));
  }

  const match = new Match();
  match.redTeam = [1, 2, 3];
  match.blueTeam = [4, 5, 6];
  match.winnerTeam = 1;
  match.matchEndTime = 3 * 60; // 180s
  match.stat(4).leftAt = 90; // Gracz 4 wychodzi w połowie
  match.stat(4).leftDueTo = PlayerLeavedDueTo.afk;

  ratings.updatePlayerStats(match, playerStats);

  const player4 = playerStats.get(4)!;
  assertEqual(player4.totalGames, 1, "Player 4 should have 1 game");
  assertTrue(player4.glickoPlayer!.getRating() < 1500, "Player 4 rating should decrease due to AFK");
  assertApproxEqual(player4.glickoPlayer!.getRating(), 1475, 15, "Player 4 should lose ~25 points for AFK at halftime");
});

runTest("3v3 - VoteKicked penalty near start", () => {
  let glicko = new Glicko2.Glicko2();
  let ratings = new Ratings(glicko);
  // ratings.debug = true;
  const playerStats = new Map<number, PlayerStat>();
  for (let i = 1; i <= 6; i++) {
    playerStats.set(i, createPlayerStat(i, glicko));
  }

  const match = new Match();
  match.redTeam = [1, 2, 3];
  match.blueTeam = [4, 5, 6];
  match.winnerTeam = 1;
  match.matchEndTime = 3 * 60; // 180s
  match.stat(2).leftAt = 30; // Gracz 2 wychodzi po 30s
  match.stat(2).leftDueTo = PlayerLeavedDueTo.voteKicked;

  ratings.updatePlayerStats(match, playerStats);

  const player2 = playerStats.get(2)!;
  assertEqual(player2.totalGames, 1, "Player 2 should have 1 game");
  assertTrue(player2.glickoPlayer!.getRating() < 1500, "Player 2 rating should decrease due to vote kick");
  assertApproxEqual(player2.glickoPlayer!.getRating(), 1485, 10, "Player 2 should lose ~15 points for vote kick near start");
});

runTest("3v3 - LeftServer penalty late but before 90%", () => {
  let glicko = new Glicko2.Glicko2();
  let ratings = new Ratings(glicko);
  const playerStats = new Map<number, PlayerStat>();
  for (let i = 1; i <= 6; i++) {
    playerStats.set(i, createPlayerStat(i, glicko));
  }

  const match = new Match();
  match.redTeam = [1, 2, 3];
  match.blueTeam = [4, 5, 6];
  match.winnerTeam = 2;
  match.matchEndTime = 3 * 60; // 180s
  match.stat(1).leftAt = 150; // Gracz 1 wychodzi na 30s przed końcem (83%)
  match.stat(1).leftDueTo = PlayerLeavedDueTo.leftServer;

  ratings.updatePlayerStats(match, playerStats);

  const player1 = playerStats.get(1)!;
  assertEqual(player1.totalGames, 1, "Player 1 should have 1 game");
  assertTrue(player1.glickoPlayer!.getRating() < 1500, "Player 1 rating should decrease due to leaving server");
  assertApproxEqual(player1.glickoPlayer!.getRating(), 1175, 10, "Player 1 should lose ~10 points for leaving late");
});

runTest("AFK at start", () => {
  let glicko = new Glicko2.Glicko2();
  let ratings = new Ratings(glicko);
  // ratings.debug = true;
  const playerStats = new Map<number, PlayerStat>();
  for (let i = 1; i <= 6; i++) playerStats.set(i, createPlayerStat(i, glicko));
  const match = new Match();
  match.redTeam = [1, 2, 3]; match.blueTeam = [4, 5, 6]; match.winnerTeam = 1; match.matchEndTime = 180;
  match.stat(4).leftAt = 0; match.stat(4).leftDueTo = PlayerLeavedDueTo.afk;
  ratings.updatePlayerStats(match, playerStats);
  assertTrue(playerStats.get(4)!.glickoPlayer!.getRating() < 1450, "Player 4 should lose ~50 for AFK at start");
});

runTest("AFK at start 5s loser", () => {
  let glicko = new Glicko2.Glicko2();
  let ratings = new Ratings(glicko);
  // ratings.debug = true;
  const playerStats = new Map<number, PlayerStat>();
  for (let i = 1; i <= 6; i++) playerStats.set(i, createPlayerStat(i, glicko));
  const match = new Match();
  match.redTeam = [1, 2, 3]; match.blueTeam = [4, 5, 6]; match.winnerTeam = 1; match.matchEndTime = 180;
  match.stat(4).leftAt = 5; match.stat(4).leftDueTo = PlayerLeavedDueTo.afk;
  ratings.updatePlayerStats(match, playerStats);
  assertTrue(playerStats.get(4)!.glickoPlayer!.getRating() < 1450, "Player 4 should lose ~50 for AFK at start");
});

runTest("AFK at start 5s winner", () => {
  let glicko = new Glicko2.Glicko2();
  let ratings = new Ratings(glicko);
  // ratings.debug = true;
  const playerStats = new Map<number, PlayerStat>();
  for (let i = 1; i <= 6; i++) playerStats.set(i, createPlayerStat(i, glicko));
  const match = new Match();
  match.redTeam = [1, 2, 3]; match.blueTeam = [4, 5, 6]; match.winnerTeam = 2; match.matchEndTime = 180;
  match.stat(4).leftAt = 5; match.stat(4).leftDueTo = PlayerLeavedDueTo.afk;
  ratings.updatePlayerStats(match, playerStats);
  assertTrue(playerStats.get(4)!.glickoPlayer!.getRating() < 1450, "Player 4 should lose ~50 for AFK at start");
});

runTest("AFK at end", () => {
  let glicko = new Glicko2.Glicko2();
  let ratings = new Ratings(glicko);
  // ratings.debug = true;
  const playerStats = new Map<number, PlayerStat>();
  for (let i = 1; i <= 6; i++) playerStats.set(i, createPlayerStat(i, glicko));
  const match = new Match();
  match.redTeam = [1, 2, 3]; match.blueTeam = [4, 5, 6]; match.winnerTeam = 1; match.matchEndTime = 180;
  match.stat(4).leftAt = 170; match.stat(4).leftDueTo = PlayerLeavedDueTo.afk;
  ratings.updatePlayerStats(match, playerStats);
  assertTrue(playerStats.get(4)!.glickoPlayer!.getRating() > 1470, "Player 4 should lose <30 for AFK near end");
});

runTest("LeftServer at start", () => {
  let glicko = new Glicko2.Glicko2();
  let ratings = new Ratings(glicko);
  // ratings.debug = true;
  const playerStats = new Map<number, PlayerStat>();
  for (let i = 1; i <= 6; i++) playerStats.set(i, createPlayerStat(i, glicko));
  const match = new Match();
  match.redTeam = [1, 2, 3]; match.blueTeam = [4, 5, 6]; match.winnerTeam = 1; match.matchEndTime = 180;
  match.stat(4).leftAt = 0; match.stat(4).leftDueTo = PlayerLeavedDueTo.leftServer;
  ratings.updatePlayerStats(match, playerStats);
  assertTrue(playerStats.get(4)!.glickoPlayer!.getRating() < 1470, "Player 4 should lose ~30 for leaving at start");
});

runTest("LeftServer at end", () => {
  let glicko = new Glicko2.Glicko2();
  let ratings = new Ratings(glicko);
  // ratings.debug = true;
  const playerStats = new Map<number, PlayerStat>();
  for (let i = 1; i <= 6; i++) playerStats.set(i, createPlayerStat(i, glicko));
  const match = new Match();
  match.redTeam = [1, 2, 3]; match.blueTeam = [4, 5, 6]; match.winnerTeam = 1; match.matchEndTime = 180;
  match.stat(4).leftAt = 170; match.stat(4).leftDueTo = PlayerLeavedDueTo.leftServer;
  ratings.updatePlayerStats(match, playerStats);
  assertTrue(playerStats.get(4)!.glickoPlayer!.getRating() > 1200, "Player 4 should lose <20 for leaving near end");
});

runTest("LeftServer at beginning", () => {
  let glicko = new Glicko2.Glicko2();
  let ratings = new Ratings(glicko);
  // ratings.debug = true;
  const playerStats = new Map<number, PlayerStat>();
  for (let i = 1; i <= 6; i++) playerStats.set(i, createPlayerStat(i, glicko));
  const match = new Match();
  match.redTeam = [1, 2, 3]; match.blueTeam = [4, 5, 6]; match.winnerTeam = 1; match.matchEndTime = 180;
  match.stat(4).leftAt = 0; match.stat(4).leftDueTo = PlayerLeavedDueTo.leftServer;
  ratings.updatePlayerStats(match, playerStats);
  assertTrue(playerStats.get(4)!.glickoPlayer!.getRating() > 1200, "Player 4 should lose <20 for leaving near end");
});

runTest("Join mid-game, no leave - no penalty", () => {
  let glicko = new Glicko2.Glicko2();
  let ratings = new Ratings(glicko);
  // ratings.debug = true;
  const playerStats = new Map<number, PlayerStat>();
  for (let i = 1; i <= 6; i++) playerStats.set(i, createPlayerStat(i, glicko));
  const match = new Match();
  match.redTeam = [1, 2, 3]; match.blueTeam = [4, 5, 6]; match.winnerTeam = 1; match.matchEndTime = 180;
  match.stat(4).joinedAt = 90; // Dołącza w połowie
  ratings.updatePlayerStats(match, playerStats);
  assertTrue(playerStats.get(4)!.glickoPlayer!.getRating() >= 1500, "Player 4 should not lose rating for joining mid-game");
});

runTest("Join mid-game, AFK mid-game - penalty", () => {
  let glicko = new Glicko2.Glicko2();
  let ratings = new Ratings(glicko);
  // ratings.debug = true;
  const playerStats = new Map<number, PlayerStat>();
  for (let i = 1; i <= 6; i++) playerStats.set(i, createPlayerStat(i, glicko));
  const match = new Match();
  match.redTeam = [1, 2, 3]; match.blueTeam = [4, 5, 6]; match.winnerTeam = 1; match.matchEndTime = 180;
  match.stat(4).joinedAt = 60; match.stat(4).leftAt = 120; match.stat(4).leftDueTo = PlayerLeavedDueTo.afk;
  ratings.updatePlayerStats(match, playerStats);
  assertTrue(playerStats.get(4)!.glickoPlayer!.getRating() < 1500, "Player 4 should lose rating for AFK after joining mid-game");
});

runTest("Join at start, leave mid-game - penalty", () => {
  let glicko = new Glicko2.Glicko2();
  let ratings = new Ratings(glicko);
  // ratings.debug = true;
  const playerStats = new Map<number, PlayerStat>();
  for (let i = 1; i <= 6; i++) playerStats.set(i, createPlayerStat(i, glicko));
  const match = new Match();
  match.redTeam = [1, 2, 3]; match.blueTeam = [4, 5, 6]; match.winnerTeam = 1; match.matchEndTime = 180;
  match.stat(4).joinedAt = 0; match.stat(4).leftAt = 90; match.stat(4).leftDueTo = PlayerLeavedDueTo.leftServer;
  ratings.updatePlayerStats(match, playerStats);
  assertTrue(playerStats.get(4)!.glickoPlayer!.getRating() < 1470, "Player 4 should lose rating for leaving mid-game");
});

runTest("Join mid-game, finish - gain rating", () => {
  let glicko = new Glicko2.Glicko2();
  let ratings = new Ratings(glicko);
  // ratings.debug = true;
  const playerStats = new Map<number, PlayerStat>();
  for (let i = 1; i <= 6; i++) playerStats.set(i, createPlayerStat(i, glicko));
  const match = new Match();
  match.redTeam = [1, 2, 3]; match.blueTeam = [4, 5, 6]; match.winnerTeam = 2; match.matchEndTime = 180;
  match.stat(5).joinedAt = 90; // Dołącza w połowie, wygrywa
  ratings.updatePlayerStats(match, playerStats);
  assertTrue(playerStats.get(5)!.glickoPlayer!.getRating() > 1500, "Player 5 should gain rating for joining mid-game and winning");
});

runTest("Mid-game join, big impact", () => {
  let glicko = new Glicko2.Glicko2();
  let ratings = new Ratings(glicko);
  const playerStats = new Map<number, PlayerStat>();
  for (let i = 1; i <= 6; i++) playerStats.set(i, createPlayerStat(i, glicko));
  const match = new Match();
  match.redTeam = [1, 2, 3]; match.blueTeam = [4, 5, 6]; match.winnerTeam = 2; match.matchEndTime = 180;
  match.stat(5).joinedAt = 90; match.goals = [[100, 2], [120, 2]]; // +2 po dołączeniu
  ratings.updatePlayerStats(match, playerStats);
  assertTrue(playerStats.get(5)!.glickoPlayer!.getRating() > 1500, "Player 5 should gain for big impact");
});

runTest("Join then leave", () => {
  let glicko = new Glicko2.Glicko2();
  let ratings = new Ratings(glicko);
  // ratings.debug = true;
  const playerStats = new Map<number, PlayerStat>();
  for (let i = 1; i <= 6; i++) playerStats.set(i, createPlayerStat(i, glicko));
  const match = new Match();
  match.redTeam = [1, 2, 3]; match.blueTeam = [4, 5, 6]; match.winnerTeam = 2; match.matchEndTime = 180;
  match.stat(5).joinedAt = 90; match.stat(5).leftAt = 130; match.stat(5).leftDueTo = PlayerLeavedDueTo.leftServer;
  match.goals = [[100, 2], [120, 2]]; // +2 po dołączeniu
  ratings.updatePlayerStats(match, playerStats);
  assertTrue(playerStats.get(5)!.glickoPlayer!.getRating() > 1500, "Player 5 should gain for big impact");
});

runTest("Top player with 2200 loses with teammates 1850 vs 1750 opponents", () => {
  let glicko = new Glicko2.Glicko2();
  let ratings = new Ratings(glicko);
  // ratings.debug = true;
  const playerStats = new Map<number, PlayerStat>();

  // Tworzenie graczy z określonymi ratingami i RD = 30
  playerStats.set(1, createPlayerStat(1, glicko, 2200, 30, 0.02)); // Top gracz
  playerStats.set(2, createPlayerStat(2, glicko, 1850, 30, 0.02)); // Teammate 1
  playerStats.set(3, createPlayerStat(3, glicko, 1850, 30, 0.02)); // Teammate 2
  playerStats.set(4, createPlayerStat(4, glicko, 1750, 30, 0.02)); // Przeciwnik 1
  playerStats.set(5, createPlayerStat(5, glicko, 1750, 30, 0.02)); // Przeciwnik 2
  playerStats.set(6, createPlayerStat(6, glicko, 1750, 30, 0.02)); // Przeciwnik 3

  // Definiowanie meczu: czerwoni (2200, 1850, 1850) vs niebiescy (1750, 1750, 1750)
  const match = new Match();
  match.redTeam = [1, 2, 3]; // Drużyna z top graczem
  match.blueTeam = [4, 5, 6]; // Drużyna przeciwna
  match.winnerTeam = 2; // Niebiescy wygrywają (2 = blue team)
  match.matchEndTime = 180; // Standardowy czas meczu (3 minuty)

  // Aktualizacja statystyk po meczu
  ratings.updatePlayerStats(match, playerStats);

  // Sprawdzenie wyników
  const topPlayerRatingAfter = playerStats.get(1)!.glickoPlayer!.getRating();
  console.log(`Top player rating after loss: ${topPlayerRatingAfter}`);
  assertTrue(topPlayerRatingAfter < 2200, "Player 1 (2200) should lose rating after losing to weaker team");
  assertTrue(topPlayerRatingAfter > 2100, "Player 1 should not drop below 2100 from 2200 in one game");
});


runTest("Top player with 2200 loses with teammates 1850 vs 1750 opponents current", () => {
  let glicko = new Glicko2.Glicko2();
  let ratings = new Ratings(glicko);
  // ratings.debug = true;
  const playerStats = new Map<number, PlayerStat>();

  // Tworzenie graczy z określonymi ratingami i RD = 30
  playerStats.set(1, createPlayerStat(1, glicko, 2200, 80, 0.06)); // Top gracz
  playerStats.set(2, createPlayerStat(2, glicko, 1850, 80, 0.06)); // Teammate 1
  playerStats.set(3, createPlayerStat(3, glicko, 1850, 80, 0.06)); // Teammate 2
  playerStats.set(4, createPlayerStat(4, glicko, 1750, 80, 0.06)); // Przeciwnik 1
  playerStats.set(5, createPlayerStat(5, glicko, 1750, 80, 0.06)); // Przeciwnik 2
  playerStats.set(6, createPlayerStat(6, glicko, 1750, 80, 0.06)); // Przeciwnik 3

  // Definiowanie meczu: czerwoni (2200, 1850, 1850) vs niebiescy (1750, 1750, 1750)
  const match = new Match();
  match.redTeam = [1, 2, 3]; // Drużyna z top graczem
  match.blueTeam = [4, 5, 6]; // Drużyna przeciwna
  match.winnerTeam = 2; // Niebiescy wygrywają (2 = blue team)
  match.matchEndTime = 180; // Standardowy czas meczu (3 minuty)

  // Aktualizacja statystyk po meczu
  ratings.updatePlayerStats(match, playerStats);

  // Sprawdzenie wyników
  const topPlayerRatingAfter = playerStats.get(1)!.glickoPlayer!.getRating();
  console.log(`Top player rating after loss: ${topPlayerRatingAfter}`);
  assertTrue(topPlayerRatingAfter < 2200, "Player 1 (2200) should lose rating after losing to weaker team");
  assertTrue(topPlayerRatingAfter > 2100, "Player 1 should not drop below 2100 from 2200 in one game");
});

runTest("Player with 2 wins and 1 loss reaching rating milestones", () => {
  let glicko = new Glicko2.Glicko2();
  let ratings = new Ratings(glicko);
  // ratings.debug = true;
  const playerStats = new Map<number, PlayerStat>();

  // Inicjalizacja graczy (wszyscy z domyślnymi wartościami)
  for (let i = 1; i <= 7; i++) playerStats.set(i, createPlayerStat(i, glicko, 1500, 150, 0.02));
  // Gracz 1 to nasz testowany gracz, 2 i 3 to teammates, 4-7 to przeciwnicy

  const milestones = [1600, 1700, 1800, 1900, 2000, 2100, 2200];
  let matchesPlayed = 0;
  let currentRating = 1500;

  while (currentRating < 2200) {
    // Cykl: 2 wygrane, 1 przegrana
    for (let i = 0; i < 3; i++) {
      const match = new Match();
      match.redTeam = [1, 2, 3]; // Nasz gracz + teammates
      match.blueTeam = [4, 5, 6]; // Przeciwnicy
      match.matchEndTime = 180;

      if (i < 2) {
        match.winnerTeam = 1; // Wygrana czerwonych (2 razy)
      } else {
        match.winnerTeam = 2; // Przegrana czerwonych (1 raz)
      }

      ratings.updatePlayerStats(match, playerStats);
      matchesPlayed++;
      currentRating = playerStats.get(1)!.glickoPlayer!.getRating();
      for (let i = 2; i <= 6; i++) playerStats.get(i)!.glickoPlayer?.setRating(currentRating);

      // Logowanie przekroczenia progów
      for (const milestone of milestones) {
        if (currentRating >= milestone && playerStats.get(1)!.glickoPlayer!.getRating() - milestone < 50) {
          console.log(`Reached ${milestone} after ${matchesPlayed} matches`);
          milestones.splice(milestones.indexOf(milestone), 1); // Usuwamy osiągnięty próg
          break;
        }
      }
    }
  }
  ratings.debug = true;
  ratings.LogTop();
});

runTest("Player with 3 wins and 1 loss reaching rating milestones", () => {
  let glicko = new Glicko2.Glicko2();
  let ratings = new Ratings(glicko);
  // ratings.debug = true;
  const playerStats = new Map<number, PlayerStat>();

  // Inicjalizacja graczy (wszyscy z domyślnymi wartościami)
  for (let i = 1; i <= 7; i++) playerStats.set(i, createPlayerStat(i, glicko, 1500, 150, 0.02));

  const milestones = [1600, 1700, 1800, 1900, 2000, 2100, 2200];
  let matchesPlayed = 0;
  let currentRating = 1500;

  while (currentRating < 2200) {
    // Cykl: 3 wygrane, 1 przegrana
    for (let i = 0; i < 4; i++) {
      const match = new Match();
      match.redTeam = [1, 2, 3]; // Nasz gracz + teammates
      match.blueTeam = [4, 5, 6]; // Przeciwnicy
      match.matchEndTime = 180;

      if (i < 3) {
        match.winnerTeam = 1; // Wygrana czerwonych (3 razy)
      } else {
        match.winnerTeam = 2; // Przegrana czerwonych (1 raz)
      }

      ratings.updatePlayerStats(match, playerStats);
      matchesPlayed++;
      currentRating = playerStats.get(1)!.glickoPlayer!.getRating();
      for (let i = 2; i <= 6; i++) playerStats.get(i)!.glickoPlayer?.setRating(currentRating);

      // Logowanie przekroczenia progów
      for (const milestone of milestones) {
        if (currentRating >= milestone && playerStats.get(1)!.glickoPlayer!.getRating() - milestone < 50) {
          console.log(`Reached ${milestone} after ${matchesPlayed} matches`);
          milestones.splice(milestones.indexOf(milestone), 1);
          break;
        }
      }
    }
  }
  ratings.debug = true;
  ratings.LogTop();
});

runTest("Player with 4 wins and 1 loss reaching rating milestones", () => {
  let glicko = new Glicko2.Glicko2();
  let ratings = new Ratings(glicko);
  // ratings.debug = true;
  const playerStats = new Map<number, PlayerStat>();

  // Inicjalizacja graczy (wszyscy z domyślnymi wartościami)
  for (let i = 1; i <= 7; i++) playerStats.set(i, createPlayerStat(i, glicko, 1500, 150, 0.02));

  const milestones = [1600, 1700, 1800, 1900, 2000, 2100, 2200];
  let matchesPlayed = 0;
  let currentRating = 1500;

  while (currentRating < 2200) {
    // Cykl: 4 wygrane, 1 przegrana
    for (let i = 0; i < 5; i++) {
      const match = new Match();
      match.redTeam = [1, 2, 3]; // Nasz gracz + teammates
      match.blueTeam = [4, 5, 6]; // Przeciwnicy
      match.matchEndTime = 180;

      if (i < 4) {
        match.winnerTeam = 1; // Wygrana czerwonych (4 razy)
      } else {
        match.winnerTeam = 2; // Przegrana czerwonych (1 raz)
      }

      ratings.updatePlayerStats(match, playerStats);
      matchesPlayed++;
      currentRating = playerStats.get(1)!.glickoPlayer!.getRating();
      for (let i = 2; i <= 6; i++) playerStats.get(i)!.glickoPlayer?.setRating(currentRating);

      // Logowanie przekroczenia progów
      for (const milestone of milestones) {
        if (currentRating >= milestone && playerStats.get(1)!.glickoPlayer!.getRating() - milestone < 50) {
          console.log(`Reached ${milestone} after ${matchesPlayed} matches`);
          milestones.splice(milestones.indexOf(milestone), 1);
          break;
        }
      }
    }
  }
  ratings.debug = true;
  ratings.LogTop();
});
