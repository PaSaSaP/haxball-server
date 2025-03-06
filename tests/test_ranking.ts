import { Match, PlayerStat, PlayerStatInMatch, PlayerData } from './src/structs';
import { Ratings } from './src/rating';
import Glicko2 from 'glicko2';
import { exit } from 'process';

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


function createPlayerStat(id: number, glicko: Glicko2.Glicko2) {
  let stat = new PlayerStat(id);
  stat.glickoPlayer = glicko.makePlayer(1500, 350, 0.06);
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
  match.stat(3).leavedAt = 30;

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
  ratings.debug = true;
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
  match.stat(4).leavedAt = 90; // Gracz 4 wychodzi w połowie

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

