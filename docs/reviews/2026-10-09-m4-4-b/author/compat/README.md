# B C03 compatibility freeze

Only C03 and its local response fixtures changed. Valid Me actor/date/capability/space shape and Session shape support lazy preflight; C03-1 keeps original 8 command/UI/headless combinations and one-request output assertions. C03-4 preserves original malformed business JSON ClientProtocolError and complete409 DetunedError/code/message/details; first tool now4requests (cap/me/session/business), cached next business1. C03-5 original realHTTP/officialvalidator assertions unchanged. No test asserted post-activation env switching, so no such breaking-change claim.

source-first exit1: all4 selected C03 cases blocked in beforeEach loopback listen EPERM, not behavior failures. Explicit authorized loopback run exit0:4passed/22unselected,1.02s. Original logs preserved.

One source-alias noEmit covering the existing whole test file exit2: C03-external Fastify package resolution, VALID_RELATION_TYPES export, old RelationService argument/shape and Node events typing defects; no C03-specific error was reported. These diagnostics are outside the modified C03 lines; the original-file baseline was not reproduced, so they are not proven pre-existing. These out-of-owner sections were not changed. Do not claim the full old fixture typechecked. No build/full/current29 run by B. Formal test now frozen; docs/compat remain pending independent acceptance.
