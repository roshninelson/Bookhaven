import test from 'node:test';
import assert from 'node:assert/strict';
import { listBooks, setSupabaseClient, getSupabaseClient, demoBooks } from '../src/lib/books.js';

test('Supabase: successfully loads books from database when healthy', async () => {
  const originalClient = getSupabaseClient();
  const mockDbBooks = [
    {
      id: 'db1',
      title: 'Database Loaded Title',
      author: 'DB Author',
      category: 'Fiction',
      price: 299,
      old_price: 399,
      rating: 4.9,
      review_count: 100,
      isbn: '978-1111111111',
      cover_url: 'https://example.com/cover.jpg',
      description: 'Loaded from Supabase test DB.',
      stock: 10,
      featured: true,
      is_active: true,
    },
  ];

  try {
    setSupabaseClient({
      from(table) {
        assert.equal(table, 'books');
        return {
          select(columns) {
            return {
              async eq(field, val) {
                assert.equal(field, 'is_active');
                assert.equal(val, true);
                return { data: mockDbBooks, error: null };
              },
            };
          },
        };
      },
    });

    const books = await listBooks();
    assert.equal(books.length, 1);
    assert.equal(books[0].id, 'db1');
    assert.equal(books[0].title, 'Database Loaded Title');
  } finally {
    setSupabaseClient(originalClient);
  }
});

test('Supabase: safely logs error and falls back to 22-book catalogue when database returns error', async () => {
  const originalClient = getSupabaseClient();
  const loggedErrors = [];
  const originalError = console.error;
  console.error = (...args) => {
    loggedErrors.push(args);
  };

  try {
    setSupabaseClient({
      from() {
        return {
          select() {
            return {
              async eq() {
                return {
                  data: null,
                  error: {
                    code: 'PGRST204',
                    message: 'Could not find the "isbn" column of "books" in the schema cache',
                    details: 'Table schema mismatch',
                    hint: 'Run migration to add isbn column',
                  },
                };
              },
            };
          },
        };
      },
    });

    // Must not throw an unhandled error!
    const books = await listBooks();
    assert.equal(books.length, demoBooks.length);
    assert.equal(books.length, 22);
    assert.ok(books.some(b => b.id === 'b1' && b.title === 'Atomic Habits'));
    assert.ok(books.some(b => b.id === 'b21' && b.title === 'Pride and Prejudice'));

    // Check that error was safely logged with details without leaking credentials
    const dbErrorLog = loggedErrors.find(args => args[0] && String(args[0]).includes('[DB Error]'));
    assert.ok(dbErrorLog, 'Should log [DB Error]');
    const payload = dbErrorLog[1];
    assert.equal(payload.code, 'PGRST204');
    assert.equal(payload.message, 'Could not find the "isbn" column of "books" in the schema cache');
    assert.equal(payload.details, 'Table schema mismatch');
  } finally {
    console.error = originalError;
    setSupabaseClient(originalClient);
  }
});

test('Supabase: falls back to 22-book catalogue when database table is empty', async () => {
  const originalClient = getSupabaseClient();
  try {
    setSupabaseClient({
      from() {
        return {
          select() {
            return {
              async eq() {
                return { data: [], error: null };
              },
            };
          },
        };
      },
    });

    const books = await listBooks();
    assert.equal(books.length, 22);
    assert.ok(books.some(b => b.id === 'b1'));
  } finally {
    setSupabaseClient(originalClient);
  }
});

test('Supabase: falls back to 22-book catalogue when network throws an exception', async () => {
  const originalClient = getSupabaseClient();
  try {
    setSupabaseClient({
      from() {
        throw new Error('Network timeout connecting to db.supabase.co');
      },
    });

    const books = await listBooks();
    assert.equal(books.length, 22);
    assert.ok(books.some(b => b.id === 'b1'));
  } finally {
    setSupabaseClient(originalClient);
  }
});
