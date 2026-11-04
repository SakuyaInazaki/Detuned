import assert from 'node:assert/strict';

// ACK cursors are opaque and renewable. These black-box probes compare the
// frozen delivered batch; the server alone validates cursor authenticity/binding.
export function assertPendingRedelivery(actual, expected) {
  assert.ok(typeof expected.batch_id === 'string' && expected.batch_id.length > 0);
  const {next_cursor: previousCursor, has_more: previousHasMore, ...previous} = expected;
  const {next_cursor: renewedCursor, has_more: renewedHasMore, ...renewed} = actual;
  assert.ok(typeof previousCursor === 'string' && previousCursor.length > 0);
  assert.ok(typeof renewedCursor === 'string' && renewedCursor.length > 0);
  // This is a scan-progress hint, not a frozen batch binding.
  assert.equal(typeof previousHasMore, 'boolean');
  assert.equal(typeof renewedHasMore, 'boolean');
  assert.deepEqual(renewed, previous);
}
