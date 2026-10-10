# V9 native-only safe diagnostic projection

Original generic native-first failure and guard failures are preserved. The original report did not establish actual native spawn or failure stage. Only runClaudeCheckProbe diagnostic collection/projection changed; shared exports, Pi files, policy template bytes, argv/env, tools/input, budgets/retries/authorization/cleanup flow are unchanged. A ran no checks.

Diagnostics collect at most 64 fixed stage labels; actual own guard allowed/forbidden hit counts and only allowed/EPERM/EACCES guard outcomes; native actual_spawn only from its real child spawn event; actual_close only from the tracked actual close state, with finite integer exit code and allowlisted signal. Initialize/catalogue booleans come from actual responses. Matrix callback emits its existing fixed phases; no raw body is copied. Error name/code use explicit literal allowlists, never arbitrary message/stack/stderr/native response/path. OriginalFailure remains preferred over cleanup error. Each cleanup success phase reflects its existing actual successful operation, never a guessed success. Failure report now retains these collected observations plus cleanup flags; report remains new0600/no-clobber.

No claim that Claude really started or any branch passed is made before D's diagnostic receipt. model_calls existing field is not expanded into an internal audit assertion.
