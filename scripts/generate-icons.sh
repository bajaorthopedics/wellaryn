#!/bin/bash
# Generate PNG icons from the SVG source for PWA manifest.
# Requires: rsvg-convert (librsvg) — install via `brew install librsvg`
# Or use Inkscape: `brew install inkscape`

SVG_SOURCE="$(dirname "$0")/../public/icons/icon.svg"
OUTPUT_DIR="$(dirname "$0")/../public/icons"

echo "Generating PWA icons from SVG..."

if command -v rsvg-convert &> /dev/null; then
  rsvg-convert -w 192 -h 192 "$SVG_SOURCE" > "$OUTPUT_DIR/icon-192.png"
  rsvg-convert -w 512 -h 512 "$SVG_SOURCE" > "$OUTPUT_DIR/icon-512.png"
  echo "✅ Generated icon-192.png and icon-512.png"
elif command -v inkscape &> /dev/null; then
  inkscape "$SVG_SOURCE" -w 192 -h 192 -o "$OUTPUT_DIR/icon-192.png"
  inkscape "$SVG_SOURCE" -w 512 -h 512 -o "$OUTPUT_DIR/icon-512.png"
  echo "✅ Generated icon-192.png and icon-512.png"
elif command -v sips &> /dev/null; then
  # macOS built-in — convert SVG to PNG (limited support)
  echo "⚠️  sips has limited SVG support. Consider installing librsvg:"
  echo "    brew install librsvg"
  echo ""
  echo "You can also use an online converter or Figma to export:"
  echo "  - 192x192 → $OUTPUT_DIR/icon-192.png"
  echo "  - 512x512 → $OUTPUT_DIR/icon-512.png"
else
  echo "❌ No SVG-to-PNG converter found."
  echo "Install librsvg: brew install librsvg"
  echo "Then re-run this script."
  exit 1
fi
