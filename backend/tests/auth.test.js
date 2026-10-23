import test from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, comparePassword, generateToken, verifyToken } from '../src/lib/auth.js';

test('auth: password hashing and verification', async () => {
  const password = 'SecretPassword123!';
  const hash = await hashPassword(password);
  assert.notEqual(hash, password);
  assert.ok(hash.startsWith('$2'));

  const valid = await comparePassword(password, hash);
  assert.equal(valid, true);

  const invalid = await comparePassword('WrongPassword', hash);
  assert.equal(invalid, false);
});

test('auth: jwt token generation and payload decode', () => {
  const user = { id: 'u123', email: 'reader@bookhaven.dev', role: 'reader' };
  const token = generateToken(user);
  assert.ok(typeof token === 'string');
  assert.ok(token.length > 20);

  const decoded = verifyToken(token);
  assert.equal(decoded.id, 'u123');
  assert.equal(decoded.email, 'reader@bookhaven.dev');
  assert.equal(decoded.role, 'reader');
});
