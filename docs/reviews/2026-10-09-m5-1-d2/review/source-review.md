# D.2 独立有限源码审阅

结论：在根指定的四项控制流范围内，未发现可行动的契约阻断。只读fresh before与B四冻结文件差分及实际调用处；没有运行测试、修改产品、审查全仓或据源码宣称浏览器下载成功。B仍是产品owner，真实Chrome结果由D提供。

- **上传/帖子意图**：app.tsx:435–447捕获不可变File、独立key和space，未知结果保uploadIntent；:518–525锁文件替换、显式同intent重试，放弃明确提示可能已提交且不删除材料。上传成功清File/intent，仅保metadata。:449–464构建一次body含已选artifact_ids与固定cites，重试沿原operation body/key/space/thread；fieldset、上传及移除按钮在post intent期间锁住，不从变更后的UI重造同key payload。真正关联仍createPost成功，不把上传称绑定。
- **跨代隔离**：app.tsx:130–146清目录/比较/上传并递增generation、abort旧controller；:207–224注销先封业务；空间/帖子选择:226–261同样旋转。目录/比较/上传在await后核generation，下载:420–432在任何DOM/BlobURL动作前同时核generation与signal；旧返回不能触发下载。readForComparison:393–402每页后检查abort，取消后不继续下一版本读取。未改变服务端授权或制造ACK。
- **完整固定对比**：app.tsx:404–417捕获同post两个明确safeinteger版本；appendContent(content.ts:23–44)核精确ref/UTF8offset/complete与1MiB累计。compareDocuments(:50–83)仅两份完整、非raw、有document且同post才执行；深度64、节点20000、每份序列化输出1MiB，失败返回null。UI(revision-evidence.tsx:25–27)只有非null comparison才展示完整/相同；app.tsx:417明确未完成/预算失败并允许固定版本分段读。此为五字段值对比，不是行diff/语义等价；对象键确定排序、数组序保留，没有O(n*m)文本diff。
- **下载资源**：app.tsx:425–431复用sharedclient完整校验后才创建octet-stream BlobURL，显式点击download链接，finally移除临时link并revokeURL；UI只允许ready且当前client25MiB范围，missing/redacted不给下载按钮，任意content_url未使用。实际浏览器是否接收即时revoke后的下载文件和真实URL清退属于D动态验证，不用静态读替代。

styles.css新增仅目录/字段对比/附件布局及窄屏列变化，无HTML执行、外链或业务逻辑。fresh before中的既有appendContent和认证调用未被重写；本审阅只覆盖上述增量与必要相邻生命周期，不证明任意非合作浏览器/外部插件资源行为。
