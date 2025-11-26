import { createMiddleware } from 'hono/factory';
import type { Env } from './core-utils';
// This is a mock JWT verification for demo purposes.
// In a real production app, use a proper JWT library like '@tsndr/cloudflare-worker-jwt'.
const verifyMockJWT = (token: string): boolean => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    const payload = JSON.parse(atob(parts[1]));
    // For demo, just check if it has a subject and issued-at time.
    return !!payload.sub && !!payload.iat;
  } catch (e) {
    return false;
  }
};
export const authMiddleware = createMiddleware<{ Bindings: Env }>(async (c, next) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ success: false, error: 'Unauthorized: Missing or invalid Authorization header' }, 401);
  }
  const token = authHeader.split(' ')[1];
  // In a real app, you might have different prefixes or logic to distinguish token types.
  // For this demo, we'll check against the API key first, then try to validate as a JWT.
  const apiKey = c.env.API_KEY;
  if (apiKey && token === apiKey) {
    // Valid API Key
    await next();
    return;
  }
  if (verifyMockJWT(token)) {
    // Valid JWT (mock verification)
    await next();
    return;
  }
  // If neither validation passes
  return c.json({ success: false, error: 'Unauthorized: Invalid token' }, 401);
});