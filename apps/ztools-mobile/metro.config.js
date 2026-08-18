const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Windows: Node often binds Metro to IPv6 (::1) only; adb reverse needs IPv4.
config.server = {
  ...config.server,
  host: '127.0.0.1',
  port: 8081,
};

module.exports = config;
