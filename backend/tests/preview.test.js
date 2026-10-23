import test from 'node:test';
import assert from 'node:assert/strict';
import { getBookPreview, bookPreviews } from '../src/lib/previews.js';
import { listBooks } from '../src/lib/books.js';

test('previews: public domain and sample previews exist with proper pagination', () => {
  // Pride and Prejudice (b21)
  const pnp = getBookPreview('b21');
  assert.equal(pnp.has_preview, true);
  assert.equal(pnp.preview_limit, 6);
  assert.equal(pnp.total_pages, 6);
  assert.equal(pnp.pages.length, 6);
  assert.equal(pnp.pages[0].pageNumber, 1);
  assert.equal(pnp.pages[0].chapter, 'Chapter I');
  assert.ok(pnp.pages[0].text.includes('truth universally acknowledged'));

  // Meditations (b20)
  const med = getBookPreview('b20');
  assert.equal(med.has_preview, true);
  assert.equal(med.preview_limit, 5);
  assert.equal(med.total_pages, 5);
  assert.ok(med.pages[0].text.includes('Verus'));

  // The Hobbit (b9)
  const hobbit = getBookPreview('b9');
  assert.equal(hobbit.has_preview, true);
  assert.ok(hobbit.pages[0].text.includes('In a hole in the ground there lived a hobbit'));
});

test('previews: books without preview return graceful coming-soon state', () => {
  const result = getBookPreview('non-existent-book-id');
  assert.equal(result.has_preview, false);
  assert.equal(result.total_pages, 0);
  assert.equal(result.pages.length, 0);
  assert.ok(result.message.toLowerCase().includes('coming soon'));
});

test('previews: enforce preview limit without exposing complete texts', () => {
  for (const [id, preview] of Object.entries(bookPreviews)) {
    const res = getBookPreview(id);
    assert.ok(res.total_pages <= (preview.preview_limit || 8), `Preview for ${id} must respect preview limit`);
    assert.equal(res.total_pages, res.pages.length);
    for (let i = 0; i < res.pages.length; i++) {
      assert.equal(res.pages[i].pageNumber, i + 1);
      assert.ok(res.pages[i].text && res.pages[i].text.length > 50, 'Page text must be substantial sample');
    }
  }
});
