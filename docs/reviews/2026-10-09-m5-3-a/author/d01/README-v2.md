# A D01 v2：幂等副作用oracle

保原freeze/README/三轮receipt及审核超时事实。根准仅recovery脚本+示例窄修，worker不变。第四轮真实1997ms passed、9children清退/tmp删，smoke20/Linux未运行。

停C/服务器后只读事务取一致before；同origin新PID重放await后无在途业务，独立只读事务取after。对该空间全部post/revision/relations/events及post.create family幂等记录精确比对象与key集合（非只PK count）。不包含sessions/consumers/batches，因此poll允许恢复内部状态不产生噪声；此短读非全库/秘密dump。result_ref只存SHA，无正文/token。实际分母：{"posts": 4, "revisions": 4, "events": 9, "idempotency": 4, "relations": 2}。并单核改进1对象、1post.created事件、C1条typed创建幂等记录。返回原ID但偷写重复post/event/idem或relation将失败。

C改进为固定无模型模板；真实搜索/固定读取/来源引用，不是独立语言推理或算法认证。node --check实际0，没有重跑20smoke/build/full/browser/VM。
