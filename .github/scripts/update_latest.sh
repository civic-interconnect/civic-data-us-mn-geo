#!/usr/bin/env bash
set -euo pipefail

echo "Updating latest/ directories under data/ ..."

for layer in data/*/; do
  if [ -d "$layer" ]; then
    # Find subdirectories (versions), excluding latest/
    versions=($(find "$layer" -maxdepth 1 -mindepth 1 -type d ! -name "latest" | sort -V))

    if [ ${#versions[@]} -eq 0 ]; then
      echo "No version directories found in $layer, skipping."
      continue
    fi

    NEWEST="${versions[-1]}/"
    echo "Updating ${layer}latest to ${NEWEST}"

    rm -rf "${layer}latest"
    cp -r "$NEWEST" "${layer}latest"
  fi
done

echo "latest/ directories updated."
