import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../../../../');
const r17BaselinePath = path.resolve(__dirname, '../baseline.json');

const r17Baseline = JSON.parse(readFileSync(r17BaselinePath, 'utf8'));
const files = Object.keys(r17Baseline.product_and_test_file_hashes);
if (!files.includes('packages/storage-sqlite/scripts/extract-schema-requirements.mjs')) {
  files.push('packages/storage-sqlite/scripts/extract-schema-requirements.mjs');
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
    if (hash !== r17Baseline.product_and_test_file_hashes[relPath]) {
      console.log(`Mismatch on ${relPath}: current=${hash} vs baseline=${r17Baseline.product_and_test_file_hashes[relPath]}`);
      mismatches++;
    }
  } catch (e) {
    console.log(`Missing file ${relPath}: ${e.message}`);
    mismatches++;
  }
}

const outputFile = process.argv[2] || 'baseline-before.json';
const outPath = path.resolve(__dirname, outputFile);
writeFileSync(outPath, JSON.stringify({
  captured_at: new Date().toISOString(),
  target: outputFile,
  mismatches_against_r17_baseline: mismatches,
  file_count: files.length,
  product_and_test_file_hashes: currentHashes
}, null, 2));

console.log(`Generated ${outputFile} successfully. Mismatches with R17 baseline: ${mismatches}`);
