#!/usr/bin/env node
import { readdirSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
const root = 'node_modules/react-dom';
const listing = existsSync(root) ? readdirSync(root).slice(0, 50) : [];
const pkg = existsSync(join(root, 'package.json'))
  ? JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
  : null;
console.log(
  JSON.stringify(
    {
      listing,
      version: pkg?.version,
      hasClientJs: existsSync(join(root, 'client.js')),
      hasClientDir: existsSync(join(root, 'client')),
      exportClient: pkg?.exports?.['./client'],
      hasBuildId: existsSync('.next/BUILD_ID'),
      nextEntries: existsSync('.next') ? readdirSync('.next').slice(0, 30) : [],
      hasStandalone: existsSync('.next/standalone/server.js') || existsSync('server.js'),
    },
    null,
    2
  )
);
