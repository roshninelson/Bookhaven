import test from 'node:test';
import assert from 'node:assert/strict';
import { demoBooks, listBooks, getCategories } from '../src/lib/books.js';

test('catalog: exactly 22 unique catalog books', async () => {
  const books = await listBooks();
  assert.equal(books.length, 22, 'Catalog must contain exactly 22 books');

  const uniqueIds = new Set(books.map(b => b.id));
  assert.equal(uniqueIds.size, 22, 'All 22 books must have unique IDs');

  const uniqueIsbns = new Set(books.map(b => b.isbn));
  assert.equal(uniqueIsbns.size, 22, 'All 22 books must have unique ISBNs');
});

test('catalog: includes all 14 requested books with correct metadata', async () => {
  const books = await listBooks();

  const required14 = [
    { title: 'The Hobbit', author: 'J. R. R. Tolkien', category: 'Fantasy' },
    { title: 'Project Hail Mary', author: 'Andy Weir', category: 'Science Fiction' },
    { title: 'The Thursday Murder Club', author: 'Richard Osman', category: 'Mystery' },
    { title: 'The Silent Patient', author: 'Alex Michaelides', category: 'Thriller' },
    { title: 'The Love Hypothesis', author: 'Ali Hazelwood', category: 'Romance' },
    { title: 'The Book Thief', author: 'Markus Zusak', category: 'Historical Fiction' },
    { title: 'Mexican Gothic', author: 'Silvia Moreno-Garcia', category: 'Horror' },
    { title: 'Becoming', author: 'Michelle Obama', category: 'Biography/Memoir' },
    { title: 'The Power of Habit', author: 'Charles Duhigg', category: 'Self-Help' },
    { title: 'The Lean Startup', author: 'Eric Ries', category: 'Business' },
    { title: 'Thinking, Fast and Slow', author: 'Daniel Kahneman', category: 'Psychology' },
    { title: 'Meditations', author: 'Marcus Aurelius', category: 'Philosophy' },
    { title: 'Pride and Prejudice', author: 'Jane Austen', category: 'Classic Literature' },
    { title: 'Into the Wild', author: 'Jon Krakauer', category: 'Travel/Adventure' },
  ];

  for (const req of required14) {
    const found = books.find(b => b.title.toLowerCase() === req.title.toLowerCase());
    assert.ok(found, `Required book "${req.title}" must exist in catalog`);
    assert.equal(found.author, req.author, `Author for "${req.title}" should be "${req.author}"`);
    assert.equal(found.category, req.category, `Category for "${req.title}" should be "${req.category}"`);
    assert.ok(found.price > 0, `Price for "${req.title}" must be positive INR amount`);
    assert.ok(found.description && found.description.length > 20, `Description for "${req.title}" must be accurate`);
    assert.ok(found.cover_url, `Cover URL for "${req.title}" must exist`);
  }
});

test('catalog: search, category filters, and sorting', async () => {
  const searchResults = await listBooks({ q: 'Hail Mary' });
  assert.equal(searchResults.length, 1);
  assert.equal(searchResults[0].title, 'Project Hail Mary');

  const fantasyBooks = await listBooks({ category: 'Fantasy' });
  assert.ok(fantasyBooks.some(b => b.title === 'The Hobbit'));

  const sortedPriceAsc = await listBooks({ sort: 'price-asc' });
  for (let i = 0; i < sortedPriceAsc.length - 1; i++) {
    assert.ok(sortedPriceAsc[i].price <= sortedPriceAsc[i + 1].price);
  }
});
