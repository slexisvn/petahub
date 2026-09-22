#!/bin/sh
set -e

mkdir -p "${STORAGE_ROOT:-/data/storage}"
npx prisma db push --schema ./prisma/schema.prisma

exec node dist/main.js
