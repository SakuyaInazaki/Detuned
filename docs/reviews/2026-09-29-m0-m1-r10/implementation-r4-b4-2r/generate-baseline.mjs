import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';

const repoRoot = path.resolve(import.meta.dirname, '../../../../');
const beforeJsonPath = path.resolve(import.meta.dirname, 'baseline-before.json');
const afterJsonPath = path.resolve(import.meta.dirname, 'baseline-after.json');

const beforeData = JSON.parse(readFileSync(beforeJsonPath, 'utf8'));

const gitStatus = execSync('git status --porcelain', { cwd: repoRoot, encoding: 'utf8' });
const diff = execSync('git diff HEAD', { cwd: repoRoot, maxBuffer: 32 * 1024 * 1024 });
const diffSha256 = createHash('sha256').update(diff).digest('hex');

const fileHashes = {};
for (const relPath of Object.keys(beforeData.product_and_test_file_hashes)) {
  const fullPath = path.join(repoRoot, relPath);
  try {
    const content = readFileSync(fullPath);
    fileHashes[relPath] = createHash('sha256').update(content).digest('hex');
  } catch (err) {
    fileHashes[relPath] = `MISSING: ${err.message}`;
  }
}

const afterData = {
  reviewed_date: '2026-09-30',
  task: 'M0/M1-R4-B.4-2R',
  head: beforeData.head,
  worktree_was_dirty: gitStatus.trim().length > 0,
  final_status: gitStatus,
  tracked_diff_sha256: diffSha256,
  product_and_test_file_hashes: fileHashes
};

writeFileSync(afterJsonPath, JSON.stringify(afterData, null, 2) + '\n', 'utf8');
console.log('Generated baseline-after.json successfully. Diff SHA256:', diffSha256);
