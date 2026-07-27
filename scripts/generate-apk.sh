#!/bin/bash
# Generate APK via PWABuilder.com cloud API
# Usage: bash scripts/generate-apk.sh

set -e
MANIFEST_URL="https://dashboard.beragamsewabali.com/manifest.json"
OUTPUT="$HOME/bsb-apk"

mkdir -p "$OUTPUT"

echo "=== Step 1: Submit to PWABuilder ==="
# Step 1: Submit URL
RESP=$(curl -s -X POST "https://pwabuilder.com/api/generate" \
  -H "Content-Type: application/json" \
  -d "{\"url\": \"$MANIFEST_URL\"}")

echo "$RESP" | head -c 500

SITE_ID=$(echo "$RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)

if [ -z "$SITE_ID" ]; then
  echo "ERROR: Cannot get site ID from PWABuilder"
  exit 1
fi

echo ""
echo "=== Step 2: Wait for build (Site ID: $SITE_ID) ==="
for i in $(seq 1 30); do
  sleep 5
  STATUS=$(curl -s "https://pwabuilder.com/api/$SITE_ID/status")
  STATE=$(echo "$STATUS" | python3 -c "import sys,json; print(json.load(sys.stdin).get('status',''))" 2>/dev/null)
  echo "  [$i] Status: $STATE"
  if [ "$STATE" = "complete" ] || [ "$STATE" = "done" ]; then
    break
  fi
done

echo ""
echo "=== Step 3: Download APK ==="
APK_URL=$(curl -s "https://pwabuilder.com/api/$SITE_ID" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('androidPackageUrl','') or d.get('apkUrl',''))" 2>/dev/null)

if [ -n "$APK_URL" ]; then
  echo "Downloading: $APK_URL"
  curl -L -o "$OUTPUT/bsb-dashboard.apk" "$APK_URL"
  echo "✅ APK saved to: $OUTPUT/bsb-dashboard.apk"
  ls -lh "$OUTPUT/bsb-dashboard.apk"
else
  echo "❌ Cannot get APK URL. Full API response:"
  curl -s "https://pwabuilder.com/api/$SITE_ID" | python3 -m json.tool 2>/dev/null || echo "Failed to parse"
fi
