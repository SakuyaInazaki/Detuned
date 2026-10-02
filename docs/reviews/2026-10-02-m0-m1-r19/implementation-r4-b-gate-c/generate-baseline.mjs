import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../../../../');
const r19BaselinePath = path.resolve(__dirname, '../baseline.json');

const r19Baseline = JSON.parse(readFileSync(r19BaselinePath, 'utf8'));
const files = Object.keys(r19Baseline.product_and_test_file_hashes);

// Additional files if any created in this round
const additionalFiles = [
  'packages/protocol/src/admin.ts',
  'packages/server/src/utils/query.ts',
  'tests/contracts/r4-c-contracts.test.ts',
];

for (const f of additionalFiles) {
  if (!files.includes(f)) {
    files.push(f);
  }
}
files.sort();

const currentHashes = {};
const mismatches = [];

for (const relPath of files) {
  const absPath = path.join(root, relPath);
  try {
    const content = readFileSync(absPath);
    const hash = createHash('sha256').update(content).digest('hex');
    currentHashes[relPath] = hash;
    const expected = r19Baseline.product_and_test_file_hashes[relPath];
    if (expected && hash !== expected) {
      mismatches.push({ file: relPath, expected, current: hash });
      console.log(`Mismatch on ${relPath}: current=${hash} vs baseline=${expected}`);
    } else if (!expected) {
      console.log(`New tracked file: ${relPath} (${hash})`);
      mismatches.push({ file: relPath, expected: null, current: hash });
    }
  } catch (e) {
    if (r19Baseline.product_and_test_file_hashes[relPath]) {
      console.log(`Missing file ${relPath}: ${e.message}`);
      mismatches.push({ file: relPath, expected: r19Baseline.product_and_test_file_hashes[relPath], current: null });
    }
  }
}

const outputFile = process.argv[2] || 'baseline-before.json';
const outPath = path.resolve(__dirname, outputFile);
writeFileSync(outPath, JSON.stringify({
  captured_at: new Date().toISOString(),
  target: outputFile,
  mismatch_count: mismatches.length,
  mismatches,
  file_count: Object.keys(currentHashes).length,
  product_and_test_file_hashes: currentHashes
}, null, 2));

console.log(`Generated ${outputFile} successfully. File count: ${Object.keys(currentHashes).length}. Mismatches with R19 baseline: ${mismatches.length}`);
