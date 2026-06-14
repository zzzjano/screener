#!/bin/sh
set -e

echo "[entrypoint] Stosowanie migracji Prisma..."
npx prisma migrate deploy

echo "[entrypoint] Uruchamianie Next.js..."
exec node server.js
