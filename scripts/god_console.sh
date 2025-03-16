#!/bin/bash

SCRIPT_DIR="$(dirname "$(realpath "$0")")"
SENDER="$SCRIPT_DIR/send_god_message.sh"

SELECTOR="$1"
if ! [[ "$SELECTOR" =~ ^[a-zA-Z0-9_-]+$ ]]; then
    echo "Invalid selector $SELECTOR"
    exit 1
fi

# Plik historii (można ustawić na /dev/null, jeśli nie chcesz zapisywać)
HISTFILE="$HOME/.simple_shell_history"
HISTSIZE=1000   # Maksymalna liczba linii w historii

# Jeśli plik historii nie istnieje, utwórz go
touch "$HISTFILE"

# Wczytaj historię na start
history -r "$HISTFILE"

while true; do
    # Wyświetl prompt i wczytaj wejście użytkownika
    read -e -r -p "> " line

    # Usuń początkowe i końcowe białe znaki
    trimmed_line="$(echo -n "$line" | tr -d '[:cntrl:]' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"

    # Jeśli linia jest pusta po usunięciu białych znaków, pomijamy
    if [[ -z "$trimmed_line" ]]; then
        continue
    fi

    # Jeśli użytkownik wpisał coś, dodaj do historii
    if [[ -n "$line" ]]; then
        history -s "$line"   # Dodaj do sesyjnej historii
        echo "$line" >> "$HISTFILE"  # Zapisz do pliku historii
    fi

    # Wywołanie skryptu wysyłającego wiadomość
    "$SENDER" "$SELECTOR" "$line"
done
