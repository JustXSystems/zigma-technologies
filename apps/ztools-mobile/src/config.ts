/** Base URL of the Zigma site (no trailing slash). */
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_ZTOOLS_API_URL?.replace(/\/$/, '') ||
  'https://zigma-technologies.com';

export const TOKEN_KEY = 'ztools_session_token';
export const PUSH_TOKEN_KEY = 'ztools_expo_push_token';
