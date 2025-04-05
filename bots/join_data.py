#!/usr/bin/env python3

import sys
import unicodedata
from unidecode import unidecode
import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.patches as patches
import numpy as np
from scipy.stats import entropy
from sklearn.cluster import KMeans, DBSCAN


def normalize_nickname(nickname):
    # Normalizacja Unicode (usuwa ozdobne warianty liter, np. 𝙯 → z)
    normalized = unicodedata.normalize("NFKD", nickname)
    # Konwersja do ASCII (np. 𝙯𝙚𝙧𝙤 → zero)
    ascii_nickname = unidecode(normalized)
    return ascii_nickname


if len(sys.argv) < 2:
    print("put fname as param")
    sys.exit(1)

probable_name = 'GOD'
if len(sys.argv) > 2:
    probable_name = normalize_nickname(sys.argv[2])

fname = sys.argv[1]
fname_no_ext = '.'.join(fname.split('.')[:-1])
inputs = './dynamic/inputs/'+fname
positions = './dynamic/positions/'+fname
ball_positions = './dynamic/ball_positions/'+("-".join(fname.split("-")[:8])+".csv")
output_dir = './bots/merged/'
# Wczytaj pliki CSV
inputs = pd.read_csv(inputs, header=None, names=["timestamp", "inputBitMask"])
positions = pd.read_csv(positions, header=None, names=["timestamp", "x", "y"])
ball = pd.read_csv(ball_positions, header=None, names=["timestamp", "ball_x", "ball_y"])

# Połączenie danych pełnym zewnętrznym JOIN-em (zachowujemy wszystkie timestampy)
df = pd.merge(inputs, positions, on="timestamp", how="outer")
df = pd.merge(df, ball, on="timestamp", how="outer")
df = df.dropna(subset=['x', 'y'])

# Sortowanie po czasie
df = df.sort_values(by="timestamp").reset_index(drop=True)

# Interpolacja liniowa dla pozycji (x, y) i piłki (ball_x, ball_y)
df[['x', 'y', 'ball_x', 'ball_y']] = df[['x', 'y', 'ball_x', 'ball_y']].interpolate(method='linear')

# Wypełnianie brakujących inputBitMask wartością 0
# df['inputBitMask'] = df['inputBitMask'].fillna(method='ffill').fillna(0).astype(int)
df['inputBitMask'] = df['inputBitMask'].ffill().fillna(0).astype(int)

def interpret_input(input_bitmask):
    directions = []
    if input_bitmask & 1: directions.append("góra")
    if input_bitmask & 2: directions.append("dół")
    if input_bitmask & 4: directions.append("lewo")
    if input_bitmask & 8: directions.append("prawo")
    if input_bitmask & 16: directions.append("strzał")

    return " ".join(directions) if directions else "brak ruchu"

df['movement'] = df['inputBitMask'].apply(interpret_input)

# Obliczenie różnicy czasowej między kolejnymi klatkami
df['dt'] = df['timestamp'].diff()

# Zliczanie zmian inputBitMask (czyli momenty zmiany ruchu)
df['input_change'] = df['inputBitMask'].diff().ne(0).astype(int)

if False:
    # **Histogram różnic czasowych między zmianami inputBitMask**
    plt.figure()
    plt.hist(df.loc[df['input_change'] == 1, 'dt'].dropna(), bins=50, alpha=0.7, color="blue")
    plt.xlabel("Czas między zmianami klawiszy (ms)")
    plt.ylabel("Liczba wystąpień")
    plt.title("Rozkład zmian klawiszy")
    plt.savefig(output_dir + fname_no_ext + "-input-change-dist.png")
    plt.close()

# **Obliczenie prędkości i kąta zmiany kierunku**
df['dx'] = df['x'].diff()
df['dy'] = df['y'].diff()
df['speed'] = np.sqrt(df['dx']**2 + df['dy']**2) / df['dt']
df['angle_change'] = np.arctan2(df['dy'], df['dx']).diff().abs()

df_filtered_speed = df[df['speed'] <= 20]
df_filtered_angle = df_filtered_speed[(df_filtered_speed['angle_change'] > 0.01) &
                                      (df_filtered_speed['angle_change'] < np.pi - 0.01)]

