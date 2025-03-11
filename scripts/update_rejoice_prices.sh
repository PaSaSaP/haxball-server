#!/bin/bash

# Parametry
DB_FILE="$1"         # Baza danych
CSV_FILE="$2"        # Plik CSV

# Sprawdzamy, czy podano wszystkie argumenty
if [ -z "$DB_FILE" ] || [ -z "$CSV_FILE" ]; then
  echo "Usage: $0 <db_file> <csv_file>"
  exit 1
fi

# Sprawdzamy, czy plik CSV istnieje
if [ ! -f "$CSV_FILE" ]; then
  echo "Error: CSV file not found!"
  exit 1
fi

# Czyścimy najpierw stare ceny
sqlite3 "$DB_FILE" <<EOF
    DELETE FROM rejoice_prices;
EOF

# Przechodzimy przez każdy wiersz w pliku CSV
while IFS=',' read -r REJOICE_ID FOR_DAYS PRICE; do
  # Sprawdzamy, czy wiersz nie jest pusty
  if [ -z "$REJOICE_ID" ] || [ -z "$FOR_DAYS" ] || [ -z "$PRICE" ]; then
    continue
  fi

  # Wstawiamy lub aktualizujemy dane w tabeli rejoice_prices
  sqlite3 "$DB_FILE" <<EOF
    INSERT INTO rejoice_prices (rejoice_id, for_days, price)
    VALUES ('$REJOICE_ID', $FOR_DAYS, $PRICE)
    ON CONFLICT(rejoice_id, for_days) DO UPDATE SET
      price = excluded.price;
EOF

  # Sprawdzamy, czy zapytanie zakończyło się powodzeniem
  if [ $? -eq 0 ]; then
    echo "Successfully added/updated entry for $REJOICE_ID with $FOR_DAYS days and price $PRICE."
  else
    echo "Error: Failed to add/update entry for $REJOICE_ID."
  fi
done < "$CSV_FILE"

