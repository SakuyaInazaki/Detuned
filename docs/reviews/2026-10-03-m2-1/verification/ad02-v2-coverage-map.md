# Versioned AD02 compensation mapping

Final R1 independent execution completed: r1-final/observed-ad02-v2.json reports AD5/5, exit0 in r1-final/independent-commands.json. check-c-completion-v2.mjs derives from the immutable R21 check-c-completion.mjs into this new directory; import paths change only for directory depth. Original file/observed output stays untouched. Original run remains28/29, AD4/5 with AD02 TypeError; never relabel it29/29.

| Original intent | Versioned assertion / independent evidence |
|---|---|
| AD02 four space body examples: missing required, wrong type, unknown field, valid | Original exact cases and spec/protocol/AJV/HTTP agreement retained, with coerceTypes:false/removeAdditional:false. |
| Operation/body/placeholder counts and captured route count | Original outputs retained; JSON-only placeholder lookup now optional. Full actual normalized method/path set compared to entire OpenAPI, including all three artifact endpoints. |
| JSON request schema accuracy | Every actual route JSON schema compared to corresponding OpenAPI JSON slot; no JSON body and multipart absence treatednull on both sides. No filter removing artifact routes. |
| Path parameter coverage | All normalized route path names compared to declared path parameters for every operation. |
| New multipart schema | Every request content schema compiled; sole nonJSON request must be artifact multipart, requiredfile, binary file, metadata JSONtext string, additionalPropertiesfalse. P01/P02 plus metadata4KiB raw HTTP cases validate actual parser behavior; formal HTTP suite supplies order/unknown/duplicate/size cases. |
| New response content media schemas | Compile every declared response schema; octet-stream binary slot constrained to content route. P02 real download asserts bytes/attachment/nosniff; public metadata projection tested by real response and protocol schema/formal tests. |
| AD01/03/04/05 controls/errors/cleanup | Their original code retained unchanged; original four successes remain historical evidence. New run reports them separately with real results. |

Binary format compiler acceptance describes schema structure, not automatic multipart or bytes enforcement. Independent real transport cases supply that evidence. Metadata text/plain and application/json >4096 must now both yield400 per parentR1decision; r1-final/observed-metadata-encoding.json confirms both content types at4096bytes→201 and4097bytes→400. Six finite realFS/SQLite/HTTP groups passed6/6 in r1-final/observed-real-adversaries.json.

Final limitation: AJV emitted six ignored date-time format warnings during structural compilation, preserved in r1-final/observed-ad02-v2.stderr.txt. This check does not claim datetime value-format validation. Parent accepted M2.1 local engineering verification; final conclusion is r1-final/verification.md. Original commands remain28/29, with original AD02 TypeError retained.
