#!/bin/sh
set -e
npx prisma migrate deploy
if [ "${SEED_DB}" = "true" ]; then
  npx tsx prisma/seed.ts
fi
exec "$@"
