import { readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve, posix } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, it } from 'vitest';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
interface WorkspacePackage {
  name: string;
  directory: string;
  dependencies: Record<string, string>;
  entries: string[];
}
function object(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function strings(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (!object(value)) throw new Error('Unsupported package entry shape');
  return Object.values(value).flatMap(strings);
}
function workspaces(): Map<string, WorkspacePackage> {
  const result = new Map<string, WorkspacePackage>();
  for (const family of ['packages', 'modules']) {
    for (const child of readdirSync(resolve(root, family), { withFileTypes: true })) {
      if (!child.isDirectory()) continue;
      const directory = `${family}/${child.name}`;
      const manifest: unknown = JSON.parse(readFileSync(resolve(root, directory, 'package.json'), 'utf8'));
      if (!object(manifest) || typeof manifest.name !== 'string') throw new Error(`Invalid manifest: ${directory}`);
      const dependencies: Record<string, string> = {};
      if (manifest.dependencies !== undefined) {
        if (!object(manifest.dependencies)) throw new Error(`Invalid dependencies: ${directory}`);
        for (const [name, spec] of Object.entries(manifest.dependencies)) {
          if (typeof spec !== 'string') throw new Error(`Invalid dependency: ${name}`);
          dependencies[name] = spec;
        }
      }
      const entries = ['main', 'bin', 'exports'].flatMap(key => manifest[key] === undefined ? [] : strings(manifest[key]));
      if (result.has(manifest.name)) throw new Error(`Duplicate workspace: ${manifest.name}`);
      result.set(manifest.name, { name: manifest.name, directory, dependencies, entries });
    }
  }
  return result;
}
// This deliberately accepts only the literal COPY syntax used by this recipe.
function checkLayout(recipe: string): string[] {
  const packages = workspaces();
  const stage = recipe.split(/\nFROM [^\n]+ AS runtime\n/);
  if (stage.length !== 2) throw new Error('Expected one runtime stage');
  const copies = new Map<string, string>();
  for (const line of stage[1]!.split('\n')) {
    if (!/^\s*COPY\b/.test(line)) continue;
    const match = /^COPY --from=builder (\/app\/[A-Za-z0-9._/-]+) (\.\/[A-Za-z0-9._/-]+)$/.exec(line);
    if (!match) throw new Error('Unsupported runtime COPY shape');
    const source = posix.normalize(match[1]!);
    const destination = posix.resolve('/app', match[2]!);
    if (copies.has(source)) throw new Error('Duplicate runtime COPY source');
    copies.set(source, destination);
  }
  const failures: string[] = [];
  const visited = new Set<string>();
  function requireCopy(path: string): void {
    if (copies.get(`/app/${path}`) !== `/app/${path}`) failures.push(`missing COPY: ${path}`);
  }
  function visit(name: string): void {
    if (visited.has(name)) return;
    visited.add(name);
    const pkg = packages.get(name);
    if (!pkg) throw new Error(`Unresolved production workspace: ${name}`);
    for (const part of ['package.json', 'node_modules', 'dist']) requireCopy(`${pkg.directory}/${part}`);
    for (const entry of pkg.entries) {
      if (!entry.startsWith('./dist/') || posix.normalize(entry) !== entry.slice(2)) {
        throw new Error(`Unsupported or escaping package entry: ${pkg.name}`);
      }
      // The directory COPY covers every main/bin/export target, including client ./node.
      const target = posix.resolve('/app', pkg.directory, entry);
      if (!target.startsWith(`/app/${pkg.directory}/dist/`)) throw new Error('Entry escaped package dist');
    }
    for (const [dependency, spec] of Object.entries(pkg.dependencies)) {
      if (!spec.startsWith('workspace:')) continue;
      if (spec !== 'workspace:*') throw new Error('Unsupported workspace dependency spec');
      const target = packages.get(dependency);
      if (!target) throw new Error(`Unresolved production workspace: ${dependency}`);
      // Preserve the relative workspace-link geometry without requiring host node_modules.
      const linkParent = posix.dirname(`/app/${pkg.directory}/node_modules/${dependency}`);
      const relativeTarget = posix.relative(linkParent, `/app/${target.directory}`);
      if (posix.resolve(linkParent, relativeTarget) !== `/app/${target.directory}`) throw new Error('Workspace link escaped layout');
      visit(dependency);
    }
  }
  requireCopy('node_modules');
  visit('@detuned/cli');
  return failures.sort();
}

it('DL01: runtime COPY preserves the recursive CLI production workspace and export closure', () => {
  expect(checkLayout(readFileSync(resolve(root, 'Dockerfile'), 'utf8'))).toEqual([]);
});
it('DL02: the same checker detects omission of all three review module runtime copies', () => {
  const recipe = readFileSync(resolve(root, 'Dockerfile'), 'utf8');
  const omitted = recipe.replace(/^COPY --from=builder \/app\/modules\/review\/(?:package\.json|node_modules|dist) \.\/modules\/review\/(?:package\.json|node_modules|dist)\n/gm, '');
  expect(omitted).not.toBe(recipe);
  expect(checkLayout(omitted)).toEqual([
    'missing COPY: modules/review/dist',
    'missing COPY: modules/review/node_modules',
    'missing COPY: modules/review/package.json',
  ]);
});
