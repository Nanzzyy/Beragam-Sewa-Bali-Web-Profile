#!/bin/bash
# coolify_restore_db.sh
# Script untuk memulihkan (restore) data Supabase di Coolify.

set -e

CONTAINER_NAME="supabase-db"
DB_USER="postgres"
DB_NAME="postgres"

echo "=========================================="
echo " Supabase Database Restore - Coolify Mode"
echo "=========================================="

if [ -z "$1" ]; then
  echo "Penggunaan: ./scripts/coolify_restore_db.sh <path_to_sql_dump>"
  echo "Contoh: ./scripts/coolify_restore_db.sh latest_schema.sql"
  exit 1
fi

DUMP_FILE=$1

if [ ! -f "$DUMP_FILE" ]; then
  echo "Error: File '$DUMP_FILE' tidak ditemukan!"
  echo "Pastikan Anda sudah mengunggah file SQL ke server (misal melalui SFTP) jika tidak ada di Git."
  exit 1
fi

# Cek apakah container DB berjalan
if ! docker ps | grep -q "$CONTAINER_NAME"; then
  echo "Error: Container '$CONTAINER_NAME' tidak berjalan atau belum healthy."
  echo "Pastikan stack Supabase sudah di-deploy dan berjalan di Coolify."
  exit 1
fi

echo "Memulihkan '$DUMP_FILE' ke dalam container '$CONTAINER_NAME'..."
echo "Tunggu sebentar, proses ini mungkin memakan waktu beberapa menit tergantung ukuran data..."

# Eksekusi restore
cat "$DUMP_FILE" | docker exec -i "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME"

echo ""
echo "✅ Restore selesai dengan sukses!"
echo "Silakan cek Dashboard Supabase (Studio) Anda untuk memverifikasi data."
