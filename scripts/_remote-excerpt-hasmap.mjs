#!/usr/bin/env node
import { readFileSync } from 'node:fs';
const p = '.next/server/chunks/ssr/src_19b3f0m._.js';
const s = readFileSync(p, 'utf8');
const i = s.indexOf('hasMap');
// Also find mapsUrl / google.com/maps
const m = s.indexOf('mapsUrl');
const g = s.indexOf('google.com/maps');
console.log(
  JSON.stringify(
    {
      hasMapIndex: i,
      mapsUrlIndex: m,
      mapsSearchIndex: g,
      beforeHasMap: i >= 0 ? s.slice(Math.max(0, i - 900), i + 80) : null,
      mapsUrlCtx: m >= 0 ? s.slice(Math.max(0, m - 100), m + 200) : null,
      mapsSearchCtx: g >= 0 ? s.slice(Math.max(0, g - 150), g + 200) : null,
    },
    null,
    2
  )
);
