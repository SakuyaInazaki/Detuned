// Preparation only: no installation, build, host execution, or network.
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { execFileSync } = require('node:child_process');
const args = process.argv.slice(2);
function argument(name) { const i = args.indexOf(name); if (i < 0 || !args[i + 1]) throw Error('Explicit source and repo required'); return fs.realpathSync(args[i + 1]); }
const source = argument('--source'), repo = argument('--repo');
if (!fs.statSync(source).isDirectory() || !fs.statSync(repo).isDirectory()) throw Error('Directories required');
const gitEnv = { PATH: '/usr/bin:/bin', GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null', GIT_TERMINAL_PROMPT: '0', GIT_CONFIG_COUNT: '1', GIT_CONFIG_KEY_0: 'credential.helper', GIT_CONFIG_VALUE_0: '' };
const head = execFileSync('/usr/bin/git', ['-C', source, 'rev-parse', 'HEAD'], { env: gitEnv, encoding: 'utf8' }).trim();
if (head !== '5badb15009ae1756c3afe0ae0cef1faafc290ccc') throw Error('Official source revision mismatch');
if (!fs.existsSync(path.join(repo, 'scripts/integrations/dsh-runtime/launch.mjs'))) throw Error('Detuned launcher required');
const ts = require(path.join(source, 'node_modules/typescript'));
const targets = ['vendor/loader', 'packages/boot/hmr', 'packages/core/tools', 'packages/core/system-prompt', 'packages/core/scope', 'packages/mcp/mcp-client', 'packages/boot/app-boot', 'packages/typert/generator'];
const seen = new Map();
function visit(target) {
  const file = ts.resolveProjectReferencePath({ path: path.resolve(source, target) }); if (seen.has(file)) return;
  const parsed = ts.getParsedCommandLineOfConfigFile(file, {}, { ...ts.sys, onUnRecoverableConfigFileDiagnostic: () => { throw Error('Invalid compiler metadata'); } });
  if (!parsed || parsed.errors.length) throw Error('Invalid compiler metadata');
  const dir = path.dirname(file), pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));
  for (const output of [parsed.options.outDir, parsed.options.tsBuildInfoFile].filter(Boolean)) if (!output.startsWith(source + path.sep)) throw Error('Output outside source');
  seen.set(file, { name: pkg.name, config: path.relative(source, file), dir });
  for (const ref of parsed.projectReferences || []) visit(ts.resolveProjectReferencePath(ref));
}
targets.forEach(visit);
const records = [...seen.values()];
const configs = records.filter(r => !['@deepseek-ai/cordis-plugin-loader', '@deepseek-ai/dsh-app-boot'].includes(r.name)).map(r => ({ name: r.name, entry: [path.join(r.dir, 'lib/types/index.js'), ...(fs.existsSync(path.join(r.dir, 'src/startup.ts')) ? [path.join(r.dir, 'lib/types/startup.js')] : [])], outDir: path.join(r.dir, 'lib'), format: ['esm'], platform: 'node', target: 'es2024', fixedExtension: false, dts: false, clean: false }));
const url = relative => JSON.stringify(pathToFileURL(path.join(source, relative)).href);
const recipe = `import { standardDecoratorPlugin } from ${url('vitest.shared.ts')};\nimport loader from ${url('vendor/loader/tsdown.config.ts')};\nimport appBoot from ${url('packages/boot/app-boot/tsdown.config.ts')};\nconst configs=${JSON.stringify(configs, null, 2)};\nfunction specialized(value,dir,name){return value.map(c=>({...c,name,entry:Array.isArray(c.entry)?c.entry.map(p=>dir+'/'+p):Object.fromEntries(Object.entries(c.entry).map(([k,p])=>[k,dir+'/'+p])),outDir:dir+'/lib'}))}\nexport default [...configs,...specialized(loader,${JSON.stringify(path.join(source, 'vendor/loader'))},'@deepseek-ai/cordis-plugin-loader'),...specialized(appBoot,${JSON.stringify(path.join(source, 'packages/boot/app-boot'))},'@deepseek-ai/dsh-app-boot')].map(c=>({...c,plugins:[standardDecoratorPlugin()]}));\n`;
if (args.includes('--dry-run')) { console.log(JSON.stringify({ preparation_only: true, dry_run: true, source_sha: head, projects: records.length, outputs_within_source: true })); }
else {
  const dir = fs.mkdtempSync(path.join(source, '.detuned-build-recipe.')); const config = path.join(dir, 'bounded-build.config.mjs');
  fs.writeFileSync(config, recipe, { mode: 0o600, flag: 'wx' });
  const commands = { cwd: source, environment_allowlist: ['PATH', 'CI'], compile: [process.execPath, path.join(source, 'node_modules/typescript/bin/tsc'), '-b', ...targets], bundle: [process.execPath, path.join(source, 'node_modules/tsdown/dist/run.mjs'), '--config-loader', 'native', '--config', config], run: [process.execPath, path.join(repo, 'scripts/integrations/dsh-runtime/launch.mjs'), '--source', source, '--repo', repo, '--suite', 'loader'] };
  fs.writeFileSync(path.join(dir, 'commands.json'), JSON.stringify(commands, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
  fs.writeFileSync(path.join(dir, 'closure.json'), JSON.stringify(records, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
  console.log(JSON.stringify({ preparation_only: true, source_sha: head, projects: records.length, recipe_directory: dir }));
}
