#!/bin/sh
cd /private/tmp/detuned-m43-runtime.MU1a4q || exit 1
exec /usr/bin/env -i PATH=/opt/homebrew/bin:/usr/bin:/bin DETUNED_EXPERIMENT_REPO=/Users/sakimi/Desktop/Detuned DETUNED_EXPERIMENT_SOURCE=/private/tmp/detuned-m43-runtime.MU1a4q CI=true /opt/homebrew/bin/node /private/tmp/detuned-m43-runtime.MU1a4q/node_modules/vitest/vitest.mjs run --config /private/tmp/detuned-m43-runtime.MU1a4q/.detuned-m43/independent.config.ts
