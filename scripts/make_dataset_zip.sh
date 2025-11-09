#!/usr/bin/env bash
# Create dataset ZIP (works on Windows Git Bash with PowerShell fallback)
# This version excludes all geometry or derived boundary data.

set -euo pipefail
VERSION="2025-04-r1"
ZIPNAME="civic-data-boundaries-us-mn-${VERSION}.zip"
OUTDIR="dist"
mkdir -p "$OUTDIR"

ZIPPATH="${OUTDIR}/${ZIPNAME}"
echo "Creating dataset archive: $ZIPPATH"

if command -v zip >/dev/null 2>&1; then
  zip -r "$ZIPPATH" \
    README.md \
    manifest.json \
    LICENSE \
    CITATION.cff 
else
  echo "zip command not found, using PowerShell..."
  powershell.exe -Command "
    Compress-Archive -Force -Path README.md, manifest.json, LICENSE, CITATION.cff \
    -DestinationPath '${ZIPPATH}'
  "
fi

echo "Done. Archive created at: $ZIPPATH"
