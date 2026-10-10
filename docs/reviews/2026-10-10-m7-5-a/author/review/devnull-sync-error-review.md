# M7.5-A devnull 同步错误增量审查

结论：controller 054bedcedb597089197fd411c6f1f780d0055e0c4540f3cd87aadfa3c2ae9eff 可接受；outer 36804bd97eb2434494b4eaf505575f573f3cdcb2eeef807e7621425ab571f71e 暂不通过，未释放复跑。

原审查漏掉 spawn 同步抛错；首 JSONDecodeError 和缺少 red PID 收据保留，不能补造。新 controller 同步无 child 时 actualClose=false/code=null/signal=null，red 要求 EPERM 且无 PID；green 仅实际 close 回调可满足 proof/0/null/absence。私有正控与外部 sentinel 拒绝条件保持。

outer 正常路径确在 JSON 解析前 wx 保存 raw 和实际 close/PID/group absence 收据，解析失败另存安全 enum。但 Popen 后 ps timeout、proof assertion 或 STAGE_PROOF_UNKNOWN 在 communicate/receipt 之前抛错，直接进入最终 except，活 driver 未真实 settle 且没有 stage 收据。另无 proof 的 timeout 分支调用 child.terminate/kill，与计划 proof-before-signal 冲突。最窄修复是 stage 异常路径也有有界 settle/receipt，未证明归属时不发 signal，未知保持失败并保留；不得把未关闭写为 actual_close=true。

只读静审；未运行任何 probe、测试或进程查询。原 policy/device/30 秒范围不扩。
