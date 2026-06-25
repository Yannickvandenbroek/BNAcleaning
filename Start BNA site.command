#!/usr/bin/env bash
# Dubbelklik om de BNA cleaning website lokaal te starten en te openen.
cd "$(dirname "$0")"
PORT=8910
echo "BNA cleaning — lokale server op http://localhost:$PORT"
( sleep 1 && open "http://localhost:$PORT/" ) &
python3 -m http.server "$PORT"
