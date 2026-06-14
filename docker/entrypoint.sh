#!/bin/sh
set -e

echo "[entrypoint] Stosowanie migracji Prisma..."
node ./node_modules/prisma/build/index.js migrate deploy

echo "[entrypoint] Uruchamianie Next.js..."
exec node server.js
