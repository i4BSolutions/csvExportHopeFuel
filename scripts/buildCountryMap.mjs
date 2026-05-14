import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as XLSX from "xlsx";

const root = resolve(fileURLToPath(import.meta.url), "../..");
const src = resolve(root, "Country Name Mapping.xlsx");
const out = resolve(root, "src/countryMap.generated.ts");

const wb = XLSX.read(readFileSync(src), { type: "buffer" });
const sheet = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

const [headers, ...body] = rows;
const countryIdx = headers.findIndex((h) => String(h).trim().toLowerCase() === "country");
const isoIdx = headers.findIndex((h) => String(h).trim().toLowerCase() === "iso");
if (countryIdx === -1 || isoIdx === -1) {
  throw new Error(`Expected 'Country' and 'ISO' headers, got: ${JSON.stringify(headers)}`);
}

const entries = [];
const seen = new Map();
for (const row of body) {
  const name = String(row[countryIdx] ?? "").trim();
  const code = String(row[isoIdx] ?? "").trim().toUpperCase();
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
  "// AUTO-GENERATED from Country Name Mapping.xlsx by scripts/buildCountryMap.mjs.",
  "// Do not edit by hand — edit the xlsx and re-run `npm run build` (or `npm run dev`).",
  "",
  "export const COUNTRY_MAP: Record<string, string> = {",
  ...entries.map(([name, code]) => `  ${JSON.stringify(name)}: ${JSON.stringify(code)},`),
  "};",
  "",
];

writeFileSync(out, lines.join("\n"));
console.log(`countryMap.generated.ts: ${entries.length} entries written`);
