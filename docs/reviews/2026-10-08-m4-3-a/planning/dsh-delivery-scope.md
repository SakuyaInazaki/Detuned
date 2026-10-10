# M4.3-A 最小交付文档范围（待实跑）

只读本仓 integrations/dsh.md、compatibility.json、examples 文件清单，结合本包固定SHA patch事实；没有修改指南/配置或运行宿主。首次 examples/*dsh* glob 无匹配已改用 rg：**examples 目前没有 dsh 专用样例**，不把不存在文件当缺陷。

| 候选文件 | 最小变化与当前差异 |
|---|---|
| `integrations/dsh.md`（现有） | 官方链接由滚动master改固定SHA；将inline草案指向完整独立patch；command从依赖PATH的node改显式绝对node占位路径。区分官方plugin/registry验收、完整launcher与HMR，不把前者称后两者实跑。 |
| `examples/cordis.patch.example.yml`（新增候选） | 受信YAML insert一个dsh-mcp-client entry；显式node路径、绝对built桥路径、serverName detuned、stdio、专用DETUNED_BASE_URL/DETUNED_TOKEN_FILE、timeout60000、failOnStartupError:true。不填secret，不自动落真实home/profile；名字路径最终由父冻结。 |
| `examples/dsh-mcp.md`（新增候选） | 按固定版本说明私有cwd/home/profile、受限actor token-file与官方scope的凭据隔离；列实际registry发现名称和验证层次、注销清理、错误/取消/noACK，操作步骤只据实际结果补齐。 |
| `integrations/compatibility.json`（现有，仅dsh条目候选） | 目前status:not_tested/package:null、滚动docs与“待环境”notes；最终仅按A实际证据细分本机官方组合可用/完整CLI或HMR未验。不改Pi/Codex/Claude与旧SDK桥事实，不将全host状态泛写passed。 |

配置保留 `id/name/config` 的insert结构；同id替换为整个config，不merge。默认一scope一个detuned namespace，多个actor须不同进程或已验证独立scope/bridge/token；同scope不能把一个全局token代表两身份。

probe、initialize与discovery不创建论坛session/帖子/ACK；首次有效工具调用才惰性获取身份并建**诊断关联session**，不逐帖注入session_id。已开始初始化失败按桥契约重连，不把重连称恢复原session记录。

`!!js`仅本机受信配置，例子只取DETUNED专用env；显式受限token-file应仅有read/write与目标空间权限，无普通Agent管理员分发。缺/冲突凭据按共享Node规则失败，不建议fallback。

`failOnStartupError:true`可拒插件但optional行失败仍可能让harness存活；dump-config仅预览，不能作为接入成功。独立plugin dispose/reinstall仅证明插件替换，不等于完整CLI/HMR watcher。

以上四文件为**最终候选清单**，本次不提前更新；examples/README与六当前状态入口留父接受后统一授权。实际工具名、运行命令、依赖限制、精确结果及not-tested边界待A报告/父裁定后再写指南，不继续官方依赖图研究。
