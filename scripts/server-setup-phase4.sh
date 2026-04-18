#!/bin/bash
# Phase 4 setup — run this on the Hetzner server
# Installs: backup.sh, new-project.sh, Watchtower
set -euo pipefail

# ── backup.sh ────────────────────────────────────────────────────────────────
cat > /opt/studio/scripts/backup.sh << 'SCRIPT'
#!/bin/bash
set -euo pipefail
R2_BUCKET="studio-backups"
R2_ENDPOINT="https://PLACEHOLDER_ACCOUNT_ID.r2.cloudflarestorage.com"
AWS_ACCESS_KEY_ID="PLACEHOLDER_R2_ACCESS_KEY"
AWS_SECRET_ACCESS_KEY="PLACEHOLDER_R2_SECRET_KEY"
TIMESTAMP=$(date -u +%Y-%m-%dT%H-%M-%SZ)
for project_dir in /opt/studio/projects/supabase-*/; do
  project=$(basename "$project_dir" | sed 's/supabase-//')
  pg_password=$(grep POSTGRES_PASSWORD "$project_dir/.env" | cut -d= -f2)
  pg_port=$(grep 'POSTGRES_PORT=' "$project_dir/.env" 2>/dev/null | cut -d= -f2 || echo 5432)
  backup_file="/opt/studio/backups/${project}_${TIMESTAMP}.dump"
  echo "Backing up $project..."
  PGPASSWORD="$pg_password" pg_dump \
    -h localhost -p "$pg_port" -U postgres postgres \
    -Fc -f "$backup_file"
  AWS_ACCESS_KEY_ID="$AWS_ACCESS_KEY_ID" \
  AWS_SECRET_ACCESS_KEY="$AWS_SECRET_ACCESS_KEY" \
  aws s3 cp "$backup_file" \
    "s3://${R2_BUCKET}/${project}/${TIMESTAMP}.dump" \
    --endpoint-url "$R2_ENDPOINT"
  rm "$backup_file"
  echo "✓ $project backed up to R2"
done
echo "All backups complete: $TIMESTAMP"
SCRIPT
chmod +x /opt/studio/scripts/backup.sh
echo "✓ backup.sh written"

# ── new-project.sh ────────────────────────────────────────────────────────────
cat > /opt/studio/scripts/new-project.sh << 'SCRIPT'
#!/bin/bash
set -euo pipefail
PROJECT=$1
SITE_URL=$2
SENDER_NAME=${3:-$PROJECT}
if [[ -z "$PROJECT" ]]; then
  echo "Usage: $0 <project-slug> <site-url> [smtp-sender-name]"
  exit 1
fi
PROJECT_DIR="/opt/studio/projects/supabase-${PROJECT}"
if [[ -d "$PROJECT_DIR" ]]; then
  echo "Project $PROJECT already exists at $PROJECT_DIR"
  exit 1
fi
EXISTING=$(ls /opt/studio/projects/ | grep supabase- | wc -l)
BASE_PORT=$((8000 + EXISTING * 10))
STUDIO_PORT=$((BASE_PORT + 3))
PG_PORT=$((BASE_PORT + 4))
PG_PASSWORD=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
echo "Creating project: $PROJECT"
echo "  Kong port: $BASE_PORT"
echo "  Studio port: $STUDIO_PORT"
echo "  Postgres port: $PG_PORT"
cp -r /opt/studio/projects/supabase /opt/studio/projects/supabase-${PROJECT}
cd "$PROJECT_DIR"
cat > .env << EOF
POSTGRES_PASSWORD=${PG_PASSWORD}
POSTGRES_PORT=${PG_PORT}
JWT_SECRET=${JWT_SECRET}
KONG_HTTP_PORT=${BASE_PORT}
KONG_HTTPS_PORT=$((BASE_PORT + 1))
STUDIO_PORT=${STUDIO_PORT}
SITE_URL=${SITE_URL}
ADDITIONAL_REDIRECT_URLS=${SITE_URL}/**
SMTP_HOST=smtp.resend.com
SMTP_PORT=465
SMTP_USER=resend
SMTP_PASS=${RESEND_API_KEY:-}
SMTP_SENDER_NAME=${SENDER_NAME}
SMTP_ADMIN_EMAIL=hello@vaultsparkstudios.com
EOF
cat >> /etc/caddy/Caddyfile << EOF

${PROJECT}.db.vaultsparkstudios.com {
  reverse_proxy localhost:${BASE_PORT}
}
EOF
systemctl reload caddy
docker compose up -d
echo ""
echo "✓ Project '$PROJECT' is live"
echo "  API URL:  https://${PROJECT}.db.vaultsparkstudios.com"
echo "  Postgres: localhost:${PG_PORT} (SSH tunnel)"
echo "  Studio:   localhost:${STUDIO_PORT} (SSH tunnel)"
echo ""
echo "  SUPABASE_URL: https://${PROJECT}.db.vaultsparkstudios.com"
echo "  POSTGRES_PASSWORD: ${PG_PASSWORD}"
echo "  JWT_SECRET: ${JWT_SECRET}"
echo "  (Generate ANON_KEY + SERVICE_ROLE_KEY from JWT_SECRET)"
SCRIPT
chmod +x /opt/studio/scripts/new-project.sh
echo "✓ new-project.sh written"

# ── Watchtower ────────────────────────────────────────────────────────────────
docker run -d \
  --name watchtower \
  --restart unless-stopped \
  -v /var/run/docker.sock:/var/run/docker.sock \
  containrrr/watchtower \
  --schedule "0 0 4 * * *" \
  --cleanup
echo "✓ Watchtower running"

# ── Daily backup cron ─────────────────────────────────────────────────────────
(crontab -l 2>/dev/null; echo "0 3 * * * /opt/studio/scripts/backup.sh >> /var/log/studio-backup.log 2>&1") | crontab -
echo "✓ Backup cron scheduled (daily 3 AM UTC)"

echo ""
echo "Phase 4 complete."
echo "Note: backup.sh needs R2 credentials before it will work — edit /opt/studio/scripts/backup.sh when ready."
