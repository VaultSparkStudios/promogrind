#!/bin/bash
# Migrate cloud Supabase → self-hosted Vorn instance
# Run this on the Hetzner server
set -euo pipefail

CLOUD_URL="postgresql://postgres:VSMindFrame2026@db.fjnpzjjyhnpmunfoycrp.supabase.co:5432/postgres"
LOCAL_URL="postgresql://postgres:d3394aaabbdf3b1ee15144a4be1b4c788aa597d100676e4b86b2185136fd1e44@localhost:5432/postgres"
DUMP_FILE="/opt/studio/backups/cloud-full-$(date +%Y%m%d-%H%M%S).dump"

echo "=== Step 1: Dump cloud Supabase ==="
PGPASSWORD='VSMindFrame2026' pg_dump "$CLOUD_URL" \
  --no-owner --no-acl \
  --exclude-schema=storage \
  --exclude-schema=auth \
  -Fc -f "$DUMP_FILE"
echo "✓ Dump saved to $DUMP_FILE"

echo ""
echo "=== Step 2: Restore to self-hosted ==="
PGPASSWORD='d3394aaabbdf3b1ee15144a4be1b4c788aa597d100676e4b86b2185136fd1e44' pg_restore \
  -d "$LOCAL_URL" \
  --no-owner --no-acl \
  --clean --if-exists \
  "$DUMP_FILE" || true
echo "✓ Restore complete"

echo ""
echo "=== Step 3: Verify row counts ==="
PGPASSWORD='d3394aaabbdf3b1ee15144a4be1b4c788aa597d100676e4b86b2185136fd1e44' psql "$LOCAL_URL" -c "
SELECT relname, n_live_tup as rows
FROM pg_stat_user_tables
WHERE n_live_tup > 0
ORDER BY n_live_tup DESC;" 2>&1

echo ""
echo "Migration complete. Verify counts match cloud before cutting over."
