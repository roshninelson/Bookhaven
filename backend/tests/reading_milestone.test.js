import test from 'node:test';
import assert from 'node:assert/strict';
import { store } from '../src/lib/store.js';

test('reading milestone: purchasing adds to shelf without increasing books completed', () => {
  const userId = 'reader-milestone-user-1';
  const currentYear = new Date().getFullYear();

  // Initial milestone: 0 books read
  let milestone = store.getReadingMilestone(userId, currentYear);
  assert.equal(milestone.completed, 0);

  // User purchases book b14
  store.addToReadingList(userId, 'b14');
  const list = store.getReadingList(userId);
  assert.ok(list.some(i => i.bookId === 'b14'));

  // Milestone must remain 0! Purchasing must never automatically increase milestone.
  milestone = store.getReadingMilestone(userId, currentYear);
  assert.equal(milestone.completed, 0, 'Purchasing a book must never increase the completed count');
});

test('reading milestone: marking as completed increments count and records completion timestamp', () => {
  const userId = 'reader-milestone-user-2';
  const currentYear = new Date().getFullYear();

  store.addToReadingList(userId, 'b15');
  store.addToReadingList(userId, 'b16');

  // Mark b15 completed
  const item = store.updateReadingListItem(userId, 'b15', { status: 'completed' });
  assert.ok(item.completed_at, 'Completion timestamp must be set');
  assert.equal(new Date(item.completed_at).getFullYear(), currentYear);

  let milestone = store.getReadingMilestone(userId, currentYear);
  assert.equal(milestone.completed, 1);
  assert.equal(milestone.goal, 24);
  assert.equal(milestone.percent, Math.round((1 / 24) * 100));

  // Marking complete repeatedly must NOT double-count
  store.updateReadingListItem(userId, 'b15', { status: 'completed' });
  milestone = store.getReadingMilestone(userId, currentYear);
  assert.equal(milestone.completed, 1, 'Duplicate completion updates must not double-count');

  // Mark b16 completed -> count becomes 2
  store.updateReadingListItem(userId, 'b16', { status: 'completed' });
  milestone = store.getReadingMilestone(userId, currentYear);
  assert.equal(milestone.completed, 2);
});

test('reading milestone: unmarking completed recalculates count accurately', () => {
  const userId = 'reader-milestone-user-3';
  const currentYear = new Date().getFullYear();

  store.addToReadingList(userId, 'b17');
  store.updateReadingListItem(userId, 'b17', { status: 'completed' });

  let milestone = store.getReadingMilestone(userId, currentYear);
  assert.equal(milestone.completed, 1);

  // Unmark completed (change status to 'reading')
  store.updateReadingListItem(userId, 'b17', { status: 'reading' });
  milestone = store.getReadingMilestone(userId, currentYear);
  assert.equal(milestone.completed, 0, 'Unmarking completion must immediately decrement count');
});

test('reading milestone: goal updating and celebration calculation', () => {
  const userId = 'reader-milestone-user-4';
  const currentYear = new Date().getFullYear();

  // Set goal to 2
  const updated = store.setReadingGoal(userId, currentYear, 2);
  assert.equal(updated.goal, 2);

  store.addToReadingList(userId, 'b18');
  store.addToReadingList(userId, 'b19');
  store.updateReadingListItem(userId, 'b18', { status: 'completed' });
  store.updateReadingListItem(userId, 'b19', { status: 'completed' });

  const milestone = store.getReadingMilestone(userId, currentYear);
  assert.equal(milestone.completed, 2);
  assert.equal(milestone.goal, 2);
  assert.equal(milestone.percent, 100);
  assert.equal(milestone.isGoalReached, true, 'isGoalReached must be true when goal is met');
});
