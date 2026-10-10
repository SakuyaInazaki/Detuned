# M7.5-A 首次版本失败独立核对

首运行失败真实保留，但 VERSION_MISMATCH 是 runner 缓冲读取假阴性，不是已证 Node 版本错误。亲读 final/node-version/node-download receipts，及 ledger 指定唯一自有fixture的实际 stdout/stderr，未执行任何runtime或进程查询。

Node stdout 实际为9B `v22.19.0\n`，SHA256 `c2c2fa5216720772107a091a7bdc2b12a2ea492d41f94568aa56074f981625c5` 与node-version receipt吻合，stderr空；actualclose0/null、原收据exact own proof和stagegroupabsent成立。官方固定archive SHA `c59006db713c770d6ec63ae16cb3edc11f49ee093b5c415d667bb4f436c6526d` 已验证，47739366B/expanded175135352B。final failed/VERSION_MISMATCH/17.331605916s，只有node-version stage，原source/dist核对true，fixture按失败门禁保留；不能声称pnpmversion/install/build/test已开始或通过。

冻结b65 runner:127 对buffered file.write；143 在writer flush/close前从同pathname read_text比较，165finally才close。短stdout可停留Python缓冲，导致错误比较；最终close后正确字节与hash不能反向改写首失败。最窄修复是在expected compare前flush已写writer，保code/expected/断言与finally清退不变。sameclass output_hashes:174在close后；backend JSON主读取在phase返回后，没有同样read-before-writer-close。修复后仍须独立冻结审查与root单独重试授权，当前无重试结论。
