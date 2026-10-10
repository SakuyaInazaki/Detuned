M7.4-B A source freeze

Dockerfile adds only the three review runtime COPY lines. CI removes only the final archived R3 probe step; existing build/type/lint/test:all remain. DL01 recursively follows production workspace:* dependencies from CLI, validates literal runtime COPY identity mappings and package main/bin/export dist containment. Relative workspace link geometry uses preserved package directories, without host node_modules or network. Unsupported COPY/entry/spec shapes fail explicitly. DL02 removes only review triples and runs the same checker. This is static layout coverage, not Linux/image execution or clean-install certification.

No build, typecheck, lint, test, syntax, CLI, Docker or native command was run by A. D owns runtime. No other product paths changed.
