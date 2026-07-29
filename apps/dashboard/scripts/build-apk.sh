#!/bin/bash
# ============================================================
# BSB Dashboard — Build APK Script
# ============================================================
# Generates a native Android APK from the dashboard web app
# using Capacitor. The APK wraps the live dashboard URL in
# a native WebView.
#
# Prerequisites:
#   - Node.js & npm installed
#   - Android SDK installed (ANDROID_HOME set)
#   - Java 17+ (for Gradle)
#
# Usage:
#   ./scripts/build-apk.sh          # Debug APK
#   ./scripts/build-apk.sh release  # Release APK (needs keystore)
# ============================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔══════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   BSB Dashboard — APK Builder        ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════╝${NC}"
echo ""

# Check prerequisites
echo -e "${YELLOW}🔍 Checking prerequisites...${NC}"

if ! command -v node &> /dev/null; then
  echo -e "${RED}❌ Node.js not found. Please install Node.js first.${NC}"
  exit 1
fi

if ! command -v npx &> /dev/null; then
  echo -e "${RED}❌ npx not found. Please install npm first.${NC}"
  exit 1
fi

if [ -z "$ANDROID_HOME" ] && [ -z "$ANDROID_SDK_ROOT" ]; then
  echo -e "${YELLOW}⚠️  ANDROID_HOME not set. Checking common locations...${NC}"
  if [ -d "$HOME/Android/Sdk" ]; then
    export ANDROID_HOME="$HOME/Android/Sdk"
    echo -e "${GREEN}   Found at $ANDROID_HOME${NC}"
  elif [ -d "$HOME/Library/Android/sdk" ]; then
    export ANDROID_HOME="$HOME/Library/Android/sdk"
    echo -e "${GREEN}   Found at $ANDROID_HOME${NC}"
  else
    echo -e "${RED}❌ Android SDK not found.${NC}"
    echo -e "${YELLOW}   Install Android Studio or set ANDROID_HOME.${NC}"
    echo -e "${YELLOW}   Download: https://developer.android.com/studio${NC}"
    exit 1
  fi
fi

echo -e "${GREEN}✅ Node.js: $(node -v)${NC}"
echo -e "${GREEN}✅ Android SDK: ${ANDROID_HOME:-$ANDROID_SDK_ROOT}${NC}"
echo ""

# Step 1: Ensure out directory exists
echo -e "${YELLOW}📂 Preparing web assets...${NC}"
mkdir -p out
if [ ! -f "out/index.html" ]; then
  echo "<html><head><meta http-equiv='refresh' content='0;url=https://dashboard.beragamsewabali.com'></head></html>" > out/index.html
fi
echo -e "${GREEN}✅ Web assets ready${NC}"

# Step 2: Sync Capacitor
echo -e "${YELLOW}🔄 Syncing Capacitor...${NC}"
npx cap sync android
echo -e "${GREEN}✅ Capacitor synced${NC}"

# Step 3: Copy icons to Android resources
echo -e "${YELLOW}🎨 Copying app icons...${NC}"
ICON_DIR="android/app/src/main/res"
if [ -d "$ICON_DIR" ]; then
  # Copy icons to appropriate mipmap directories
  mkdir -p "$ICON_DIR/mipmap-mdpi" "$ICON_DIR/mipmap-hdpi" "$ICON_DIR/mipmap-xhdpi" "$ICON_DIR/mipmap-xxhdpi" "$ICON_DIR/mipmap-xxxhdpi"
  
  [ -f "public/icon-48.png" ] && cp "public/icon-48.png" "$ICON_DIR/mipmap-mdpi/ic_launcher.png"
  [ -f "public/icon-72.png" ] && cp "public/icon-72.png" "$ICON_DIR/mipmap-hdpi/ic_launcher.png"
  [ -f "public/icon-96.png" ] && cp "public/icon-96.png" "$ICON_DIR/mipmap-xhdpi/ic_launcher.png"
  [ -f "public/icon-144.png" ] && cp "public/icon-144.png" "$ICON_DIR/mipmap-xxhdpi/ic_launcher.png"
  [ -f "public/icon-192.png" ] && cp "public/icon-192.png" "$ICON_DIR/mipmap-xxxhdpi/ic_launcher.png"
  
  # Round icons (same for now)
  [ -f "public/icon-48.png" ] && cp "public/icon-48.png" "$ICON_DIR/mipmap-mdpi/ic_launcher_round.png"
  [ -f "public/icon-72.png" ] && cp "public/icon-72.png" "$ICON_DIR/mipmap-hdpi/ic_launcher_round.png"
  [ -f "public/icon-96.png" ] && cp "public/icon-96.png" "$ICON_DIR/mipmap-xhdpi/ic_launcher_round.png"
  [ -f "public/icon-144.png" ] && cp "public/icon-144.png" "$ICON_DIR/mipmap-xxhdpi/ic_launcher_round.png"
  [ -f "public/icon-192.png" ] && cp "public/icon-192.png" "$ICON_DIR/mipmap-xxxhdpi/ic_launcher_round.png"
  
  echo -e "${GREEN}✅ Icons copied${NC}"
else
  echo -e "${YELLOW}⚠️  Android res directory not found, skipping icon copy${NC}"
fi

# Step 4: Build APK
BUILD_TYPE="${1:-debug}"
echo ""
echo -e "${YELLOW}🔨 Building ${BUILD_TYPE} APK...${NC}"

cd android

if [ "$BUILD_TYPE" = "release" ]; then
  ./gradlew assembleRelease
  APK_PATH="app/build/outputs/apk/release/app-release.apk"
else
  ./gradlew assembleDebug
  APK_PATH="app/build/outputs/apk/debug/app-debug.apk"
fi

cd ..

if [ -f "android/$APK_PATH" ]; then
  # Copy APK to project root for easy access
  OUTPUT_NAME="BSB-Dashboard-${BUILD_TYPE}.apk"
  cp "android/$APK_PATH" "$OUTPUT_NAME"
  
  # Also copy to public folder for download page
  cp "android/$APK_PATH" "public/$OUTPUT_NAME"
  
  APK_SIZE=$(du -h "$OUTPUT_NAME" | cut -f1)
  
  echo ""
  echo -e "${GREEN}╔══════════════════════════════════════╗${NC}"
  echo -e "${GREEN}║   ✅ APK Build Successful!           ║${NC}"
  echo -e "${GREEN}╚══════════════════════════════════════╝${NC}"
  echo ""
  echo -e "${GREEN}   📦 File: ${OUTPUT_NAME}${NC}"
  echo -e "${GREEN}   📏 Size: ${APK_SIZE}${NC}"
  echo -e "${GREEN}   📁 Also copied to: public/${OUTPUT_NAME}${NC}"
  echo ""
  echo -e "${YELLOW}   Install on device:${NC}"
  echo -e "${BLUE}   adb install ${OUTPUT_NAME}${NC}"
  echo ""
else
  echo -e "${RED}❌ APK build failed. Check the Gradle output above.${NC}"
  exit 1
fi
