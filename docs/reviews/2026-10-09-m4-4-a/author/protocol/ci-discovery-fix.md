# 默认 CI 发现范围窄修

独立首fullsuite的627/627核心tests、90核心files通过，但另外四个外部runtime suite setup失败：docs/reviews下两个independent.spec及scripts/integrations/dsh-runtime/{loader,runtime}.spec.ts。初报漏列后两个，不能把四个都归为review档案。第二full在仅排除reviews后仍627核心tests/90files通过、两个scripts外部suite setup失败；两次都是真正整套失败，原输出由独立验收owner保留，不改写为首轮全绿。

父批准新增B-owned vitest.config.ts，导入公开defaultExclude，先追加docs/reviews/**，再按实际第二次失败精确追加scripts/integrations/dsh-runtime/**。原defaultinclude、默认exclude、aliases与其余设置保持；没有过窄include隐藏未来正式测试。协议guards/index/新合同test三个SHA与v1完全一致，v1/v2manifest原样保留，最终v3含config修正。

外部runtime通过scripts/integrations/dsh-runtime/launch.mjs的专用config及显式source/repo/suite运行；该config独立include、没有继承根config。两处精确exclude不禁止专门命令，未在此次重复运行。该边界防核心CI意外加载依赖私有外部checkout的外部spec。

配置定向tsc --noEmit首次exit0，日志config-noemit.*；v3另存config-v3-noemit.*。B未运行fullsuite/build/current29，必要复验由父批准并交唯一验收owner。next-task上一包共享API事实准确链接保持。产品和测试停写，各manifest包含原3+config共4文件。
