# M4.1-E A token 交付

实现同步 resolveCliToken 两参数接口，四来源 >1冲突（含同值/emptyflag），0匿名，selected失败不fallback。env显式注入不读取ambient配置。trim外层后非空、内部JS空白/Unicode Cc拒，不限制prefix/长度/ASCII或normalize。文件64KiB原bytes、sameFD正规文件、O_NOFOLLOW/O_NONBLOCK、有界+1/strictUTF8/前后stat/finallyclose；固定safeVALIDATION_ERROR，不输出path/token/FS cause。不加mode/uid拒、不chmod。

7组作者formal第一source运行全部通过，唯一含testnoEmit exit0。分别核单来源/匿名、全部来源对冲突、token whitespace/Cc/Unicode保真、原bytes上限、badUTF8/empty/control、缺失/dir/末段symlink/nofallback/宽mode不拒、真实no-writer FIFO boundedchild与成功/失败打开FD最终关闭。FIFO child不是CLI全命令实验；主正式source采用私有FS，同PID fixture finally清理。未增加产品fault面。

文档docs04 E节/ADR048忠实父冻结；完整parser/action改造属于B，不由resolver声称已实现。未读取真实env或凭据/未安装/未构建或全套；C负责真实CLI/统一gate。父scope防护边界：祖先alias和同UID恶意改材料不保证；前后stat是变化检测，不等于原子文件快照。
