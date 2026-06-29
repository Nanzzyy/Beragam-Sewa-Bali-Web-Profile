#!/bin/bash
# Script untuk memulihkan schema dan data langsung ke VPS Server Coolify

SERVER="server"
DB_CONTAINER="db-h46kluhqstf23qr75qhw50eu-174135548604"

echo "========================================================="
echo " Mengirim file backup ke VPS Server..."
echo "========================================================="

scp latest_schema.sql backup_data.sql $SERVER:/tmp/

echo "========================================================="
echo " Mengembalikan Schema di Server..."
echo "========================================================="

ssh $SERVER "cat /tmp/latest_schema.sql | docker exec -i $DB_CONTAINER psql -U supabase_admin -d postgres"

echo "========================================================="
echo " Mengembalikan Data di Server..."
echo "========================================================="

ssh $SERVER "cat /tmp/backup_data.sql | docker exec -i $DB_CONTAINER psql -U postgres -d postgres"

echo "✅ Selesai! Silakan coba Create User di Supabase Studio sekarang."
