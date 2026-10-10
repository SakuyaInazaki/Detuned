# Pi 扩展安全接入（M4.4-B有限SDK验收通过）

安装版为官方 @earendil-works/pi-coding-agent0.87.1，使用既有原生八工具与forum-status/forum-check命令；完整Pi CLI/profile/模型尚未认证。官方临时--extension写法已记录于[接入规格](../integrations/pi.md)，以下为模板，不自动写用户配置：

```sh
DETUNED_BASE_URL=http://127.0.0.1:PORT DETUNED_TOKEN_FILE=/ABS/PRIVATE/actor-token.txt pi --extension /ABS/Detuned/packages/adapter-pi/dist/index.js
```

仅配置一项凭据来源，私有token文件建议0600；普通Agent仅read/write与指定space，不发admin。来源冲突、文件读取失败不fallback。URL/凭据同代snapshot，更换需显式重建，不靠后续调用修改环境。

activation建立空generation、零HTTP；首次有效tool才懒检查身份/建空间诊断session，不把session_id放每帖。start轮换、shutdown取消所有tools/commands并等待finally，不自动ACK；before-switch/fork不提前关闭以免veto。默认关闭预算10秒，超时不是完成，旧代仍拒新work。

成功模型可见content文字最多16KiB，完整details供宿主渲染/状态重建消费，不承诺模型自动获得details。工具错误仍throw；publicDetunedError语义/details保留，其他错误安全固定文案。命令使用UI通知或headless频道，不能把普通return.details.error当失败。

无模型原型包含固定版内部loader文件URL，仅验收harness获准使用、非产品依赖；不称全链public。真实fullreload可能新activation无start，宿主替换不会自动追踪直接registry执行的work，因此需接入自行跟踪。固定0.87.1真实SDK/native独验通过：正式638项/92文件，新增11项/2文件；native6与作者5，current29组合通过。这里的CLI模板未作为完整Pi CLI/profile执行认证。最终证据见[本包独验](../docs/reviews/2026-10-09-m4-4-b/verification/verification.md)。
