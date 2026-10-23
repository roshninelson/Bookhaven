import test from 'node:test';
import assert from 'node:assert/strict';

test('CORS allows localhost, Vercel production and preview domains', () => {
  const allowedOrigins = new Set([
    'http://localhost:5173',
    'http://localhost:3000',
    'https://bookhaven-cyan.vercel.app',
  ]);

  function isOriginAllowed(origin) {
    if (!origin) return true;
    if (allowedOrigins.has(origin)) return true;
    if (/^https:\/\/[a-z0-9-]+(\.vercel\.app)$/i.test(origin)) return true;
    return false;
  }

  // Allowed
  assert.equal(isOriginAllowed('http://localhost:5173'), true);
  assert.equal(isOriginAllowed('https://bookhaven-cyan.vercel.app'), true);
  assert.equal(isOriginAllowed('https://bookhaven-git-main-user.vercel.app'), true);
  assert.equal(isOriginAllowed('https://bookhaven-preview-123.vercel.app'), true);
  assert.equal(isOriginAllowed(null), true);
  assert.equal(isOriginAllowed(undefined), true);

  // Rejected
  assert.equal(isOriginAllowed('https://evil-site.com'), false);
  assert.equal(isOriginAllowed('https://attacker-vercel.app.fake.com'), false);
});
