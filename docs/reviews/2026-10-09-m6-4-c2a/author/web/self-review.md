# B source self-review — M6.4-C.2A

Completed source: new findings navigation/getView integration with existing generation, abort, shared run and pending controls; space/logout clear findings; fixed reader retains originating view and explicit current-entry vs fixed review-target actions. Findings UI and guard retain 25 bound; failures retain 50.

Both parsers delegate entire arrays to canonical protocol guards with requested space binding. They preserve raw material, relations, explicit null/missing fields and safe formal summary without defaulting or deriving service business facts. Malformed rows reject the entire view. Cards show author_report, original field values, public relation identities/authors/state and fixed refs, latest round, fixed target_revision, phase/check/current_validity and reasons. No-round labels distinguish disabled from not requested. Pending/not_required do not claim passed. Accepted is labeled historical and accompanied by fixed-material caveat. Failure dependency approval is not assigned to failure. Existing fixed reader/C1 panel is reused; review-panel.tsx unchanged. SafeMarkdown handles summaries; structured text/refs render as React plain text. New responsive CSS wraps identifiers/actions and stacks facts at narrow widths.

Added four pure untrusted-input tests: preservation; old fixed target with current revision and pending/superseded facts; whole-array malformed/unknown/limit rejection; inconsistent and cross-scope summaries. They are not SQLite/ACL evidence.

Static source inspection only. Build/type/lint/tests/browser not run by B, per sole D window. Runtime/accessibility/390px and real HTTP/SQLite acceptance remain pending. source.diff uses C2A exact-before copies and includes the new test. freeze.json records actual final source SHA256; B stops writing pending A cross-review.

D compatibility feedback incorporated before cross-review: failure keeps existing 查看报告修订 N action, with adjacent explicit current-report wording. Findings retain new current-entry wording. No old browser assertion changed.
