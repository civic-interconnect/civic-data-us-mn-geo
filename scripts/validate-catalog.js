/**
 * Validate catalog.json against JSON Schema (2020-12) using Ajv v8.
 * 
 * File: scripts/validate-catalog.js
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

// ESM-safe __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Utility to load JSON relative to repo root
function loadJson(relPath) {
  const fullPath = path.resolve(__dirname, "..", relPath);
  return JSON.parse(fs.readFileSync(fullPath, "utf8"));
}

// Load schemas and data
const entrySchema = loadJson("schemas/catalog-entry.schema.json");
const rootSchema = loadJson("schemas/catalog.schema.json");
const catalog = loadJson("api/v1.0.0/catalog.json");

// Configure Ajv
const ajv = new Ajv2020({
  strict: true,
  allErrors: true
});
addFormats(ajv);

// Register the entry schema so $ref in catalog.schema.json resolves
ajv.addSchema(entrySchema);

// Compile the root (catalog) schema
const validate = ajv.compile(rootSchema);

// Validate the catalog
const valid = validate(catalog);

if (!valid) {
  console.error("Catalog validation errors:");
  console.error(JSON.stringify(validate.errors, null, 2));
  process.exit(1);
}

console.log("Success: Catalog valid");
