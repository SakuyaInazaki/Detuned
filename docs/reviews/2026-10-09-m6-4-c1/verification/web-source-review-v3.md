# B3 narrow status/copy delta follow-up

B3 manifest c6ff753f4eaf277cb29a20b5dac7e287b2fdb579541d2c1e725eac4db606c38a matches all six live hashes; only review-panel.tsx changed from B2, other five unchanged. The existing getReviewStatus response is applied only after original alive(selection) and signal.aborted checks. It updates only the matching request directory row's phase, verification_status, current_validity and validity_reasons; request/snapshot IDs, fixed target revision, round, created_at, cursor and page membership remain unchanged. No HTTP, write-response inference, retry or service rule added.

Product copy now describes pending/not-required checks as distinct from passed, removing internal M7 label. This closes root's actual screenshot finding of old directory phase versus refreshed detail phase; it was not retroactively found by the original source review. No broad rereview, product edit or runtime/check performed. Existing reports and B1/B2 versions preserved.
