#!/bin/bash

DB_FILE="$1"         # Baza danych
AUTH_ID="$2"        # auth_id
REJOICE_ID="$3"     # rejoice_id
DAYS="$4"           # liczba dni, przez które rejoice ma być aktywny

# Sprawdzamy, czy podano wszystkie argumenty
if [ -z "$DB_FILE" ] || [ -z "$AUTH_ID" ] || [ -z "$REJOICE_ID" ] || [ -z "$DAYS" ]; then
  echo "Usage: $0 <db_file> <auth_id> <rejoice_id> <days>"
  exit 1
fi

# Obliczamy time_to (aktualny timestamp + liczba dni w milisekundach)
TIME_TO=$(( $(date +%s) * 1000 + DAYS * 86400000 ))

# Wstawiamy lub aktualizujemy dane w tabeli rejoices
sqlite3 "$DB_FILE" <<EOF
  INSERT INTO rejoices (auth_id, rejoice_id, time_from, time_to)
  VALUES ('$AUTH_ID', '$REJOICE_ID', 0, $TIME_TO)
  ON CONFLICT(auth_id, rejoice_id) DO UPDATE SET
    time_from = 0,
    time_to = excluded.time_to;
EOF

# Sprawdzamy, czy zapytanie zakończyło się powodzeniem
if [ $? -eq 0 ]; then
  echo "Rejoice set successfully. Expires at $TIME_TO (ms since epoch)."
else
  echo "Error: Failed to set rejoice."
fi

