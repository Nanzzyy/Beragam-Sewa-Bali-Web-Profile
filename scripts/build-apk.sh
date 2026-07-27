#!/bin/bash
# Generate TWA APK using PWABuilder cloud API
# Usage: bash scripts/build-apk.sh

MANIFEST_URL="https://dashboard.beragamsewabali.com/manifest.json"
OUTPUT_DIR="$HOME/bsb-apk"

echo "Sending manifest to PWABuilder..."
RESPONSE=$(curl -s -X POST "https://pwabuilder.com/api/generate" \
  -H "Content-Type: application/json" \
  -d "{\"url\": \"$MANIFEST_URL\"}")

echo "$RESPONSE" | python3 -c "
import sys, json
data = json.load(sys.stdin)
if 'error' in data:
    print('Error:', data['error'])
else:
    print('APK URL:', data.get('apkUrl', 'N/A'))
    print('Status:', data.get('status', 'N/A'))
" 2>&1

echo "Done"
