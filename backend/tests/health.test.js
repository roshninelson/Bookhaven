import test from 'node:test';
import assert from 'node:assert/strict';
import { demoBooks, listBooks } from '../src/lib/books.js';

test('demo catalog has seeded books', () => {
  assert.ok(demoBooks.length >= 6);
  assert.ok(demoBooks.every(book => book.title && book.price > 0));
});
test('catalog search matches title', async () => {
  const results = await listBooks({ q: 'atomic' });
  assert.ok(results.some(book => book.title === 'Atomic Habits'));
});
test('catalog category filter works', async () => {
  const results = await listBooks({ category: 'Finance' });
  assert.ok(results.length > 0);
  assert.ok(results.every(book => book.category === 'Finance'));
});
