#!/bin/bash
# ============================================================
# BSB Dashboard — Generate APK via Bubblewrap (TWA)
# ============================================================
# Alternative to Capacitor — generates a Trusted Web Activity APK
# that wraps the live website. Does NOT require Android Studio.
#
# Prerequisites:
#   - Node.js & npm installed
#   - Java 11+ (JDK)
#
# Usage:
#   ./scripts/build-twa.sh
# ============================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔══════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   BSB Dashboard — TWA APK Builder    ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════╝${NC}"
echo ""

# Check Java
if ! command -v java &> /dev/null; then
  echo -e "${RED}❌ Java not found. Install JDK 11+.${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Java: $(java -version 2>&1 | head -1)${NC}"

# Create TWA directory
TWA_DIR="$PROJECT_DIR/twa-build"
mkdir -p "$TWA_DIR"
cd "$TWA_DIR"

# Install Bubblewrap
echo -e "${YELLOW}📦 Installing Bubblewrap...${NC}"
npx -y @nicolo-ribaudo/bubblewrap init --manifest="https://dashboard.beragamsewabali.com/manifest.json" 2>&1 || {
  # Fallback: try @nicolo-ribaudo/bubblewrap
  echo -e "${YELLOW}⚠️  Trying alternative bubblewrap...${NC}"
  npx -y @nicolo-ribaudo/bubblewrap@latest init --manifest="https://dashboard.beragamsewabali.com/manifest.json" 2>&1
}

echo ""
echo -e "${YELLOW}🔨 Building APK...${NC}"
npx @nicolo-ribaudo/bubblewrap build 2>&1

if ls *.apk 1>/dev/null 2>&1; then
  APK_FILE=$(ls *.apk | head -1)
  cp "$APK_FILE" "$PROJECT_DIR/public/BSB-Dashboard.apk"
  cp "$APK_FILE" "$PROJECT_DIR/BSB-Dashboard-twa.apk"
  echo ""
  echo -e "${GREEN}╔══════════════════════════════════════╗${NC}"
  echo -e "${GREEN}║   ✅ TWA APK Build Successful!       ║${NC}"
  echo -e "${GREEN}╚══════════════════════════════════════╝${NC}"
  echo -e "${GREEN}   📦 File: BSB-Dashboard-twa.apk${NC}"
  echo -e "${GREEN}   📁 Also at: public/BSB-Dashboard.apk${NC}"
else
  echo -e "${RED}❌ APK not found after build. Check output above.${NC}"
  exit 1
fi