if False:
    # **Histogram prędkości gracza**
    plt.figure()
    plt.hist(df_filtered_angle['speed'], bins=50, alpha=0.7, color="red")
    plt.xlabel("Prędkość (jednostki/ms)")
    plt.ylabel("Liczba wystąpień")
    plt.title("Histogram prędkości gracza")
    plt.savefig(output_dir + fname_no_ext +  "-speed-dist.png")
    plt.close()

if False:
    # **Histogram zmian kąta ruchu**
    plt.figure()
    plt.hist(df_filtered_angle['angle_change'], bins=50, alpha=0.7, color="green")
    plt.xlabel("Zmiana kąta (radiany)")
    plt.ylabel("Liczba wystąpień")
    plt.title("Histogram zmian kierunku ruchu")
    plt.savefig(output_dir + fname_no_ext + "-angle-change-hist.png")
    plt.close()

# **Obliczenie prędkości i przyspieszenia piłki**
df['ball_dx'] = df['ball_x'].diff()
df['ball_dy'] = df['ball_y'].diff()
df['ball_speed'] = np.sqrt(df['ball_dx']**2 + df['ball_dy']**2) / df['dt']
df['ball_accel'] = df['ball_speed'].diff()

# Wykrycie momentów nagłej zmiany piłki
df['ball_event'] = df['ball_accel'].abs() > df['ball_accel'].abs().mean() * 3

# Obliczenie czasu reakcji (pierwsza zmiana inputBitMask po ball_event)
df['reaction_time'] = df.loc[df['input_change'] == 1, 'timestamp'].diff()

df_filtered_reaction_time = df[df['reaction_time'] <= 500]
if False:
    # **Histogram czasu reakcji na ruch piłki**
    plt.figure()
    plt.hist(df_filtered_reaction_time['reaction_time'].dropna(), bins=50, alpha=0.7, color="purple")
    plt.xlabel("Czas reakcji (ms)")
    plt.ylabel("Liczba wystąpień")
    plt.title("Histogram czasu reakcji na ruch piłki")
    plt.savefig(output_dir + fname_no_ext + "-reaction-time-hist.png")
    plt.close()


def count_single_movements(df):
    """Funkcja zliczająca pojedyncze, sekwencyjne ruchy, ignorując 'strzał' (bez modyfikacji oryginalnego df)."""

    # Tworzymy kopię tylko tych kolumn, które są nam potrzebne
    df_copy = df[['inputBitMask']].copy()

    # Zignoruj bit 16 (strzał) w analizie ruchu
    df_copy['movement_mask'] = df_copy['inputBitMask'] & 15  # 15 = 0b1111 (bit maska tylko dla 4 bitów ruchu)

    # Krok 1: Zidentyfikuj momenty zatrzymania (brak ruchu)
    df_copy['is_stopped'] = df_copy['movement_mask'].apply(lambda x: x == 0)

    # Krok 2: Zidentyfikuj zmiany kierunku (lewo → prawo, prawo → lewo itp.)
    df_copy['previous_movement'] = df_copy['movement_mask'].shift(1)

    # Krok 3: Licz pojedyncze ruchy: zatrzymanie -> ruch w lewo/prawo/góra/dół -> zatrzymanie
    # Ruchy liczymy tylko wtedy, kiedy poprzednia i aktualna wartość to różne ruchy (np. lewo → prawo)
    df_copy['movement_change'] = df_copy['movement_mask'] != df_copy['previous_movement']

    # Krok 4: Selekcja tylko tych przypadków, które są poprawkami (zatrzymanie → lewo → zatrzymanie)
    single_moves = df_copy[(df_copy['is_stopped'] & df_copy['movement_change']).shift(-1, fill_value=False)]

    # Zliczanie liczby pojedynczych ruchów
    return single_moves.shape[0]

# Zastosowanie funkcji na danych
single_movements = count_single_movements(df)

