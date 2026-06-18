#!/bin/sh
set -e

# Ensure the data directory exists
mkdir -p $(dirname "$DB_PATH")

# Run migrations/initialization (handled by db.js, but could be separate)
# node migrations.js

# Run seeds if needed
if [ -f "seed.js" ]; then
  echo "Running seeds..."
  node seed.js
fi

# Execute the CMD
exec "$@"
