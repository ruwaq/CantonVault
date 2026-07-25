// POST /api/auth/logout
// Clear the session cookie. (The old /api/logout.js was a no-op cosmetic stub.)
import { buildClearCookieHeader } from '../_auth.js';

export const onRequestPost = async () =>
  new Response(JSON.stringify({ loggedOut: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': buildClearCookieHeader(),
    },
  });

export const onRequest = (ctx) => new Response('Method Not Allowed', { status: 405 });
