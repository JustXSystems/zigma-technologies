#!/usr/bin/env node
const major = Number(process.versions.node.split('.')[0]);
if (major < 20) {
  console.error('\nERROR: Node.js v' + process.versions.node + ' is too old for Expo SDK 57.');
  console.error('Install Node 20+ from https://nodejs.org/\n');
  process.exit(1);
}
