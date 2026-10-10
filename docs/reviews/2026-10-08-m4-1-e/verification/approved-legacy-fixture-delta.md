# 父批准的两项test-only兼容适配

BKCLI01只两条parser输入exit1→2，对应E固定parser错误契约；其余输入/断言不变。AB B01 nativechild改为本轮已built同模块artifact-io.js并移除strip-types，避免源码.js依赖未生成引发loaderfail；FIFO、2s watchdog与原所有断言保持。未改产品或锁诊断assert，暂不运行等待B最小typed诊断refreeze。
