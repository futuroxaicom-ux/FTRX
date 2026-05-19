#!/bin/bash

echo "=== FuturoX AI Production Startup ==="

# MongoDB data dir
MONGO_DATA_DIR="/home/runner/workspace/mongodb-data"
mkdir -p "$MONGO_DATA_DIR"

# Start MongoDB in background (no --fork, simpler)
echo "Starting MongoDB..."
mongod --dbpath "$MONGO_DATA_DIR" \
       --logpath "$MONGO_DATA_DIR/mongod.log" \
       --bind_ip 127.0.0.1 \
       --port 27017 &

MONGO_PID=$!
echo "MongoDB PID: $MONGO_PID"

# Wait for MongoDB to be ready (simple sleep + check)
echo "Waiting for MongoDB to be ready..."
for i in $(seq 1 20); do
    if mongo --eval "db.adminCommand('ping')" --quiet 2>/dev/null || \
       mongosh --eval "db.adminCommand('ping')" --quiet 2>/dev/null; then
        echo "MongoDB ready after ${i}s."
        break
    fi
    echo "  attempt $i/20..."
    sleep 1
done

# Start FastAPI backend on port 5000
echo "Starting backend on port 5000..."
cd /home/runner/workspace/backend
exec uvicorn server:app --host 0.0.0.0 --port 5000
