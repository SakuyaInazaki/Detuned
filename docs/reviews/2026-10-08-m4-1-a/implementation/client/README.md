# A 薄client接口记录

源码仅client.ts增加getLiveness/getReadiness，protocol operations.ts增加两type从现EnvelopeSchema Static['data']提取，schema/runtime不变，index现wildcard自然导出无需改。同既有request处理base/API前缀、token可空、错误/取消/重试与data/meta；未新增匿名选项或受保护路径放宽。健康ready503不转换false。

新增前已有diagnostics/me/capabilities、list/search/view，无两个health wrapper；记录能力缺口而不运行missing import红测试。父明确两薄wrapper不写镜像测试，新正式B/C真实HTTP+CLI独验。未build/fullsuite或B2重测。

freeze-manifest固定3文件，A源码已停写。B6files明确冻结后 source noEmit只当前protocol/client一次exit0，stdout/stderr空；没有tests/build/fullsuite。B互审见cli-cross-review.md：CLI无产品finding，仅guide通用列表段落不宜暗称所有cursor签名的精度建议。最终接受由C/父决定。
