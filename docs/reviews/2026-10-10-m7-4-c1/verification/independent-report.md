# M7.4-C.1 D independent runtime report

Status: root accepted the limited C1 ownership/ACK/cleanup repair after reading actual normal/reject and independent reviews. First normal failed; native tools remain uncertified. Not sealed. No retry or source repair performed.

## Frozen binding and execution

normal-preflight-first.json verifies HEAD b8dacd56779a007a2e7045b682bca0c036fdfc44, lock 364bc51aa18dc6a00935daf3b8ed1c25ffedf728308c01f520705c8b8bffcc88, fixed Codex 0.144.6 binary SHA 80a3933d11a9d13ef806aa24f7bb8afc9169cfe4e9b09d6da6a92922cbde9cff, source 2edd11e6150b92f3e05cec1b87f010b5b5a94aa99a411f07c7b07f93573918e0, new test 81fed70fcbb5d5fa7ecf59138c7e05a819a1985eb7d5d68022024b25a6d96a6f and capture c80d3e26709e4af2a1085d0582c1ab4550cd2129c0b518860cb5fc829868a2d7. Baseline 434 source/config/test entries and 555 dist entries have no unexpected changes. New test is additional to the baseline; no new full suite is claimed. No normal output or receipt was present before execution. d-execution-plan.json retains its earlier capture hash; actual approved binding uses d-source-ready-reject-mcp.json and root release.

Command: `node /Users/sakimi/Desktop/Detuned/docs/reviews/2026-10-10-m7-4-c1/verification/codex-bounded-capture.mjs --output /Users/sakimi/Desktop/Detuned/docs/reviews/2026-10-10-m7-4-c1/verification/codex-native-first-result.json`.

One execution under require_escalated auto_review, preserving the child sandbox. Exit 1; 8.156538248 seconds. Source work 75000ms/total 90000ms and capture absolute 95000ms unchanged. No deadline exceeded. Receipt and stdout/stderr are normal-native-first.*. Producer is codex-native-first-result.json; independent capture is codex-native-first-result.json.capture.json.

## Observed boundary

initialize and thread/start responses arrived. MCP candidate ownership reached six registration stages. Source independently verified same UID, native parent and a direct independent process group; source registered and acknowledged it, confirmed group count 1. Driver and outer capture independently queried ownership and persisted their proof before ACK. This normal run supports the new ownership boundary, not native tools certification.

mcpServerStatus/list ran 40 times; the worker reported AssertionError before catalogue stage. Tools are [], checks are {}; mcpServer/tool/call was not invoked. Exact returned catalogue/error detail is absent from the redacted producer, so an empty catalogue, incomplete catalogue, and host initialization cause are not distinguished by these artifacts. No model/prompt was sent. Do not infer algorithm rejection or certify native check operations.

Producer records flights/children/forbidden/app/db/worker/group closed, candidate and confirmed groups absent, private root removed. Capture independently records actual driver close, ownership tasks settled, registered groups and one exact candidate absent, candidate coverage true, registered roots and control directory absent. Actual driver exit 1 with no signal; stderr empty. No unverified cleanup or retained directory flag. No broad process/tmp scan or prohibited environment operation performed.

## Existing evidence retained

Focused four cases passed (receipt exit 0, 1.618346250 seconds); new source noEmit passed (0, 0.878127833 seconds); source/capture syntax passed. These were read, not rerun by this resumed D. Controlled reject-mcp previously passed expected failure oracle (capture exit 0, 4.310972833 seconds), with source registration/ACK false and independent registered proof persisted; root already examined it. All first artifacts retained.

Historical full 967 tests / 155 files is reuse only; do not add the new four to claim a new full count. Build, full, workspace type/lint/schema/current checks and standalone independent guard were not newly run. The guard inside normal source did execute and passed as producer records; it does not create another standalone guard certification. Prior C old-first candidate ownership/absence uncertainty remains historical and is not overwritten by this C1 owned candidate proof.

## Limitation and next decision

Native tool matrix is unexecuted, Codex tools remain uncertified. A follow-up requires root-selected source/diagnostic scope and fresh authorization; this D does not repair, retry, start another host, seal, or update normal metadata before root decision. No M7 completion claimed.
