# A v6 fixture-only close delta review

2026-10-10, B static read/hash only; no checks or source edits. Actual freeze-v6 SHA `6e4d7fb4fe1c7c1ca2aeaa2061448705e71ffcbe13846174d703d5b55d9d9100`, delta SHA `7f91481f02fe6e3ac77d23bac6477b0e15486e9adcebd48e443a7856e44e670a`. All actual three hashes/bytes match: fixture26581 /`f6940dbbb106007dd60d78d4b1261f9568764b3b487607f5fa9cf8ae94b036d9`; TS6802 /`3a030a9796dc13e89b395826de39395a01d1eff4601ba0d1e0ffef39f0afb9ee`; unchanged Claude20674 /`67b5f357b115a191f53a01f494bb4e73f970e87e9b2a20cb50b68e359e77bfd1`. Original six fixture body and original TS prefix compare byte-exact.

## One actionable failure-path conflict

The existing stage helper throws CHECKS_DEADLINE after budget abort for every label not containing `cleanup`, except `catch`. V6's new app cleanup action starts with `stage('business-drain-begin')` and later uses `business-drain-done`, `socket-close-begin/done`, `app-actual-close`: none is a cleanup label under that rule. Body catch explicitly aborts the budget. Thus on any body failure/60s timeout the first new diagnostic stage throws **before** detunedBeginDraining, waitForIdle, own socket destruction or app.close. Outer attempt records failure, but does not attempt those releases. This is a direct static counterexample, not a newly observed runtime failure.

Narrow recommendation sent root: classify these trusted observation labels as cleanup (rename them consistently with new TS assertions, or supply explicit trusted cleanup phase to stage). Retain business continuation abort checks, actual idle/close requirements,2000ms cleanup bounds and failure exit; do not simply remove abort checking globally. Await root/owner repair before declaring v6 clear.

## Otherwise retained and coherent

- Connection listener is attached to this app's actual server before listen, tracks only accepted owned socket objects and resolves actual socket close events; counts/IPC are bounded nonnegative safe integers, no addresses or secrets.
- Normal-path order is SDK dispose, existing detunedBeginDraining, actual waitForIdle and activeCount0 assertion, destroy currently owned accepted sockets and await all their close promises, assert no owned sockets, then actual app.close. No resource counter is forged or public product close behavior changed. Nonzero idle or unclosed socket cannot be marked successful.
- The complete new action remains inside original2000ms independent attempt; only completion marks app_closed. The parent still awaits actual child close before removing its0700root and preserves70s/80s budgets, old onRequest/abort/filter and all business assertions. New assertions require zero resource/connection state and accepted=closed, without claiming the old unresolved socket's specific cause.
- Late new connections would make ownedSockets.size nonzero and fail rather than pass; timeout remains failure. Promise races still do not prove underlying operations cancelled. No new native/guard/source-template behavior appears.

Current disposition: one source-level cleanup-phase blocker pending root-scoped repair; original runtime failures remain intact and no recovery is claimed.
