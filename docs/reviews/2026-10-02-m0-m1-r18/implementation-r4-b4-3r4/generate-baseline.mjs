import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../../../../');
const r18BaselinePath = path.resolve(__dirname, '../baseline.json');

const r18Baseline = JSON.parse(readFileSync(r18BaselinePath, 'utf8'));
const files = Object.keys(r18Baseline.product_and_test_file_hashes);

// Include any new product/test files created in this round
const additionalFiles = [
  'packages/storage-sqlite/tests/schema-generation.test.ts'
];

for (const f of additionalFiles) {
  if (!files.includes(f)) {
    files.push(f);
  }
}
files.sort();

const currentHashes = {};
let mismatches = 0;

for (const relPath of files) {
  const absPath = path.join(root, relPath);
  try {
    const content = readFileSync(absPath);
    const hash = createHash('sha256').update(content).digest('hex');
    currentHashes[relPath] = hash;
    const expected = r18Baseline.product_and_test_file_hashes[relPath];
    if (expected && hash !== expected) {
      console.log(`Mismatch on ${relPath}: current=${hash} vs baseline=${expected}`);
      mismatches++;
    } else if (!expected) {
      console.log(`New tracked file: ${relPath} (${hash})`);
      mismatches++;
    }
  } catch (e) {
    if (r18Baseline.product_and_test_file_hashes[relPath]) {
      console.log(`Missing file ${relPath}: ${e.message}`);
      mismatches++;
    }
  }
}

const outputFile = process.argv[2] || 'baseline-before.json';
const outPath = path.resolve(__dirname, outputFile);
writeFileSync(outPath, JSON.stringify({
  captured_at: new Date().toISOString(),
  target: outputFile,
  mismatches_against_r18_baseline: mismatches,
  file_count: Object.keys(currentHashes).length,
  product_and_test_file_hashes: currentHashes
}, null, 2));

console.log(`Generated ${outputFile} successfully. File count: ${Object.keys(currentHashes).length}. Mismatches with R18 baseline: ${mismatches}`);
