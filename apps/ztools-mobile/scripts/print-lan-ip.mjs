#!/usr/bin/env node
import os from 'node:os';

function lanAddresses() {
  const nets = os.networkInterfaces();
  const out = [];
  for (const entries of Object.values(nets)) {
    for (const net of entries || []) {
      if (net.family !== 'IPv4' || net.internal) continue;
      const ip = net.address;
      if (ip.startsWith('169.254.')) continue;
      out.push({ ip, iface: net.address });
    }
  }
  return out;
}

const addrs = lanAddresses();
console.log('Use one of these in apps/ztools-mobile/.env:\n');
if (!addrs.length) {
  console.log('  (no Wi-Fi/LAN IPv4 found — connect to a network first)');
  process.exit(1);
}
for (const { ip } of addrs) {
  console.log(`EXPO_PUBLIC_ZTOOLS_API_URL=http://${ip}:3000`);
}
console.log('\nAndroid emulator instead:');
console.log('EXPO_PUBLIC_ZTOOLS_API_URL=http://10.0.2.2:3000');
