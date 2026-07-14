#!/usr/bin/env bash
# dev-clone-prod.sh
#
# Clone schema + data dari Supabase PRODUKSI ke stack Docker Supabase LOKAL.
# Drift-proof: schema lokal dibangun ulang dari schema prod (bukan latest_schema.sql),
# jadi perbedaan kolom/tabel prod vs repo tak menyebabkan error load.
#
# Safety:
#   - PRODUKSI: hanya membaca (pg_dump). Tidak pernah menulis ke server prod.
#   - LOKAL: DROP SCHEMA public CASCADE lalu rebuild dari prod. Hanya ke container lokal.
#   - Patuh AGENT.md §3: --schema=public (hanya public; auth/storage/realtime tak disentuh).
#
# Prasyrat:
#   - Stack Supabase lokal jalan (sh run.sh start).
#   - SSH key-auth ke server (alias "server" atau set SSH_HOST).
#
# Env:
#   SSH_HOST              alias/host SSH server prod        (default: server)
#   PROD_DB_CONTAINER     nama container db di server        (default: auto-detect ^db-)
#   LOCAL_DB_CONTAINER    nama container db lokal            (default: supabase-db)
#   SCHEMA_FILE           path dump schema                  (default: ./dev-prod-schema.sql)
#   DATA_FILE             path dump data                    (default: ./dev-prod-dump.sql)
#
# Usage:
#   sh scripts/dev-clone-prod.sh
#   SSH_HOST=user@1.2.3.4 sh scripts/dev-clone-prod.sh

set -euo pipefail

SSH_HOST="${SSH_HOST:-server}"
LOCAL_DB_CONTAINER="${LOCAL_DB_CONTAINER:-supabase-db}"
SCHEMA_FILE="${SCHEMA_FILE:-./dev-prod-schema.sql}"
DATA_FILE="${DATA_FILE:-./dev-prod-dump.sql}"
PSQL_LOCAL() { docker exec -i "$LOCAL_DB_CONTAINER" psql -U postgres -d postgres "$@"; }

cd "$(dirname "$0")/.."

# ── 1. Cek stack lokal ──────────────────────────────────────────────────────
if ! docker ps --format '{{.Names}}' | grep -qx "$LOCAL_DB_CONTAINER"; then
  echo "ERROR: container '$LOCAL_DB_CONTAINER' tidak berjalan. Jalankan: sh run.sh start" >&2
  exit 1
fi

# ── 2. Deteksi container DB produksi ────────────────────────────────────────
if [ -z "${PROD_DB_CONTAINER:-}" ]; then
  echo "Mendeteksi container DB di server '$SSH_HOST'..."
  PROD_DB_CONTAINER=$(ssh "$SSH_HOST" \
    "docker ps --format '{{.Names}}\t{{.Image}}' | awk '\$1 ~ /^db-/ && \$2 !~ /coolify/ {print \$1; exit} \$2 ~ /supabase\\/postgres:/ {print \$1; exit} \$1 == \"supabase-db\" {print \$1; exit}'" \
    || true)
  if [ -z "$PROD_DB_CONTAINER" ]; then
    echo "ERROR: container DB prod tak ditemukan. Set PROD_DB_CONTAINER manual." >&2
    exit 1
  fi
fi
echo "→ Container DB prod : $PROD_DB_CONTAINER"

# ── 3. Konfirmasi (merusak data lokal) ──────────────────────────────────────
echo ""
echo "PERHATIAN: DROP SCHEMA public CASCADE di container lokal '$LOCAL_DB_CONTAINER'."
echo "           Semua data lokal (hasil clone sebelumnya) akan diganti data prod."
printf "Lanjut? [y/N] "
read -r CONFIRM
if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
  echo "Dibatalkan."; exit 0
fi

# ── 4. Dump schema + data dari prod (READ-ONLY) ─────────────────────────────
echo "Dumping schema public dari prod (termasuk GRANT & RLS) → $SCHEMA_FILE ..."
ssh "$SSH_HOST" \
  "docker exec $PROD_DB_CONTAINER pg_dump -U postgres -d postgres --schema-only --schema=public --no-owner" \
  > "$SCHEMA_FILE"

echo "Dumping data public dari prod → $DATA_FILE ..."
ssh "$SSH_HOST" \
  "docker exec $PROD_DB_CONTAINER pg_dump -U postgres -d postgres --schema=public --data-only --inserts --no-owner --no-acl" \
  > "$DATA_FILE"
echo "→ schema: $(wc -c < "$SCHEMA_FILE" | tr -d ' ') bytes | data: $(wc -c < "$DATA_FILE" | tr -d ' ') bytes"

# ── 5. Rebuild schema public lokal dari prod ────────────────────────────────
echo "Rebuild schema public lokal dari prod (DROP CASCADE + recreate)..."
PSQL_LOCAL -v ON_ERROR_STOP=1 <<'SQL'
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON SCHEMA public TO postgres, supabase_admin;
SQL
PSQL_LOCAL -v ON_ERROR_STOP=0 < "$SCHEMA_FILE" > /tmp/dev-clone-schema.log 2>&1
grep -iE "^ERROR|FATAL" /tmp/dev-clone-schema.log | grep -v "already exists" | head -5 || true

# ── 6. GRANT standar (jaga-jaga bila dump schema tak bawa grant) ────────────
PSQL_LOCAL -v ON_ERROR_STOP=1 <<'SQL'
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;
SQL

# ── 7. Load data (replica role: bypass urutan FK & trigger) ─────────────────
echo "Load data (session_replication_role=replica)..."
(echo "SET session_replication_role=replica;"; cat "$DATA_FILE") \
  | PSQL_LOCAL -v ON_ERROR_STOP=0 > /tmp/dev-clone-data.log 2>&1
echo "→ data errors: $(grep -ciE '^ERROR|FATAL' /tmp/dev-clone-data.log)"
grep -iE '^ERROR|FATAL' /tmp/dev-clone-data.log | head -3 || true

# ── 8. Re-create trigger auth.users (terhapus saat DROP public CASCADE) ─────
echo "Re-create trigger on_auth_user_created di auth.users..."
PSQL_LOCAL -v ON_ERROR_STOP=1 <<'SQL' 2>/dev/null || echo "  (skip — trigger tak bisa dibuat, dev-create-user.js punya fallback)"
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
SQL

# ── 9. Ringkasan ────────────────────────────────────────────────────────────
echo ""
echo "✅ Clone selesai. Row count lokal:"
PSQL_LOCAL -c "SELECT 'transactions' t, count(*) FROM public.transactions
  UNION ALL SELECT 'journal_entries', count(*) FROM public.journal_entries
  UNION ALL SELECT 'accounts', count(*) FROM public.accounts
  UNION ALL SELECT 'profiles', count(*) FROM public.profiles
  UNION ALL SELECT 'jobs', count(*) FROM public.jobs;" 2>/dev/null || true
echo ""
echo "NEXT: bikin dev user lokal → npm run dev:user   (lalu npm run dev:all)"
echo "      Hapus file dump setelahnya: rm $SCHEMA_FILE $DATA_FILE  (berisi data prod)"
