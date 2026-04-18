#!/bin/bash
set -euo pipefail

CLOUD="postgresql://postgres:VSMindFrame2026@db.fjnpzjjyhnpmunfoycrp.supabase.co:5432/postgres"
DUMP="/opt/studio/backups/cloud-plain.sql"

echo "=== Step 1: Dump from cloud as plain SQL (host pg_dump v17) ==="
PGPASSWORD='VSMindFrame2026' /usr/lib/postgresql/17/bin/pg_dump "$CLOUD" \
  --no-owner --no-acl \
  --exclude-schema=storage \
  --exclude-schema=auth \
  -Fp -f "$DUMP"
echo "✓ Dump saved: $DUMP"

echo ""
echo "=== Step 2: Restore via container psql ==="
docker exec -i supabase-db psql -U postgres -d postgres < "$DUMP" 2>&1 | tail -20
echo "✓ Restore complete"

echo ""
echo "=== Step 3: Verify row counts ==="
docker exec supabase-db psql -U postgres -d postgres -c "
SELECT relname, n_live_tup as rows
FROM pg_stat_user_tables
WHERE n_live_tup > 0
ORDER BY n_live_tup DESC;"
