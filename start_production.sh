#!/bin/bash

echo "=== FuturoX AI Production Startup ==="

MONGO_DATA_DIR="/home/runner/workspace/mongodb-data"
MONGO_LOG="$MONGO_DATA_DIR/mongod.log"

mkdir -p "$MONGO_DATA_DIR"

# Remove stale lock file from previous crash
rm -f "$MONGO_DATA_DIR/mongod.lock"

# Kill any existing mongod
pkill -9 mongod 2>/dev/null || true
sleep 2

# Start MongoDB
echo "Starting MongoDB..."
mongod --dbpath "$MONGO_DATA_DIR" \
       --logpath "$MONGO_LOG" \
       --bind_ip 127.0.0.1 \
       --port 27017 &

echo "MongoDB PID: $!"

# Install Python dependencies in parallel while waiting for MongoDB
echo "Installing Python dependencies..."
cd /home/runner/workspace/backend
pip install -r requirements.txt -q &
PIP_PID=$!

# Wait for MongoDB log to confirm it's ready (up to 90s)
echo "Waiting for MongoDB to accept connections..."
for i in $(seq 1 90); do
    if grep -q "Waiting for connections" "$MONGO_LOG" 2>/dev/null; then
        echo "MongoDB ready after ${i}s."
        break
    fi
    if [ $i -eq 90 ]; then
        echo "MongoDB timeout — starting anyway"
    fi
    sleep 1
done

# Wait for pip to finish
echo "Waiting for pip install to finish..."
wait $PIP_PID
echo "Dependencies ready."

# Start FastAPI backend on port 5000
echo "Starting backend on port 5000..."
cd /home/runner/workspace/backend
exec python -m uvicorn server:app --host 0.0.0.0 --port 5000
