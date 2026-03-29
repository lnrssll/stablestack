#!/bin/sh
set -e

echo "Running migrations..."
dbmate up

echo "Starting server..."
exec node dist/index.js