if False:
    # Dodanie rysowania ścieżek

    # Ścieżka gracza (zmieniająca się w czasie)
    plt.figure(figsize=(10, 6))

    # Gradient kolorów dla ścieżki gracza (np. od czerwonego do niebieskiego)
    plt.scatter(df['x'], df['y'], c=df['timestamp'], cmap='coolwarm', alpha=0.6, s=10)
    plt.colorbar(label="Czas (timestamp)")

    # Ścieżka piłki (kolor szary)
    plt.plot(df['ball_x'], df['ball_y'], color='gray', alpha=0.5, lw=1, label="Ścieżka piłki")

    # Rysowanie ścieżki gracza
    plt.plot(df['x'], df['y'], color='r', alpha=0.5, lw=2, label="Ścieżka gracza")

    # Oznaczenie punktu startowego i końcowego
    plt.scatter(df['x'].iloc[0], df['y'].iloc[0], color='green', s=100, label="Początek")
    plt.scatter(df['x'].iloc[-1], df['y'].iloc[-1], color='blue', s=100, label="Koniec")

    # Etykiety osi i tytuł
    plt.xlabel('Pozycja X')
    plt.ylabel('Pozycja Y')
    plt.title(f"Ścieżka gracza i piłki: {fname}")
    plt.legend()

    # Zapisz wykres do pliku PNG
    plt.savefig(output_dir + fname_no_ext + "-path-map.png", dpi=300)
    plt.close()

# Obliczenie odległości euklidesowej od piłki
df['distance_to_ball'] = np.sqrt((df['x'] - df['ball_x'])**2 + (df['y'] - df['ball_y'])**2)

# Filtrowanie dla odległości < 100
close_distances = df.loc[df['distance_to_ball'] < 100, 'distance_to_ball']

df['direction_change'] = df['inputBitMask'].diff().ne(0).astype(int)
df['same_movement_length'] = df['inputBitMask'].groupby((df['inputBitMask'] != df['inputBitMask'].shift()).cumsum()).transform('count')

# Średnia i odchylenie standardowe
mean_distance = close_distances.mean()
std_distance = close_distances.std()

stationary_ratio = (df['inputBitMask'] == 0).mean()

# Obliczamy długość trwania naciśnięcia przycisku strzału (bit 16)
df['shot_held'] = (df['inputBitMask'] & 16) > 0  # Maska bitowa - czy wciśnięty?
df['shot_duration'] = df['shot_held'].astype(int).groupby((df['shot_held'] != df['shot_held'].shift()).cumsum()).cumsum()

# Filtrujemy tylko zakończone sekwencje wciśnięć
# shot_durations = df.loc[df['shot_held'] & ~df['shot_held'].shift(-1, fill_value=False), 'shot_duration']
shot_durations = df.loc[
    (df['shot_held'] & ~df['shot_held'].shift(-1, fill_value=False)) & (df['shot_duration'] < 180),
    'shot_duration'
]
bins = np.arange(min(shot_durations), max(shot_durations) + 2)  # min, max i dodajemy 1 dla ostatniego przedziału

if True:
    print(f"Średnia odległość od piłki (<100): {mean_distance:.2f}, Odchylenie standardowe: {std_distance:.2f}")
    print(f"Procent czasu w bezruchu: {stationary_ratio:.2%}")

def calculate_input_entropy(df):
    """Oblicza entropię sekwencji naciśnięć klawiszy."""
    input_counts = df['inputBitMask'].value_counts(normalize=True)
    return entropy(input_counts, base=2)

def analyze_reaction_time(df):
    """Analizuje czas reakcji na zmiany w wejściu."""
    reaction_times = df.loc[df['input_change'] == 1, 'dt'].dropna()
    return reaction_times.mean(), (reaction_times.min(), reaction_times.max())

def analyze_speed_variance(df):
    """Oblicza wariancję prędkości, ignorując NaN i inf."""
    # Usuwamy NaN i inf przed obliczeniem wariancji
    valid_speeds = df['speed'].replace([np.inf, -np.inf], np.nan).dropna()

    if len(valid_speeds) == 0:
        return np.nan  # Jeżeli nie ma żadnych prawidłowych danych, zwrócimy NaN

    return valid_speeds.var()

def analyze_trajectory_clusters_kmeans(df, n_clusters=3):
    """Zastosowanie k-means do grupowania trajektorii."""
    valid_df = df[['x', 'y']].dropna()
    kmeans = KMeans(n_clusters=n_clusters, random_state=0, n_init=10)
    clusters = kmeans.fit_predict(valid_df)
    return clusters

