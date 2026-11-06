#!/bin/sh
# Install only into the caller's new private prefix. Never edits shell profiles.
set -eu
[ "$#" -eq 1 ] || { echo 'Usage: sh scripts/prepare-tools.sh /ABS/NEW_PREFIX' >&2; exit 2; }
prefix=$1
case "$prefix" in /*) ;; *) echo 'NEW_PREFIX must be absolute.' >&2; exit 2;; esac
case "$prefix" in */../*|*/..|*/./*|*/.) echo 'NEW_PREFIX must not contain dot components.' >&2; exit 2;; esac
[ ! -e "$prefix" ] && [ ! -L "$prefix" ] || { echo 'NEW_PREFIX already exists; use a new directory.' >&2; exit 2; }
for utility in curl tar uname mkdir chmod env sed; do
  command -v "$utility" >/dev/null 2>&1 || { echo "Missing required utility: $utility" >&2; exit 2; }
done
case "$(uname -s)" in Linux) platform=linux;; Darwin) platform=darwin;; *) echo 'Supported: Linux or Darwin.' >&2; exit 2;; esac
case "$(uname -m)" in x86_64|amd64) arch=x64;; aarch64|arm64) arch=arm64;; *) echo 'Supported architecture: x64 or arm64.' >&2; exit 2;; esac
umask 077
mkdir "$prefix"
trap 'status=$?; if [ "$status" -ne 0 ]; then echo "Preparation failed; partial private directory retained: $prefix. Inspect it and retry with a NEW prefix." >&2; fi' 0
mkdir "$prefix/download" "$prefix/tools" "$prefix/cache" "$prefix/home" "$prefix/tmp"
printf '' > "$prefix/user.npmrc"
printf '' > "$prefix/global.npmrc"
printf '%s\n' '{"name":"detuned-private-tools","private":true}' > "$prefix/tools/package.json"
archive="node-v22.19.0-$platform-$arch.tar.gz"
curl -q --fail --show-error --location --connect-timeout 30 --max-time 300 "https://nodejs.org/download/release/v22.19.0/$archive" --output "$prefix/download/$archive"
env -i PATH=/usr/bin:/bin HOME="$prefix/home" TMPDIR="$prefix/tmp" tar -xzf "$prefix/download/$archive" -C "$prefix"
node_dir="$prefix/node-v22.19.0-$platform-$arch"
[ "$(env -i PATH="$node_dir/bin:/usr/bin:/bin" HOME="$prefix/home" TMPDIR="$prefix/tmp" "$node_dir/bin/node" --version)" = v22.19.0 ] || { echo 'Unexpected Node version.' >&2; exit 1; }
# Explicit flags override user/global npm configuration; no global install or Corepack.
(
  cd "$prefix/tools"
  env -i PATH="$node_dir/bin:/usr/bin:/bin" HOME="$prefix/home" TMPDIR="$prefix/tmp" "$node_dir/bin/node" "$node_dir/lib/node_modules/npm/bin/npm-cli.js" install pnpm@11.7.0 \
    --global=false --prefix "$prefix/tools" --ignore-scripts --package-lock=false --no-save --no-audit --no-fund \
    --cache "$prefix/cache" --userconfig "$prefix/user.npmrc" --globalconfig "$prefix/global.npmrc" \
    --registry https://registry.npmjs.org --fetch-retries=0 --fetch-timeout=120000
)
pnpm_cli="$prefix/tools/node_modules/pnpm/bin/pnpm.cjs"
[ "$(env -i PATH="$node_dir/bin:/usr/bin:/bin" HOME="$prefix/home" TMPDIR="$prefix/tmp" "$node_dir/bin/node" "$pnpm_cli" --version)" = 11.7.0 ] || { echo 'Unexpected pnpm version.' >&2; exit 1; }
printf '\nPrepared private Node 22.19.0 and pnpm 11.7.0.\nNode: %s\npnpm entry: %s\n' "$node_dir/bin/node" "$pnpm_cli"
printf 'For this terminal only, prepend these directories to PATH (quote paths):\n%s\n%s\n' "$prefix/tools/node_modules/.bin" "$node_dir/bin"
# Shell-safe executable commands, including prefixes containing spaces or quotes.
quote() { printf "'"; printf '%s' "$1" | sed "s/'/'\\\\''/g"; printf "'"; }
printf 'Exact version command: '
quote "$node_dir/bin/node"; printf ' '; quote "$pnpm_cli"; printf ' --version\n'
