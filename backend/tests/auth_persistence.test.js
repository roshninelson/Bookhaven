import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import app from '../src/index.js';
import { store } from '../src/lib/store.js';
import { setSupabase, getSupabase, normalizeSupabaseUrl } from '../src/lib/supabase.js';
import { generateToken } from '../src/lib/auth.js';

let server;
let baseUrl;

test.before(async () => {
  server = http.createServer(app);
  await new Promise(resolve => server.listen(0, resolve));
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}`;
});

test.after(async () => {
  if (server) {
    await new Promise(resolve => server.close(resolve));
  }
});

test('auth persistence: signup creates persistent user, hashes password, and returns valid token', async () => {
  const email = `testuser_${Date.now()}@example.com`;
  const password = 'StrongPassword123!';
  const displayName = 'Alice Reader';

  const res = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, display_name: displayName }),
  });

  assert.equal(res.status, 201, 'Signup should return 201 Created');
  const body = await res.json();
  assert.ok(body.token, 'Should return a JWT token');
  assert.equal(body.data.email, email.toLowerCase());
  assert.equal(body.data.display_name, displayName);
  assert.equal(body.data.role, 'customer');
  assert.equal(body.data.password, undefined, 'Plaintext password must NEVER be in response');
  assert.equal(body.data.password_hash, undefined, 'Password hash must NEVER be in response');

  // Verify internal store state
  const storedUser = await store.findUserByEmail(email);
  assert.ok(storedUser, 'User must exist in store');
  assert.notEqual(storedUser.password_hash, password, 'Password must NOT be stored in plaintext');
  assert.ok(storedUser.password_hash.startsWith('$2'), 'Password must be hashed using bcrypt');
});

test('auth persistence: duplicate email registration is rejected with HTTP 409', async () => {
  const email = `duplicate_${Date.now()}@example.com`;
  const password = 'Password123!';

  // First registration
  const res1 = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, display_name: 'Original' }),
  });
  assert.equal(res1.status, 201);

  // Duplicate registration with identical email
  const res2 = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, display_name: 'Clone' }),
  });
  assert.equal(res2.status, 409, 'Duplicate signup must return 409 Conflict');
  const errBody = await res2.json();
  assert.equal(errBody.error, 'Email already registered');

  // Duplicate registration with different casing
  const res3 = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.toUpperCase(), password, display_name: 'Upper Case' }),
  });
  assert.equal(res3.status, 409, 'Case-insensitive duplicate signup must return 409 Conflict');
});

test('auth persistence: login with valid credentials succeeds and invalid password fails with 401', async () => {
  const email = `login_${Date.now()}@example.com`;
  const password = 'CorrectPassword456!';

  await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, display_name: 'Bob' }),
  });

  // Valid login
  const validRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  assert.equal(validRes.status, 200, 'Valid credentials should return 200 OK');
  const validBody = await validRes.json();
  assert.ok(validBody.token);
  assert.equal(validBody.data.email, email);

  // Invalid password
  const invalidPassRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'WrongPassword' }),
  });
  assert.equal(invalidPassRes.status, 401, 'Invalid password must return 401 Unauthorized');
  const invalidPassBody = await invalidPassRes.json();
  assert.equal(invalidPassBody.error, 'Invalid email or password');

  // Non-existent user
  const unknownUserRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'nonexistent@bookhaven.dev', password: 'AnyPassword123' }),
  });
  assert.equal(unknownUserRes.status, 401, 'Non-existent user must return 401');
});

test('auth persistence: protected routes enforce customer and admin authorization', async () => {
  // 1. Unauthenticated request to /me
  const noTokenRes = await fetch(`${baseUrl}/api/auth/me`);
  assert.equal(noTokenRes.status, 401, 'Request without token must be 401');

  // 2. Request with malformed token
  const badTokenRes = await fetch(`${baseUrl}/api/auth/me`, {
    headers: { Authorization: 'Bearer this.is.invalid' },
  });
  assert.equal(badTokenRes.status, 401, 'Malformed token must be 401');

  // 3. Customer registration & access to /me
  const email = `cust_${Date.now()}@example.com`;
  const regRes = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'Password123!', display_name: 'Customer One' }),
  });
  const { token: custToken } = await regRes.json();

  const meRes = await fetch(`${baseUrl}/api/auth/me`, {
    headers: { Authorization: `Bearer ${custToken}` },
  });
  assert.equal(meRes.status, 200);
  const meBody = await meRes.json();
  assert.equal(meBody.data.email, email);
  assert.equal(meBody.data.role, 'customer');

  // 4. Customer attempting to access admin route
  const adminForbiddenRes = await fetch(`${baseUrl}/api/admin/users`, {
    headers: { Authorization: `Bearer ${custToken}` },
  });
  assert.equal(adminForbiddenRes.status, 403, 'Customer must be forbidden from admin routes');

  // 5. Admin user accessing admin route
  const adminUser = await store.createUser({
    email: `admin_${Date.now()}@example.com`,
    password_hash: '$2a$10$abcdefghijklmnopqrstuvwxyz1234567890',
    display_name: 'Admin Tester',
    role: 'admin',
  });
  const adminToken = generateToken(adminUser);

  const adminAllowedRes = await fetch(`${baseUrl}/api/admin/users`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.equal(adminAllowedRes.status, 200, 'Admin must have access to admin routes');
  const adminBody = await adminAllowedRes.json();
  assert.ok(Array.isArray(adminBody.data));
  assert.ok(adminBody.data.some(u => u.email === adminUser.email));
});

test('auth persistence: Supabase re-hydration survives in-memory cache clear (restart simulation)', async () => {
  const originalClient = getSupabase();
  const mockDb = new Map();

  const mockSupabase = {
    from(table) {
      assert.equal(table, 'users');
      return {
        select(cols) {
          return {
            ilike(col, val) {
              return {
                async maybeSingle() {
                  const normalized = String(val).toLowerCase();
                  for (const user of mockDb.values()) {
                    if (user.email.toLowerCase() === normalized) {
                      return { data: { ...user }, error: null };
                    }
                  }
                  return { data: null, error: null };
                },
              };
            },
            eq(col, val) {
              return {
                async maybeSingle() {
                  const user = mockDb.get(val);
                  return { data: user ? { ...user } : null, error: null };
                },
              };
            },
          };
        },
        insert(row) {
          return {
            select() {
              return {
                async single() {
                  if (Array.from(mockDb.values()).some(u => u.email.toLowerCase() === row.email.toLowerCase())) {
                    return { data: null, error: { code: '23505', message: 'duplicate key value violates unique constraint' } };
                  }
                  mockDb.set(row.id, { ...row });
                  return { data: { ...row }, error: null };
                },
              };
            },
          };
        },
      };
    },
  };

  try {
    setSupabase(mockSupabase);

    // Register user while mock Supabase is active
    const email = `persisted_${Date.now()}@example.com`;
    const password = 'SafePassword123!';
    const regRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, display_name: 'Persisted Reader' }),
    });
    assert.equal(regRes.status, 201);
    assert.ok(mockDb.size > 0, 'User record must have been inserted into Supabase mock DB');

    // SIMULATE SERVER RESTART: completely wipe in-memory users cache
    store._clearUsersCacheForTesting();

    // Verify cache is wiped
    // Now perform login - it should re-fetch from Supabase and authenticate successfully!
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    assert.equal(loginRes.status, 200, 'User reloaded from Supabase must successfully log in');
    const loginBody = await loginRes.json();
    assert.equal(loginBody.data.email, email);

    // Test duplicate rejection via database constraint
    const dupRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, display_name: 'Dupe' }),
    });
    assert.equal(dupRes.status, 409, 'Database unique constraint must return 409');
  } finally {
    setSupabase(originalClient);
  }
});

test('auth persistence: normalizeSupabaseUrl strips /rest/v1, trailing slashes, and quotes', () => {
  assert.equal(normalizeSupabaseUrl('https://abcdef.supabase.co/rest/v1'), 'https://abcdef.supabase.co');
  assert.equal(normalizeSupabaseUrl('https://abcdef.supabase.co/rest/v1/'), 'https://abcdef.supabase.co');
  assert.equal(normalizeSupabaseUrl('https://abcdef.supabase.co/'), 'https://abcdef.supabase.co');
  assert.equal(normalizeSupabaseUrl('"https://abcdef.supabase.co/rest/v1"'), 'https://abcdef.supabase.co');
  assert.equal(normalizeSupabaseUrl("'https://abcdef.supabase.co/'"), 'https://abcdef.supabase.co');
  assert.equal(normalizeSupabaseUrl('  https://abcdef.supabase.co  '), 'https://abcdef.supabase.co');
  assert.equal(normalizeSupabaseUrl('invalid-url'), null);
  assert.equal(normalizeSupabaseUrl(null), null);
  assert.equal(normalizeSupabaseUrl(''), null);
});

test('auth persistence: signup rejects with 503 and does NOT falsely report persistence when Supabase write fails', async () => {
  const originalClient = getSupabase();

  // Mock a failing Supabase client that throws network/database errors
  const failingSupabase = {
    from(table) {
      assert.equal(table, 'users');
      return {
        insert() {
          return {
            select() {
              return {
                async single() {
                  return { data: null, error: { code: 'PGRST125', message: 'Invalid path specified in request URL' } };
                },
              };
            },
          };
        },
      };
    },
  };

  try {
    setSupabase(failingSupabase);

    const email = `failing_${Date.now()}@example.com`;
    const password = 'FailPassword123!';

    // When Supabase is configured and fails, signup must NOT return 201 or claim success
    const regRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, display_name: 'Fail User' }),
    });

    assert.equal(regRes.status, 503, 'Signup must fail with 503 when Supabase write fails');
    const body = await regRes.json();
    assert.match(body.error, /Database persistence failed/i);
    assert.equal(body.token, undefined, 'Must not issue a JWT token on failed database write');

    // Store must NOT have cached this user
    store._clearUsersCacheForTesting();
    const stored = await store.findUserByEmail(email);
    assert.equal(stored, null, 'Failed user must not exist');
  } finally {
    setSupabase(originalClient);
  }
});