def analyze_trajectory_clusters(df):
    """Analizuje trajektorie gracza za pomocą DBSCAN."""
    dbscan = DBSCAN(eps=5, min_samples=10)  # eps - promień klastra, min_samples - min liczba punktów w klastrze
    df['cluster'] = dbscan.fit_predict(df[['x', 'y']])  # Klasteryzacja na podstawie pozycji x, y

    unique_clusters = len(set(df['cluster']) - {-1})  # Zliczamy tylko rzeczywiste klastry, ignorując -1 (szum)
    return unique_clusters

def save_trajectory_clusters(df):
    unique_clusters = len(set(df['cluster']) - {-1})
    plt.scatter(df['x'], df['y'], c=df['cluster'], cmap='viridis', alpha=0.5)
    plt.xlabel("X - Pozycja")
    plt.ylabel("Y - Pozycja")
    plt.title(f"Klasteryzacja trajektorii (DBSCAN) - {unique_clusters} klastrów")
    plt.savefig(output_dir + fname_no_ext + "-trajectory.png")
    plt.close()

def interpret_trajectory_clusters(clusters):
    if clusters == 0:
        return "Brak wykrytych trajektorii - dane są bardzo powtarzalne, co może sugerować bota."
    if clusters == 1:
        return f"({clusters}) Wszystkie trajektorie są bardzo podobne, może to sugerować bota."
    if clusters > 1:
        return f"({clusters}) Trajektorie są zróżnicowane, co sugeruje bardziej ludzkie ruchy."
    else:
        return "Nieokreślony wynik."

entropy = calculate_input_entropy(df)
mean_reaction, reaction_range = analyze_reaction_time(df)
speed_var = analyze_speed_variance(df)
clusters = analyze_trajectory_clusters(df)
# save_trajectory_clusters(df)

def print_summary():
    print("\n=== Analiza gracza ===")
    print(f"🧩 Entropia sekwencji klawiszy: {entropy:.3f} (niższa → większe prawdopodobieństwo bota)")
    print(f"⚡ Średni czas reakcji: {mean_reaction:.2f} ms (zakres: {reaction_range[0]:.2f} - {reaction_range[1]:.2f} ms)")
    print(f"🚀 Wariancja prędkości: {speed_var:.3f} (niskie wartości → nienaturalnie stała prędkość)")
    print(f"📌 Liczba wykrytych klastrów trajektorii: {interpret_trajectory_clusters(clusters)} Zliczono {single_movements} pojedynczych ruchów.")

# Uruchomienie podsumowania
print_summary()

