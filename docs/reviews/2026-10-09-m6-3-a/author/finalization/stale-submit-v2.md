# DF03窄修

D真实PostService修订使head stale/version2后，合格reviewer、新绑定session/strict payload/newkey原返回VALIDATION_ERROR400；首次失败证据保留。根准在原fresh action phase guard前仅增stale→SNAPSHOT_STALE409。当前ACL/privacy/资格先行、历史samekey优先、其它terminal400与assignment唯一性原样。

v1保留，v2共17files；作者未运行任何检查，等待D DF03回归。
