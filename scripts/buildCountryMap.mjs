import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(import.meta.url), "../..");
const src = resolve(root, "Country_Name_Mapping.json");
const out = resolve(root, "src/countryMap.generated.ts");

const rows = JSON.parse(readFileSync(src, "utf8"));
if (!Array.isArray(rows)) {
  throw new Error(`Expected ${src} to contain a JSON array of {Country, ISO} objects`);
}

const entries = [];
const seen = new Map();
for (const row of rows) {
  const name = String(row?.Country ?? "").trim();
  const code = String(row?.ISO ?? "").trim().toUpperCase();
  if (!name || !code) continue;
  const key = name.toLowerCase();
  if (seen.has(key) && seen.get(key) !== code) {
    throw new Error(`Conflicting ISO for '${name}': ${seen.get(key)} vs ${code}`);
  }
  if (!seen.has(key)) {
    seen.set(key, code);
    entries.push([name, code]);
  }
}

entries.sort((a, b) => a[0].localeCompare(b[0]));

const lines = [
  "// AUTO-GENERATED from Country_Name_Mapping.json by scripts/buildCountryMap.mjs.",
  "// Do not edit by hand — edit the JSON and re-run `npm run build` (or `npm run dev`).",
  "",
  "export const COUNTRY_MAP: Record<string, string> = {",
  ...entries.map(([name, code]) => `  ${JSON.stringify(name)}: ${JSON.stringify(code)},`),
  "};",
  "",
];

writeFileSync(out, lines.join("\n"));
console.log(`countryMap.generated.ts: ${entries.length} entries written`);
