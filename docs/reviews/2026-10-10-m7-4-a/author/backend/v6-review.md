# V6 owned HTTP lifecycle delta

Only new checks function and its appended TS case changed, including root-approved safe count assertions. Old fixture branch and TS prefix, all matrix assertions, onRequest entry/controller abort, 60s total / 2s cleanup / 70s child / 80s case remain unchanged. A ran no checks. First failures and v1–v5 remain archived.

Before listen, the fixture tracks only its own server connection sockets and actual close promises. After SDK disposal, app cleanup starts existing detunedBeginDraining, waits existing RuntimeResources.waitForIdle and asserts zero active leases. Then it captures the actual remaining connection count (including legal zero), destroys only those owned sockets and awaits all actual closes, asserts the owned set empty, and awaits original app.close. app_closed is assigned only if that entire operation resolves inside the original bound; losing a race stays failure. Other cleanup attempts remain independent; parent waits child actual close before exact-root removal/ENOENT check.

Successful white-listed evidence includes transport active_before_drain/active_after_drain, connections_before_close/connections_after_close and accepted/closed counts. Stage history distinguishes business-drain and socket-close from app-actual-close. No value is a hardcoded socket cause or an assertion that a specific connection was responsible for earlier failures. A lease wait failure cannot be converted into success by socket destruction; the socket step is after that wait. No global dispatcher/process/host closure or product Fastify/CLI change.

Runtime verification remains solely D; final successful close has not yet been demonstrated.

Root supplemental approval permits checks-only TS capture of finite nonnegative integer active_count/connections per bounded stage history. Added assertions require actual business active_after_drain=0, actual connections_after_close=0 and accepted=closed connection counts; zero accepted connections remains legitimate. Claude module stays byte unchanged.
