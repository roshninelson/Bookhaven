import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'bookhaven-dev-secret-change-in-production';
const JWT_EXPIRES = '24h';

if (process.env.NODE_ENV === 'production' && JWT_SECRET === 'bookhaven-dev-secret-change-in-production') {
  console.error('[SECURITY] JWT_SECRET must be set in production. Using default is UNSAFE.');
}

export async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

export async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

export function generateToken(user) {
  return jwt.sign(
    { sub: user.id, id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES },
  );
}

export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}
