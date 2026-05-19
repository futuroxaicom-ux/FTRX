#!/bin/bash
set -e

echo "=== FuturoX AI Production Startup ==="

# Install MongoDB if not available
if ! command -v mongod &> /dev/null; then
    echo "Installing MongoDB..."
    apt-get update -qq
    apt-get install -y -qq gnupg curl
    curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor
    echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-7.0.list
    apt-get update -qq
    apt-get install -y -qq mongodb-org
fi

# Start MongoDB
echo "Starting MongoDB..."
mkdir -p /data/db
mongod --fork --logpath /var/log/mongod.log --dbpath /data/db --bind_ip 127.0.0.1
echo "MongoDB started."

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
npm install --legacy-peer-deps
npm run build
echo "Frontend built."

# Start FastAPI backend (serves frontend + API)
echo "Starting backend..."
cd /home/runner/workspace/backend
pip install -r requirements.txt -q
exec uvicorn server:app --host 0.0.0.0 --port 8000
