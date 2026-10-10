# C.3-GATE unit A independent read-only review

Reviewed adapter-pi/src/index.ts and tests/contracts/r4-c-contracts.test.ts after unit A stopped product writes. No build or tests executed in this review; execution remains pending stable unit B.

No blocking finding in the requested finite scope:

- adaptToolSchema has precise protocol input and ToolDefinition parameters output types; the local assertion preserves the original schema object and introduces no runtime constraints.
- C03-5 compares every registered tool schema with protocol. Seven valid publish/relate branches pass both AJV and installed Pi validateToolArguments paths; representative missing-required, unknown-op, zero revision/version and unknown-property negatives remain.
- Live publish and live relate both explicitly consume validateToolArguments results before invoking the registered execute callback. Relate response asserts source/target revisions/type/id.
- C03-1 exercises both commands × UI/headless × success/failure, checks exact full messages, info/error severity, exclusive console.log/error channel, endpoint and single call. Failure fixture is controlled HTTP 400, including capabilities.
- C03-4 checks registered callback bad JSON -> ClientProtocolError and conflict -> DetunedError with code/statusCode/retryable/message/details, one call each.
- C02-5 has maxRetries=1, observes completed 503 body and separate backoff timer/listener before abort, asserts one fetch, zero timers/listeners and un-aborted completed attempt signal; globals restored in finally and rejection observed immediately.
- C02-13 interrupted 409 body uses maxRetries=1, asserts DetunedError statusCode=409 retryable=false and only one fetch, preventing accidental transport retry.

C03 merging two prior command tests into one exhaustive matrix reduces this file 27 -> 26 tests without losing the requested matrix. This read-only result applies to unit A, not whole C acceptance.
