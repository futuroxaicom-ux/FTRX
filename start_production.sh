#!/bin/bash

echo "=== FuturoX AI Production Startup ==="

# MongoDB data dir
MONGO_DATA_DIR="/home/runner/workspace/mongodb-data"
mkdir -p "$MONGO_DATA_DIR"

# Kill any existing mongod
pkill mongod 2>/dev/null || true
sleep 1

# Start MongoDB in background
echo "Starting MongoDB..."
mongod --dbpath "$MONGO_DATA_DIR" \
       --logpath "$MONGO_DATA_DIR/mongod.log" \
       --bind_ip 127.0.0.1 \
       --port 27017 &

MONGO_PID=$!
echo "MongoDB PID: $MONGO_PID"

# Wait for MongoDB using bash /dev/tcp
echo "Waiting for MongoDB..."
for i in $(seq 1 30); do
    if (echo > /dev/tcp/127.0.0.1/27017) 2>/dev/null; then
        echo "MongoDB ready after ${i}s."
        break
    fi
    sleep 1
done

# Install Python dependencies
echo "Installing Python dependencies..."
cd /home/runner/workspace/backend
pip install -r requirements.txt -q
echo "Dependencies installed."

# Start FastAPI backend on port 5000
echo "Starting backend on port 5000..."
exec uvicorn server:app --host 0.0.0.0 --port 5000
