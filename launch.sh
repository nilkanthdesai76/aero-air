#!/usr/bin/env bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"
PORT=4700
echo "👁️ Starting AeroAir Touchless Spatial Controller on http://localhost:$PORT ..."
python3 -m http.server $PORT &
SERVER_PID=$!
sleep 0.8
open "http://localhost:$PORT"
echo "AeroAir is running. Press Ctrl+C to stop."
wait $SERVER_PID
