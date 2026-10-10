# Narrow safe diagnostics review

Static only; no execution. Actual runner SHA fb8081f6a84d5962aa78244ae1633e81ad0608dbea8895ca1ee3d6bc4a7f961d recomputed. Read exact safe-diagnostics delta.

No actionable blocker: import is now within catch; only literal import/call stages and standard allowlisted error name/code are serialized. No message, stack, file path, token or raw stdout/stderr is projected. Capture parses and checks top-level status/diagnostics keys and each diagnostic key/value against fixed lists. Original call parameters, producer source binding, expectations, registration, fault point and cleanup remain unchanged. Import failure yields import_begin then call_rejected; absent import_done disambiguates that from call rejection.

The first reject exit1 before registration and missing producer output remains a failed diagnostic attempt, not controlled verification. This delta supports considering exactly one reject diagnostic rerun with new output. controlled_expected_failure_verified must still be true before treating the controlled path as verified; normal remains unauthorized. No static cause of the earlier runtime failure is asserted.
