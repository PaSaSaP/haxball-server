Update rating in db

```sql
# for 3vs3
INSERT INTO player_ratings (auth_id, rating, rd, volatility)
SELECT auth_id, mu AS rating, rd, vol AS volatility
FROM rolling_ratings
WHERE date = '2025-03-12'
ON CONFLICT(auth_id) DO UPDATE
SET rating = excluded.rating,
    rd = excluded.rd,
    volatility = excluded.volatility;
```

```sql
# for 4vs4
INSERT INTO player_ratings (auth_id, rating, rd, volatility)
SELECT auth_id, mu AS rating, rd, vol AS volatility
FROM rolling_ratings
WHERE date = '2025-03-17'
ON CONFLICT(auth_id) DO UPDATE
SET rating = excluded.rating,
    rd = excluded.rd,
    volatility = excluded.volatility;
```

```
BEGIN TRANSACTION;
DELETE FROM player_match_stats;
INSERT INTO player_match_stats (auth_id, games, full_games, wins, full_wins, goals, assists, own_goals, playtime, clean_sheets, left_afk, left_votekick, left_server)
SELECT
    ms.auth_id,
    COUNT(*) AS games,
    SUM(ms.full_time) AS full_games,
    SUM(CASE WHEN (m.winner = ms.team) THEN 1 ELSE 0 END) AS wins,
    SUM(CASE WHEN (m.winner = ms.team AND ms.full_time = 1 AND m.full_time = 1) THEN 1 ELSE 0 END) AS full_wins,
    SUM(ms.goals) AS goals,
    SUM(ms.assists) AS assists,
    SUM(ms.own_goals) AS own_goals,
    SUM(ms.playtime) AS playtime,
    SUM(ms.clean_sheet) AS clean_sheets,
    SUM(CASE WHEN ms.left_state = 1 THEN 1 ELSE 0 END) AS left_afk,
    SUM(CASE WHEN ms.left_state = 2 THEN 1 ELSE 0 END) AS left_votekick,
    SUM(CASE WHEN ms.left_state = 3 THEN 1 ELSE 0 END) AS left_server
FROM match_stats ms
JOIN matches m ON ms.match_id = m.match_id
GROUP BY ms.auth_id
ON CONFLICT(auth_id) DO UPDATE SET
    games = excluded.games,
    full_games = excluded.full_games,
    wins = excluded.wins,
    full_wins = excluded.full_wins,
    goals = excluded.goals,
    assists = excluded.assists,
    own_goals = excluded.own_goals,
    playtime = excluded.playtime,
    clean_sheets = excluded.clean_sheets,
    left_afk = excluded.left_afk,
    left_votekick = excluded.left_votekick,
    left_server = excluded.left_server;
COMMIT;
```

