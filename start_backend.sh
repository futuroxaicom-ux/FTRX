#!/bin/bash
set -e

# Start MongoDB if not running
if ! pgrep -x mongod > /dev/null 2>&1; then
    mkdir -p /home/runner/workspace/mongodb-data
    mongod --dbpath /home/runner/workspace/mongodb-data \
           --logpath /home/runner/workspace/mongodb-data/mongod.log \
           --bind_ip 127.0.0.1 \
           --port 27017 \
           --fork
    echo "Waiting for MongoDB to be ready..."
    sleep 3
fi

cd /home/runner/workspace/backend
uvicorn server:app --host 0.0.0.0 --port 8000 --reload
