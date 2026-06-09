#!/bin/bash

echo "=== FuturoX AI Production Startup ==="

MONGO_DATA_DIR="/home/runner/workspace/mongodb-data"
MONGO_LOG="$MONGO_DATA_DIR/mongod.log"

mkdir -p "$MONGO_DATA_DIR"

# Remove stale lock file and OLD log
rm -f "$MONGO_DATA_DIR/mongod.lock"
rm -f "$MONGO_LOG"

# Kill any existing mongod
pkill -9 mongod 2>/dev/null || true
sleep 1

# Start MongoDB
echo "Starting MongoDB..."
mongod --dbpath "$MONGO_DATA_DIR" \
       --logpath "$MONGO_LOG" \
       --bind_ip 127.0.0.1 \
       --port 27017 &
MONGO_PID=$!
echo "MongoDB PID: $MONGO_PID"

# Detect Python binary
PYTHON_BIN=""
for p in "/home/runner/workspace/.pythonlibs/bin/python3" "python3" "python"; do
    if command -v "$p" >/dev/null 2>&1; then
        PYTHON_BIN=$(command -v "$p")
        break
    fi
done

if [ -z "$PYTHON_BIN" ]; then
    echo "FATAL: No Python binary found"
    exit 1
fi

echo "Python: $PYTHON_BIN ($("$PYTHON_BIN" --version 2>&1))"

# Install dependencies using THIS Python (ensures correct site-packages)
echo "Installing Python dependencies..."
"$PYTHON_BIN" -m pip install -r /home/runner/workspace/backend/requirements.txt -q 2>&1
echo "Dependencies installed."

# Wait for MongoDB to be ready (up to 30s after pip install)
echo "Waiting for MongoDB..."
for i in $(seq 1 30); do
    if grep -q "Waiting for connections" "$MONGO_LOG" 2>/dev/null; then
        echo "MongoDB ready after ${i}s."
        break
    fi
    if [ $i -eq 30 ]; then
        echo "MongoDB timeout — starting anyway"
    fi
    sleep 1
done

# Quick import test
echo "Testing server.py import..."
cd /home/runner/workspace/backend
"$PYTHON_BIN" -c "import server; print('Import OK')" 2>&1

# Start FastAPI
echo "Starting uvicorn on port 5000..."
exec "$PYTHON_BIN" -m uvicorn server:app --host 0.0.0.0 --port 5000
