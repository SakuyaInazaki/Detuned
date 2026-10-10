# Unit B dual-layer protocol read-only review

Reviewed frozen posts.ts/newwrite map+parse, tools.ts and openapi.ts against UnitBdelivery. No productcheck/build executed.

No blocking finite-scope finding:

- Original wire/read StructuredContent union retains its record fallback; strictnewaction map is separate and parse only Value.Check then returns originalobject, no trim/default/clone/mutation. Existingfieldbounds/arrayelements reused.
- Proposal/claim nonblankpattern mirrors priortrim-check while originaltext remains. Failure evidence_state staysrequired; providedmin1 and unverifiednonblankreason discriminated branches; additionalPropertiesfalse on typedobjects/refs.
- OpenAPI four explicit strictcomponents and three x-new-write-policy mappings state newactiononly; revision kindsource is persistedpost.kind. ActualrequestBody unchanged, preserving compatibility and honest schema scope rather than claiming broadwire enforces strictnewactions.
- forum_publish describes identicalpolicy without adding client/domainauthorization or duplicating ruleimplementation. Otherkind schemas unchanged.

Structural/static protocol tests do not prove historicalHTTPreplay or transactionalreference permission. Capturedoldfixture and preparedcheck-historical-http plus freshtyped/refprobe will independently execute after corefreeze.
