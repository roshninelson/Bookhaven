import { verifyToken } from '../lib/auth.js';
import { store } from '../lib/store.js';

/** Require a valid JWT in `Authorization: Bearer <token>` or in an httpOnly cookie. */
export async function authenticate(req, res, next) {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : req.cookies?.token;

  if (!token) return res.status(401).json({ error: 'Authentication required' });

  try {
    const payload = verifyToken(token);
    const user = await store.findUserById(payload.sub);
    if (!user) return res.status(401).json({ error: 'User no longer exists' });
    req.user = { id: user.id, email: user.email, role: user.role, display_name: user.display_name };
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/** Optionally attach user if a token is present, but don't block the request. */
export async function optionalAuth(req, _res, next) {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : req.cookies?.token;
  if (token) {
    try {
      const payload = verifyToken(token);
      const user = await store.findUserById(payload.sub);
      if (user) req.user = { id: user.id, email: user.email, role: user.role, display_name: user.display_name };
    } catch { /* ignore – proceed as anonymous */ }
  }
  next();
}

/** Require the authenticated user to have the 'admin' role. Must follow authenticate(). */
export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}