if True: # combined output
    fig, axs = plt.subplots(4, 2, figsize=(12, 12), gridspec_kw={'height_ratios': [1, 1, 1, 2]})

    # **Histogramy (górne 2x2)**
    # axs[0, 0].hist(df.loc[df['input_change'] == 1, 'dt'].dropna(), bins=50, alpha=0.7, color="blue")
    axs[0, 0].hist(df.loc[(df['input_change'] == 1) & (df['dt'] <= 100), 'dt'].dropna(), bins=50, alpha=0.7, color="blue")
    axs[0, 0].set_xlabel("Czas między zmianami klawiszy (ms)")
    axs[0, 0].set_ylabel("Liczba wystąpień")
    axs[0, 0].set_title("Rozkład zmian klawiszy")

    axs[0, 1].hist(close_distances, bins=50, alpha=0.7, color="blue")
    axs[0, 1].set_xlabel("Odległość od piłki")
    axs[0, 1].set_ylabel("Liczba wystąpień")
    axs[0, 1].set_title("Histogram odległości gracza od piłki")

    axs[1, 0].hist(df_filtered_angle[df_filtered_angle['angle_change'] > 0.1]['angle_change'], bins=50, alpha=0.7, color="green")
    axs[1, 0].set_xlabel("Zmiana kąta (radiany)")
    axs[1, 0].set_ylabel("Liczba wystąpień")
    axs[1, 0].set_title(f"Histogram zmian kierunku ruchu")

    axs[1, 1].hist(df_filtered_reaction_time['reaction_time'].dropna(), bins=50, alpha=0.7, color="purple")
    axs[1, 1].set_xlabel("Czas reakcji (ms)")
    axs[1, 1].set_ylabel("Liczba wystąpień")
    axs[1, 1].set_title("Histogram czasu reakcji na ruch piłki")

    # Histogram długości trwania wciśnięcia
    axs[2, 0].hist(shot_durations, bins=bins, alpha=0.7, color="orange")
    axs[2, 0].set_xlabel("Długość trwania wciśnięcia przycisku strzału (klatki)")
    axs[2, 0].set_ylabel("Liczba wystąpień")
    axs[2, 0].set_title("Histogram czasu wciśnięcia strzału")

    # Wykres: Długość trwania tego samego ruchu (axs[2, 1])
    axs[2, 1].hist(df['same_movement_length'], bins=30, alpha=0.7, color="green")
    axs[2, 1].set_xlabel("Długość trwania jednego ruchu (w klatkach)")
    axs[2, 1].set_ylabel("Liczba wystąpień")
    axs[2, 1].set_title("Długość trwania tego samego ruchu")

    # **Scalamy dolne 2x2 w jeden wykres dla mapy**
    for i in range(3, 4):
        for j in range(2):
            axs[i, j].axis("off")  # Ukrywamy osie z pustych miejsc

    # Tworzymy mapę jako duży wykres zajmujący dolne 2x2
    ax_map = fig.add_subplot(4, 2, (7, 10))  # Numery subplotów odpowiadają dolnej połowie

    # Rysowanie ścieżki gracza z gradientem kolorów
    sc = ax_map.scatter(df['x'], df['y'], c=df['timestamp'], cmap='coolwarm', alpha=0.6, s=10)
    plt.colorbar(sc, ax=ax_map, label="Czas (timestamp)")

    # Rysowanie ścieżki piłki
    ax_map.plot(df['ball_x'], df['ball_y'], color='gray', alpha=0.5, lw=1, label="Ścieżka piłki")

    # Rysowanie trajektorii gracza
    ax_map.plot(df['x'], df['y'], color='r', alpha=0.5, lw=2, label="Ścieżka gracza")

    # Punkty startowy i końcowy
    ax_map.scatter(df['x'].iloc[0], df['y'].iloc[0], color='green', s=100, label="Początek")
    ax_map.scatter(df['x'].iloc[-1], df['y'].iloc[-1], color='blue', s=100, label="Koniec")

    # Etykiety osi i tytuł
    ax_map.set_title(f"Ścieżka ({probable_name}): {fname}")
    ax_map.set_xlim(-650, 650)
    ax_map.set_ylim(-320, 320)
    ax_map.legend()

    # Dodaj prostokąt boiska
    field = patches.Rectangle(
        (-600, -270),   # Lewy dolny róg
        1200,            # Szerokość
        540,            # Wysokość
        linewidth=2,
        edgecolor='black',
        facecolor='none'
    )
    ax_map.add_patch(field)

    summary_text = (
        f"Średnia odległość od piłki (<100): {mean_distance:.2f}, std dev: {std_distance:.2f}, "
        f"Procent czasu w bezruchu: {stationary_ratio:.2%}%\n"
        f"Entropia klawiszy: {entropy:.3f} (niższa → bot), "
        f"Średni czas reakcji: {mean_reaction:.2f} ms (zakres: {reaction_range[0]:.2f} - {reaction_range[1]:.2f} ms)\n"
        f"Wariancja prędkości: {speed_var:.3f} (niskie wartości → nienaturalnie stała prędkość), "
        f"Liczba trajektorii: {clusters}, "
        f"Zliczono {single_movements} pojedynczych ruchów."
    )
    # Dodajemy tekst na dole figury
    fig.text(0.5, 0.01, summary_text, ha='center', va='bottom', fontsize=8, color='black')

    plt.subplots_adjust(hspace=0.4)  # Dodaje odstęp pionowy między wykresami
    # plt.tight_layout()
    plt.savefig(output_dir + fname_no_ext + "-combined-map.png", dpi=300)
    plt.close()

if False:
    pass
    # Obliczanie autokorelacji dla prędkości
    # autocorr = np.corrcoef(df_filtered_angle['speed'], np.roll(df_filtered_angle['speed'], 1))[0, 1]
    # Jeśli autokorelacja jest bardzo wysoka, dane mogą wskazywać na bota
    # print(f"{autocorr} > 0.9 ? to prawdopodobne bot (zbyt wysoka regularność prędkości)")

# Podgląd danych po scaleniu
# print(df.head(10))


# save all to csv
# df.to_csv("./bots/merged/" + fname, index=False, header=False)

# only create
with open("./bots/merged/" + fname, "w") as f:
    pass
