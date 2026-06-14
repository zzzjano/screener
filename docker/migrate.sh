#!/bin/sh
set -eu

INIT_MIGRATION="20250614180000_init"

log() {
  echo "[migrate] $*"
}

deploy() {
  npx prisma migrate deploy
}

baseline_init() {
  log "Marking ${INIT_MIGRATION} as already applied..."
  npx prisma migrate resolve --applied "$INIT_MIGRATION"
}

rollback_failed_init() {
  log "Marking failed ${INIT_MIGRATION} attempt as rolled back..."
  npx prisma migrate resolve --rolled-back "$INIT_MIGRATION" || true
}

if [ -z "${DATABASE_URL:-}" ]; then
  log "ERROR: DATABASE_URL is not set"
  exit 1
fi

case "$DATABASE_URL" in
  *@localhost:*|*@127.0.0.1:*)
    log "ERROR: DATABASE_URL uses localhost. Inside Docker use host 'postgres'."
    log "Example: postgresql://screener:screener@postgres:5432/screener?schema=public"
    exit 1
    ;;
esac

log "Checking database state..."
state="$(node <<'NODE'
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const initMigration = "20250614180000_init";

(async () => {
  const [tables] = await prisma.$queryRawUnsafe(`
    SELECT
      EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'User'
      ) AS "hasUserTable",
      EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'Screener'
      ) AS "hasScreenerTable",
      EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = '_prisma_migrations'
      ) AS "hasMigrationsTable"
  `);

  let hasAppliedInit = false;
  let hasFailedInit = false;

  if (tables.hasMigrationsTable) {
    const rows = await prisma.$queryRawUnsafe(
      `SELECT finished_at, rolled_back_at
       FROM "_prisma_migrations"
       WHERE migration_name = $1
       ORDER BY started_at DESC
       LIMIT 1`,
      initMigration,
    );

    if (rows.length > 0) {
      hasAppliedInit = Boolean(rows[0].finished_at) && !rows[0].rolled_back_at;
      hasFailedInit = !rows[0].finished_at && !rows[0].rolled_back_at;
    }
  }

  console.log([
    tables.hasUserTable ? "1" : "0",
    tables.hasScreenerTable ? "1" : "0",
    hasAppliedInit ? "1" : "0",
    hasFailedInit ? "1" : "0",
  ].join(" "));
})()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
NODE
)"

set -- $state
has_user_table="${1:-0}"
has_screener_table="${2:-0}"
has_applied_init="${3:-0}"
has_failed_init="${4:-0}"

if [ "$has_failed_init" = "1" ]; then
  rollback_failed_init
fi

# Older deployments may have been created with `prisma db push`, so the schema
# exists but Prisma migration history is empty. Baseline the initial migration
# before deploy instead of trying to recreate existing tables and enums.
if [ "$has_applied_init" = "0" ] && [ "$has_user_table" = "1" ] && [ "$has_screener_table" = "1" ]; then
  baseline_init
fi

log "Applying Prisma migrations..."
set +e
output="$(deploy 2>&1)"
status=$?
set -e

if [ "$status" -eq 0 ]; then
  echo "$output"
  log "Done."
  exit 0
fi

echo "$output"

if echo "$output" | grep -Eq 'already exists|42P07|42710|P3009|P3018'; then
  log "Recovering initial migration state..."
  rollback_failed_init
  baseline_init
  deploy
  log "Done."
  exit 0
fi

log "Migration failed."
exit 1
