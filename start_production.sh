#!/bin/bash
set -e

echo "=== FuturoX AI Production Startup ==="

# MongoDB data dir inside workspace (has write permissions)
MONGO_DATA_DIR="/home/runner/workspace/mongodb-data"
mkdir -p "$MONGO_DATA_DIR"

# Start MongoDB
echo "Starting MongoDB..."
mongod --fork --logpath "$MONGO_DATA_DIR/mongod.log" --dbpath "$MONGO_DATA_DIR" --bind_ip 127.0.0.1

# Wait for MongoDB to be ready
echo "Waiting for MongoDB..."
for i in $(seq 1 30); do
    if mongosh --eval "db.adminCommand('ping')" --quiet 2>/dev/null; then
        echo "MongoDB is ready."
        break
    fi
    sleep 1
done

# Build React frontend
echo "Building frontend..."
cd /home/runner/workspace/frontend
npm install --legacy-peer-deps --silent
npm run build
echo "Frontend built."

# Start FastAPI backend on port 5000 (mapped to external port 80)
echo "Starting backend on port 5000..."
cd /home/runner/workspace/backend
pip install -r requirements.txt -q
exec uvicorn server:app --host 0.0.0.0 --port 5000
