# M3.3-C B→A只读互审

2026-10-08，读offline-upgrade.ts、offline-backup窄copy/resetidentity helper、logical-import threadgap/index、6formal及frozen-contract。未改A产品/tests，未跑新实验/fullsuite；未见本轮可达新增阻塞。

源regularDirectory/no末段symlink、canonical source/target拒等同/包含/alias，合作DirectoryLock及二次ready gate后readonly/fileMustExist/timeout0打开DB。source不调用SqliteStorage/bootstrap/checkpoint；classify支持legacy且maxversion1、FKfirstget/integrity firstget。driver实际backup实现首步rate0初始化，随后progress返回100页检查signal/deadline；最终transfer可能不调用progress，但A awaitbackup后立即check覆盖。源DB/WAL及登记附件不迁移/写入；SHM/锁可协调变化、合作锁不防绕锁writer，未作更强零写承诺。

附件keyset与≤10000登记、≤25MiB/state/hash/storage_key明确校验；根objects目录/末段非软链文件，NOFOLLOW同fd regular读/hash，private副本600、完整写循环与sync。不复制无登记材料，ready无bytes拒，redacted/missing无bytes保状态、有bytes校验。copy后/迁移后再逐rowhash，计量和安全profile边界有限，不是假oldHTTP上传API。路径祖先是受信维护目录，未声称抗活跃恶意换目录或任意无锁writer。

只副本bootstrap现事务迁移，current结构复核后resetRestoredIdentity单事务撤旧credential/新token_secret/独立human+*admin；原actors disabled/memberships/session/pending/research保持，不继承旧credential。token不传hooks/日志，仅成功return。backup进度/后await/阶段check与ready前取消，readyunlink后完整实例不误称半套；publication沿独占marker→mkdir→lock→所有文件dirsync→unlink→parentsync，EEXIST不碰非自有target、双故障准确完整但持久性未确认勿用/另newdir诊断。finally关DB/释放锁/清自有stage，未删源/既有final。

threadgap实际因果已校正：完整旧HTTP create/patch缓存能够回填[1,2]，thread-gap-before.log保首expected[2]假设失败；fa1b强制key且无TTL。支持边界fixture仅手动删私有thread.create key=thread缓存（研究不删），thread-gap-before-incomplete-cache证原import拒[2]，不是自然过期/所有v1。新逻辑import仅thread放宽，已有uniquepositive版本范围1..current/current存在及title/state一致、history_complete明确false/true；space/post连续约束保持，无伪造历史。docs04/guide已按父要求写条件式，旧B2归档不回写。

B唯一必要Aready源码alias noEmit（含CLI/真实API导出）exit0，见source-noemit-cli-ready.log；不是统一build/正式built CLI或最终suite。已有6formal source/限定probe证据由A报告保留，本互审不重复运行。B产品/tests原freeze保持；仅授权doc因果精确修正与hash刷新已报C。
