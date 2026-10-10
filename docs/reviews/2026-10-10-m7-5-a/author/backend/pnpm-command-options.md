# 固定 pnpm11.7 command options 静态核对

只读实际 /opt/homebrew/lib/node_modules/pnpm/dist/pnpm.mjs，12565169B，SHA256 d3a7f4bde2f32c5acc5f012d1edc24c24ea247c2f6c8823146f8cd69ed70b22f。未执行pnpm/安装/build/test，未写runner/配置。attempt2真实rebuild拒绝四共享plainflags保持，不改实际receipt。

## 机制与建议

parseCliArgs的最终types3是GLOBAL_OPTIONS+当前command cliOptionsTypes（285271–275），不是exploratory install/add types。main304210拒unknownOptions。normalizeOptions2（285364–386）将config.前缀键去掉前缀，直接进入normalizedOptions，未加入standardOptionNames未知选项检查；configFromCliOpts（145969/145981）camelCase键并覆盖最终配置，workspace合并146474也以CLI为后值。configDotArgs285293–310在command声明config时另解析，否则普通nopt保留prefix，normalize仍同样处理。

rebuild rcOptionsTypes3/cliOptionsTypes3（162744–763）仅声明npm-path/reporter/scripts-prepend-node-path/unsafe-perm/store-dir与pending/recursive；run cliOptionsTypes39（247608–624）声明workspace-concurrency等；exec rcOptionsTypes41/cliOptionsTypes40（247953–968/248260）亦workspace-concurrency等。GLOBAL_OPTIONS（286410–433）含filter/reporter/pm-on-fail，不含store/cache/state/virtualstore/network/child/workspace-concurrency。

| shared plain flag | rebuild | filter run build | exec vitest | 窄处理 |
|---|---|---|---|---|
| store-dir | 有效 | 无效 | 无效 | 统一config.store-dir |
| virtual-store-dir | 无效 | 无效 | 无效 | 统一config.virtual-store-dir或现private YAML |
| network-concurrency | 无效 | 无效 | 无效 | config.network-concurrency=1 |
| child-concurrency | 无效 | 无效 | 无效 | config.child-concurrency=1 |
| ignore-pnpmfile | 无效 | 无效 | 无效 | config.ignore-pnpmfile=true，不能靠YAML |
| cache-dir/state-dir | 无效 | 无效 | 无效 | config.cache-dir/config.state-dir |
| workspace-concurrency | 无效 | 有效 | 有效 | 统一config.workspace-concurrency=1 |
| enable-global-virtual-store | 无效 | 无效 | 无效 | 现config.enable-global-virtual-store=false |
| side-effects-cache | 无效 | 无效 | 无效 | 现config.side-effects-cache=false |
| verify-deps-before-run | 无效 | 无效 | 无效 | 现config.verify-deps-before-run=warn |
| pm-on-fail | GLOBAL有效 | GLOBAL有效 | GLOBAL有效 | 保error；统一config形式也可 |
| ignore-scripts | 不共享 | 不共享 | 不共享 | 仅原install --ignore-scripts |

上述config键在types2表145524–650实际存在，非猜名。pnpmConfigFileKeys允许workspace配置与excludedPnpmKeys区别必须保留：ignore-pnpmfile在excludedPnpmKeys（143972），getOptionsFromPnpmSettings不允许它从workspace YAML替代CLI。D拟改private YAML加ignorePnpmfile不能作为隔离证据；最窄方案保持既有privateYAML，所有后续common key统一config.<已知key>，不新增工具链、不改全局配置。

所有common pnpm参数放在rebuild/run/exec命令之前；filter为GLOBAL可前置指定单个九包。run build之后是script参数，exec vitest之后是Vitest参数，禁止把pnpm isolation flag传给tsc/Vitest。保持固定私有路径、pm-on-fail=error、frozen lock和禁止重下载package manager；只install忽略scripts，再显式rebuild esbuild这一已批准包，不能用pending/all rebuild。parser合法不证明实际执行成功、隔离完备或依赖build通过，D仍须实际receipt验证。
