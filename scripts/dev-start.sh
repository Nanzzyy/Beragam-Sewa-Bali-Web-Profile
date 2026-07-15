#!/usr/bin/env bash
# Satu command untuk menjalankan SEMUA service lokal:
#   1. Start stack Supabase Docker (db, kong, auth, storage, ...) — idempoten
#   2. Jalankan API + web + cashflow + dashboard bersamaan (foreground)
# Ctrl-C sekali untuk mematikan semua app. Stack Docker dibiarkan hidup
# (stop pakai `npm run dev:down`).
#
# Prasyarat: `.env` sudah ada (lihat dev-doc/LOCAL-DEV.md).
# Catatan: service `realtime` sering unhealthy lokal tapi NON-KRITIS —
# API hanya butuh `supabase-db` + `supabase-kong` sehat. Script ini hanya
# menunggu kedua service itu, jadi realtime tidak pernah memblokir dev.
set -uo pipefail   # tanpa -e: jangan abort bila service non-kritis belum sehat
cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
  echo "ERROR: .env belum ada. Jalankan setup di dev-doc/LOCAL-DEV.md dulu." >&2
  exit 1
fi

echo "▶ [1/2] Memastikan stack Supabase lokal hidup (idempoten)..."
# run.sh start pakai `docker compose up -d --wait` yang gagal jika ada service
# unhealthy (mis. realtime). Kita abaikan dan cuma menunggu db + kong di bawah.
sh run.sh start || echo "  (ada service non-kritis belum healthy — lanjut)"

echo "  tunggu supabase-db & supabase-kong sehat..."
for i in $(seq 1 30); do
  db=$(docker inspect -f '{{.State.Health.Status}}' supabase-db 2>/dev/null || echo "?")
  kong=$(docker inspect -f '{{.State.Health.Status}}' supabase-kong 2>/dev/null || echo "?")
  if [ "$db" = healthy ] && [ "$kong" = healthy ]; then
    echo "  OK: db=$db kong=$kong"
    break
  fi
  if [ "$i" = 30 ]; then
    echo "ERROR: db/kong belum sehat setelah 60s (db=$db kong=$kong). Cek: docker ps" >&2
    exit 1
  fi
  sleep 2
done

echo "▶ [2/2] Menjalankan semua app — tekan Ctrl-C untuk stop semua:"
echo "    API :3005  |  web :3000  |  cashflow :3001  |  dashboard :3002"
echo
# concurrently meneruskan sinyal Ctrl-C ke semua app sekaligus
exec npm run dev:all
