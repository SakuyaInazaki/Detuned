# V8 canonical native-owned root

D guard-first failed with owned sentinel allowed while allowed network succeeded and forbidden network was EPERM. Claude was not launched; original guard receipt and successful cleanup are preserved.

Exact source defect: runClaudeCheckProbe previously used mkdtemp(tmpdir()) spelling directly for sandbox literal/subpath rules, cwd, sentinel and files. The temporary parent may be an OS alias (/tmp or /var versus its /private realpath). A sandbox literal must agree with the kernel canonical file identity; uncanonicalized spelling is unsafe as an isolation rule. This is a source-level alias mismatch risk, not a runtime claim that a particular alias was measured as the sole cause of the first failure.

Only native entry now realpaths its freshly created root once, lstat-validates an actual non-symlink directory, 0700 and current uid, then uses that canonical constant for every existing derived path. Validation failure removes only the newly created root and rethrows the original error. Policy text/strength, guard expectations, binary preflight, shared fixtures/matrix/input writer and Pi two files stay unchanged. No user state/global settings are read or edited. No A runtime; fixed guard must be independently rerun by D under root release before native launch.
