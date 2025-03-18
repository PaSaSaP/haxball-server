#!/usr/bin/env python3

import math

def calculate_weighted_average(input_table):
    """
    Oblicza średnią ważoną w oparciu o następującą formułę:
    weighted_average = (Σ((rating / sqrt(games)) * games)) / Σ(games)
    
    Gdzie:
    - rating to ocena (np. Elo),
    - games to liczba gier.
    
    Formuła ta waży ratingi przez liczbę gier, modyfikowaną przez pierwiastek z liczby gier.
    """
    
    # Obliczamy sumę (rating / sqrt(games)) * games oraz sumę games
    weighted_sum = sum((rating / math.sqrt(games)) * games for rating, games in input_table)
    total_games = sum(games for _, games in input_table)
    
    # Obliczamy średnią ważoną, unikając dzielenia przez 0
    weighted_average = weighted_sum / total_games if total_games != 0 else 0
    
    return weighted_average

input_table = [
    (1822, 10),
    (1735, 6),
    (1836, 9)
]

ratio = calculate_weighted_average(input_table)

print(f"Średnia ważona: {ratio:.2f}")
