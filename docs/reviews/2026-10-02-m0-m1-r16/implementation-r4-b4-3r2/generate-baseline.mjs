import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';

const repoRoot = path.resolve(import.meta.dirname, '../../../../');
const r16BaselinePath = path.resolve(import.meta.dirname, '../baseline.json');
const targetFileName = process.argv[2] || 'baseline-before.json';
const targetPath = path.resolve(import.meta.dirname, targetFileName);

const r16Baseline = JSON.parse(readFileSync(r16BaselinePath, 'utf8'));

const gitStatus = execSync('git status --porcelain', { cwd: repoRoot, encoding: 'utf8' });
const diff = execSync('git diff HEAD', { cwd: repoRoot, maxBuffer: 32 * 1024 * 1024 });
const diffSha256 = createHash('sha256').update(diff).digest('hex');

const fileHashes = {};
let mismatchCount = 0;
for (const relPath of Object.keys(r16Baseline.product_and_test_file_hashes)) {
  const fullPath = path.join(repoRoot, relPath);
  try {
    const content = readFileSync(fullPath);
    const hash = createHash('sha256').update(content).digest('hex');
    fileHashes[relPath] = hash;
    if (hash !== r16Baseline.product_and_test_file_hashes[relPath]) {
      console.log(`Mismatch on ${relPath}: current=${hash} vs baseline=${r16Baseline.product_and_test_file_hashes[relPath]}`);
      mismatchCount++;
    }
  } catch (err) {
    fileHashes[relPath] = `MISSING: ${err.message}`;
    console.log(`Missing file: ${relPath}`);
    mismatchCount++;
  }
}

// Check if any additional files are provided as arguments or to be tracked
const extraFiles = process.argv.slice(3);
for (const relPath of extraFiles) {
  const fullPath = path.join(repoRoot, relPath);
  try {
    const content = readFileSync(fullPath);
    fileHashes[relPath] = createHash('sha256').update(content).digest('hex');
  } catch (err) {
    fileHashes[relPath] = `MISSING: ${err.message}`;
  }
}

const baselineData = {
  captured_at: new Date().toISOString(),
  reviewed_date: '2026-10-02',
  task: 'M0/M1-R4-B.4-3R2',
  head: r16Baseline.head,
  worktree_was_dirty: gitStatus.trim().length > 0,
  git_status: gitStatus,
  tracked_diff_sha256: diffSha256,
  product_and_test_file_hashes: fileHashes,
  archive_sha256: r16Baseline.archive_sha256
};

writeFileSync(targetPath, JSON.stringify(baselineData, null, 2) + '\n', 'utf8');
console.log(`Generated ${targetFileName} successfully. Mismatches with R16 baseline: ${mismatchCount}`);
