#!/bin/bash

# Ścieżki
dynamic_dir="./dynamic"
nask_dir="./nask"
patterns_file="nask.txt"

positions_src="$dynamic_dir/positions"
ball_src="$dynamic_dir/ball_positions"
positions_dst="$nask_dir/positions"
ball_dst="$nask_dir/ball_positions"

# Tworzenie katalogów docelowych, jeśli nie istnieją
mkdir -p "$positions_dst"
mkdir -p "$ball_dst"

# Wczytaj wszystkie wzorce z pliku nask.txt
mapfile -t patterns < "$patterns_file"

# Dla każdego pliku w dynamic/positions
find "$positions_src" -type f -name "*.csv" | while read -r pos_file; do
  filename=$(basename "$pos_file")

  for pattern in "${patterns[@]}"; do
    if [[ "$filename" == *"$pattern"* ]]; then
      # Kopiuj oryginalny plik do ./nask/positions/
      cp "$pos_file" "$positions_dst/"

      # Wyciągnij prefix do daty, np. tennis-1-2025-04-09-09-09-48
      prefix=$(echo "$filename" | grep -oE '^[^-]+-[^-]+-[0-9]{4}-[0-9]{2}-[0-9]{2}-[0-9]{2}-[0-9]{2}-[0-9]{2}')

      # Zbuduj ścieżkę do pliku ball_positions
      ball_file="$ball_src/$prefix.csv"

      # Sprawdź, czy plik istnieje i jeśli tak, kopiuj
      if [[ -f "$ball_file" ]]; then
        cp "$ball_file" "$ball_dst/"
      fi

      # Przerwij pętlę patternów — już dopasowano ten plik
      break
    fi
  done
done

