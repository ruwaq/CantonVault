// POST /api/auth/login
// Exchange DEMO_TOKEN (Authorization: Bearer <token>) for a signed session cookie.
// The cookie is HttpOnly so the browser sends it automatically on subsequent
// same-origin requests; no JS ever sees it.
import { isValidDemoToken, buildSessionCookieHeader } from '../_auth.js';

export const onRequestPost = async (context) => {
  const { request, env } = context;

  if (!env.DEMO_TOKEN) {
    return Response.json({ error: 'Login disabled — DEMO_TOKEN not configured' }, { status: 503 });
  }

  const ok = await isValidDemoToken(env, request);
  if (!ok) {
    return Response.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  const setCookie = await buildSessionCookieHeader(env);
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': setCookie,
    },
  });
};

// Reject other verbs explicitly.
export const onRequest = (ctx) => new Response('Method Not Allowed', { status: 405 });
