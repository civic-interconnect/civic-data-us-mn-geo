#!/usr/bin/env bash
set -euo pipefail

if ! command -v geojsonhint >/dev/null 2>&1; then
  echo "geojsonhint is not installed."
  echo "Install it with: npm install -g @mapbox/geojsonhint"
  exit 1
fi

echo "Validating GeoJSON files under data/ ..."
find data -type f -name "*.geojson" -print -exec geojsonhint {} \;

echo "GeoJSON validation completed."
