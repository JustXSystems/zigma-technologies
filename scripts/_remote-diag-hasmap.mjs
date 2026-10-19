#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const APP = process.cwd();
const out = {
  cwd: APP,
  reactDomClient: existsSync(join(APP, 'node_modules/react-dom/client.js')),
  reactDomExports: existsSync(join(APP, 'node_modules/react-dom/package.json'))
    ? Object.keys(JSON.parse(readFileSync(join(APP, 'node_modules/react-dom/package.json'), 'utf8')).exports || {}).slice(0, 20)
    : [],
  hits: [],
};

function walk(dir, depth = 0) {
  if (depth > 6 || out.hits.length >= 25) return;
  let entries = [];
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const name of entries) {
    if (out.hits.length >= 25) return;
    const p = join(dir, name);
    let st;
    try {
      st = statSync(p);
    } catch {
      continue;
    }
    if (st.isDirectory()) {
      if (name === 'node_modules' || name === '.git') continue;
      walk(p, depth + 1);
    } else if (name.endsWith('.js') && st.size < 8_000_000) {
      try {
        const txt = readFileSync(p, 'utf8');
        if (txt.includes('LocalBusiness') || txt.includes('hasMap')) {
          out.hits.push({
            file: p.replace(APP + '/', ''),
            size: st.size,
            hasLocalBusiness: txt.includes('LocalBusiness'),
            hasHasMap: txt.includes('hasMap'),
            hasSameAs: txt.includes('sameAs'),
          });
        }
      } catch {
        /* ignore */
      }
    }
  }
}

walk(join(APP, '.next/server'));
console.log(JSON.stringify(out, null, 2));
