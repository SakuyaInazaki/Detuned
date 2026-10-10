# A v3：SD08/SD09 根因收口

已读D sd08-sd09-first.stderr.txt真实首红：readonly/revealed-readonly FORBIDDEN、eligiblefalse/cancel后VALIDATION_ERROR；五stale upload变体误commit，redaction410正反成立。原v1/v2及D首证据保留；未复现hash-newline不改schema。

getOwnAssignment仅读当前ACL、本人固定assignment与在线材料privacy，调用内部assignment fresh=false/operation read；submit默认operation write并保fresh资格。RS06编写readonly/eligiblefalse/cancel读固定身份且写拒绝；RS01补revealed后read-only身份读取。

现有core review-request-records新增assertReviewSnapshotCurrent(storage,{record,manifest}):void，仅复用原submit有限policy/active/current/ready判断。调用方先auth与在线privacy；module submit复用，B仅fresh privateupload最终事务调用；维护/get/replay不调用。helper不返回材料、不JCS/不import模块。

A仅3个文件变化（helper/module/new作者测试），未运行任何检查；D唯一窗口复证。
