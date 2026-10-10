// Finite independent scenarios; execute only after parent freezes implementation.
// The approved-contract harness factory is wired after its public config/ports exist.
// Factory supplies real temp FS/SQLite/HTTP and controlled barriers, not mock outcomes.
import assert from 'node:assert/strict';
import { filePart, metadataPart, end, rawUpload, assertNoStoragePath } from './probe-multipart.mjs';
export async function runIndependentChecks(makeHarness) {
  const results = [];
  async function check(id, run) {
    const start = new Date().toISOString(); let h;
    try { h = await makeHarness(); await run(h); results.push({ id, passes: true, started_at: start, finished_at: new Date().toISOString() }); }
    catch (error) { results.push({ id, passes: false, started_at: start, finished_at: new Date().toISOString(), error: { name: error.name, message: error.message, stack: error.stack } }); }
    finally { if (h) await h.close(); }
  }
  await check('AV-P01-invalid-tail', async h => {
    const before = h.snapshot();
    const r = await rawUpload({ url: h.uploadUrl, token: h.token, key: 'bad-tail', chunks: [filePart('complete bytes'), metadataPart('{"visibility":"review_assignment"}'), end] }).result;
    assert.equal(r.status, 400); assert.deepEqual(h.snapshot(), before); await h.assertNoOwnCandidates();
    const interrupted = rawUpload({ url: h.uploadUrl, token: h.token, key: 'truncated', chunks: [filePart('truncated stream')], pauseAfter: 0 });
    await interrupted.paused; interrupted.abort(); await interrupted.observed; await h.whenUploadsIdle();
    assert.deepEqual(h.snapshot(), before); await h.assertNoOwnCandidates();
  });
  await check('AV-P02-restart-replay', async h => {
    const first = await h.upload('persisted bytes', 'same-key'); assert.equal(first.status, 201); assertNoStoragePath(first.body);
    const before = h.snapshot(); await h.restart();
    const replay = await h.upload('persisted bytes', 'same-key'); assert.equal(replay.status, 201); assertNoStoragePath(replay.body);
    assert.deepEqual(replay.body.data, first.body.data); assert.deepEqual(h.snapshot(), before);
    assert.equal((await h.upload('different bytes', 'same-key')).status, 409); assert.deepEqual(h.snapshot(), before);
    await h.assertNoOwnCandidates();
  });
  await check('AV-P03-quota-and-slots', async h => {
    // Harness config uses small quota; both requests cross a real pre-finalize barrier.
    await h.assertConcurrentQuota(); await h.assertFourAcceptedFifthRejected(); await h.assertFailureReleasesSlot();
  });
  await check('AV-P04-long-upload-revocation', async h => {
    for (const mode of ['credential', 'membership']) {
      await h.resetWriter(); const before = h.snapshot();
      const upload = rawUpload({ url: h.uploadUrl, token: h.writerToken, key: `revoke-${mode}`, chunks: [filePart('pending'), metadataPart('{"visibility":"space"}'), end], pauseAfter: 0 });
      await upload.paused; await h.waitFilePartConsumed(); await h.revokeWriter(mode); upload.resume();
      const r = await upload.result; assert([401, 403].includes(r.status), `revoked ${mode} unexpectedly returned ${r.status}`); h.assertNoArtifactCommitSince(before); await h.assertNoOwnCandidates();
    }
  });
  await check('AV-P05-filesystem-ownership-and-gc', async h => {
    await h.assertNoOverwriteCollisionPreservesExisting(); await h.assertStaticSymlinkDoesNotEscape();
    await h.assertDbFailureOnlyRemovesOwnCandidate(); await h.assertLockedStartupGcPreservesReferenced();
  });
  await check('AV-P06-reference-scope', async h => {
    await h.assertReadyReferencesAcrossThreeWrites();
    await h.assertBadReferencesAtomic(['redacted', 'cross-space', 'duplicate']);
  });
  return results;
}
