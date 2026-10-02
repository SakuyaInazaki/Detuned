import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';

const repoRoot = path.resolve(import.meta.dirname, '../../../../');
const r15BaselinePath = path.resolve(import.meta.dirname, '../baseline.json');
const targetFileName = process.argv[2] || 'baseline-before.json';
const targetPath = path.resolve(import.meta.dirname, targetFileName);

const r15Baseline = JSON.parse(readFileSync(r15BaselinePath, 'utf8'));

const gitStatus = execSync('git status --porcelain', { cwd: repoRoot, encoding: 'utf8' });
const diff = execSync('git diff HEAD', { cwd: repoRoot, maxBuffer: 32 * 1024 * 1024 });
const diffSha256 = createHash('sha256').update(diff).digest('hex');

const fileHashes = {};
let mismatchCount = 0;
for (const relPath of Object.keys(r15Baseline.product_and_test_file_hashes)) {
  const fullPath = path.join(repoRoot, relPath);
  try {
    const content = readFileSync(fullPath);
    const hash = createHash('sha256').update(content).digest('hex');
    fileHashes[relPath] = hash;
    if (hash !== r15Baseline.product_and_test_file_hashes[relPath]) {
      console.log(`Mismatch on ${relPath}: current=${hash} vs baseline=${r15Baseline.product_and_test_file_hashes[relPath]}`);
      mismatchCount++;
    }
  } catch (err) {
    fileHashes[relPath] = `MISSING: ${err.message}`;
    console.log(`Missing file: ${relPath}`);
    mismatchCount++;
  }
}

const baselineData = {
  reviewed_date: '2026-10-02',
  task: 'M0/M1-R4-B.4-3R',
  head: r15Baseline.head,
  worktree_was_dirty: gitStatus.trim().length > 0,
  git_status: gitStatus,
  tracked_diff_sha256: diffSha256,
  product_and_test_file_hashes: fileHashes
};

writeFileSync(targetPath, JSON.stringify(baselineData, null, 2) + '\n', 'utf8');
console.log(`Generated ${targetFileName} successfully. Mismatches with R15 baseline: ${mismatchCount}`);
