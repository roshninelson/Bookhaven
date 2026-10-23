import { Router } from 'express';
import { hashPassword, comparePassword, generateToken } from '../lib/auth.js';
import { store } from '../lib/store.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* POST /api/auth/register */
router.post('/register', async (req, res) => {
  try {
    const { email, password, display_name } = req.body || {};

    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
    if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'Invalid email format' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
    if (store.findUserByEmail(email)) return res.status(409).json({ error: 'Email already registered' });

    const password_hash = await hashPassword(password);
    const user = store.createUser({ email, password_hash, display_name: display_name || email.split('@')[0] });
    const token = generateToken(user);

    res.status(201).json({
      data: { id: user.id, email: user.email, display_name: user.display_name, role: user.role },
      token,
    });
  } catch (err) {
    console.error('Register error:', err.message);
    res.status(500).json({ error: 'Registration failed' });
  }
});

/* POST /api/auth/login */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

    const user = store.findUserByEmail(email);
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });

    const valid = await comparePassword(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid email or password' });

    const token = generateToken(user);
    store.addAuditLog('user_login', { userId: user.id, email: user.email });

    res.json({
      data: { id: user.id, email: user.email, display_name: user.display_name, role: user.role },
      token,
    });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ error: 'Login failed' });
  }
});

/* GET /api/auth/me – requires authentication */
router.get('/me', authenticate, (req, res) => {
  res.json({ data: req.user });
});

/* PUT /api/auth/profile – update display name */
router.put('/profile', authenticate, (req, res) => {
  const { display_name } = req.body || {};
  if (!display_name || display_name.trim().length < 1) {
    return res.status(400).json({ error: 'Display name is required' });
  }
  store.updateUser(req.user.id, { display_name: display_name.trim() });
  res.json({ data: { ...req.user, display_name: display_name.trim() } });
});

/* POST /api/auth/logout – client discards token; audit only */
router.post('/logout', authenticate, (req, res) => {
  store.addAuditLog('user_logout', { userId: req.user.id });
  res.json({ ok: true });
});

export default router;
