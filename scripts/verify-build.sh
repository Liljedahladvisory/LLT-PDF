#!/bin/bash
# verify-build.sh — Verifierar att LLT PDF .app-bundlen ar komplett innan DMG skapas
# Anvandning: ./scripts/verify-build.sh [path-to-app]
#
# Per dependency-verification-guide.md i llt-guides

set -e

APP="${1:-src-tauri/target/release/bundle/macos/LLT PDF.app}"
ERRORS=0

echo "=== LLT PDF Build Verification ==="
echo "App: $APP"
echo ""

# 1. Kontrollera att .app finns
if [ ! -d "$APP" ]; then
  echo "FEL: $APP finns inte. Kor 'npm run tauri build' forst."
  exit 1
fi

# 2. Kontrollera att binarfilen finns
BINARY="$APP/Contents/MacOS/llt-pdf"
if [ ! -f "$BINARY" ]; then
  echo "FEL: Binar saknas: $BINARY"
  ERRORS=$((ERRORS+1))
else
  echo "OK: Binarfil finns"

  # Kontrollera arkitektur
  ARCH=$(file "$BINARY" | grep -o "arm64\|x86_64" | head -1)
  echo "   Arkitektur: $ARCH"
fi

# 3. Kontrollera att ikonen finns
ICON="$APP/Contents/Resources/icon.icns"
if [ ! -f "$ICON" ]; then
  echo "FEL: Ikon saknas: $ICON"
  ERRORS=$((ERRORS+1))
else
  echo "OK: Ikon finns"
fi

# 4. Kontrollera Info.plist
PLIST="$APP/Contents/Info.plist"
if [ ! -f "$PLIST" ]; then
  echo "FEL: Info.plist saknas"
  ERRORS=$((ERRORS+1))
else
  echo "OK: Info.plist finns"

  # Extrahera version fran Info.plist
  BUNDLE_VERSION=$(/usr/libexec/PlistBuddy -c "Print CFBundleShortVersionString" "$PLIST" 2>/dev/null || echo "?")
  echo "   Bundle-version: $BUNDLE_VERSION"
fi

# 5. Kontrollera att inga Homebrew-referenser finns i binarfilen
BREW_REFS=$(otool -L "$BINARY" 2>/dev/null | grep "/opt/homebrew" | wc -l | tr -d ' ')
if [ "$BREW_REFS" -gt 0 ]; then
  echo "FEL: $BREW_REFS Homebrew-referens(er) i binaren:"
  otool -L "$BINARY" | grep "/opt/homebrew"
  ERRORS=$((ERRORS+1))
else
  echo "OK: Inga Homebrew-referenser i binaren"
fi

# 6. Kontrollera att systemramverk lankas korrekt
FRAMEWORKS=$(otool -L "$BINARY" 2>/dev/null | grep -c "\.framework" || true)
echo "OK: $FRAMEWORKS systemramverk lankade"

# 7. Kontrollera kodsignering
if codesign --verify --deep --strict "$APP" 2>/dev/null; then
  echo "OK: Kodsignering giltig"
else
  echo "VARNING: Kodsignering ar ogiltig eller ad-hoc (Gatekeeper blockerar pa andra maskiner)"
  echo "   Anvandare maste kora: xattr -rd com.apple.quarantine \"$APP\""
fi

# 8. Kontrollera versionsmatchning
PKG_VERSION=$(node -p "require('./package.json').version" 2>/dev/null || echo "?")
TAURI_VERSION=$(node -p "require('./src-tauri/tauri.conf.json').version" 2>/dev/null || echo "?")
CARGO_VERSION=$(grep '^version' src-tauri/Cargo.toml 2>/dev/null | head -1 | sed 's/.*"\(.*\)".*/\1/' || echo "?")
TS_VERSION=$(grep 'CURRENT_VERSION' src/lib/versionCheck.ts 2>/dev/null | head -1 | sed 's/.*"\(.*\)".*/\1/' || echo "?")

echo ""
echo "=== Versionskontroll ==="
echo "  package.json:     $PKG_VERSION"
echo "  tauri.conf.json:  $TAURI_VERSION"
echo "  Cargo.toml:       $CARGO_VERSION"
echo "  versionCheck.ts:  $TS_VERSION"
echo "  Info.plist:       $BUNDLE_VERSION"

VERSIONS_MATCH=true
if [ "$PKG_VERSION" != "$TAURI_VERSION" ]; then
  echo "FEL: package.json ($PKG_VERSION) != tauri.conf.json ($TAURI_VERSION)"
  VERSIONS_MATCH=false
  ERRORS=$((ERRORS+1))
fi
if [ "$PKG_VERSION" != "$CARGO_VERSION" ]; then
  echo "FEL: package.json ($PKG_VERSION) != Cargo.toml ($CARGO_VERSION)"
  VERSIONS_MATCH=false
  ERRORS=$((ERRORS+1))
fi
if [ "$PKG_VERSION" != "$TS_VERSION" ]; then
  echo "FEL: package.json ($PKG_VERSION) != versionCheck.ts ($TS_VERSION)"
  VERSIONS_MATCH=false
  ERRORS=$((ERRORS+1))
fi
if $VERSIONS_MATCH; then
  echo "OK: Alla versioner matchar ($PKG_VERSION)"
fi

# 9. Kontrollera app-storlek
APP_SIZE=$(du -sh "$APP" | awk '{print $1}')
echo ""
echo "=== Sammanfattning ==="
echo "  App-storlek: $APP_SIZE"

if [ "$ERRORS" -gt 0 ]; then
  echo ""
  echo "AVBRYTER: $ERRORS problem hittade. Fixa innan DMG skapas."
  exit 1
else
  echo ""
  echo "ALLT OK — redo att skapa DMG!"
  exit 0
fi
