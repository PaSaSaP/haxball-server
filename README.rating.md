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
