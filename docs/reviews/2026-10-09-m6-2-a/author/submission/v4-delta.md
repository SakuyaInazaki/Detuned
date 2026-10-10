# A v4：SD10 公共事件隐私

已读D sd10-first.stderr.txt真实首红：普通reader/admin新poll泄private红删1，可信历史误public与pending各泄2，public正对照/ack0成立。原v1/v2/v3/SD10首证据保留。

EventService同一private bool用于新扫描/pending投影：先event同space/public；artifact.created/redacted还须当前artifact存在、同space且静态visibility=space，历史误标public的private事件不返回。其它family、batch ID、through位置及ACK/checkpoint不改变。B负责新redaction写scope。RS07编写public正对照/真实subscription与poll、注入可信历史错误pending列表、ack不自动推进。

只event-service与A新测试变化。A没有运行checks，D唯一窗口复证；这不是已验声明。
