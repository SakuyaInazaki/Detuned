# M3.3-B.2 父冻结契约

A所有权：storage-sqlite/src/logical-import.ts、index.ts、必要从offline-backup窄提取publication helper（旧行为不变）、tests/integration/m3-logical-import.test.ts、docs03/07/ADR038、本包planning/implementation/storage。B负责protocol decoder/client/CLI；C独验与统一build。SQL/schema/generated profiles/旧review不改。

API `importSpace({inputPath,dataDir,adminName,signal?,timeoutMs?})`；默认/最大120000ms，adminName trim非空且≤128码点；输出 `{data_dir,space_id,admin_actor_id,admin_token,import_id,record_count}`。仅新不存在目标，父目录既存；源末段O_NOFOLLOW、sameFD fstat正规file、canonical parent支持祖先alias。无网络、无附件bytes或URL抓取。

B的完整decodeSpaceExport检查v1/schema2/UTF8/LF/seq/hash/count/end+EOF，逐typed line回调await；A在private staging SQLite事务逐line落库，用DB查重复/引用/版本，无全集数组，全部验证后发布。继承512MiB/1MiB/2M上限，yield/取消/超时，同步SQL不能硬抢占。

来源actor ID禁用占位：kind=agent、display_name=Imported source identity、created_at/disabled_at=importTime，无credential/session/member资格；一个独立禁用synthetic actor承接墓碑未知身份。新humanadmin独立随机ID，冲突拒并清stage。post墓碑note、空title/summary/body、tags=[]、structured={}、本地hash按现公式；未知times/editor=importTime，synthetic_fields来源记录；不FTS。全部revision本地hash重算，原source_content_hash仅非可信来源metadata。

ready artifact→missing，保原hash/bytes/mime/owner/time，不保存content_url。redacted/missing墓碑owner=synthetic、sha256=64zero、bytes=0、mime=application/octet-stream、time=importTime、合法新随机storage_key无file；标synthetic_fields。历史missing/tombstone引用与当前新写ready规则区别验证，不丢历史。

schema2保持：instance_metadata `space_import.v1`严格有版本有界summary，含source header/exportid/importtime/importid/chain/count/转换计数/formalnotenabled；每revision/合成对象单条bounded provenance key记录projected/原hash/合成字段名，无全文/URL/全集ID JSON。仅localadmin正常权限，原身份/批准不可信。

发布复用reservation→独占mkdir→DirectoryLock→所有file/dir fsync→移gate→parent sync；失败不覆盖既有/源，private stage尽力清理，自有半目标保gate，postunlink双故障准确诊断。token只成功返回；交付失败建议另一新目标重导入。

## 最终业务校验

仅一个space；space/current_revision须匹配header.source；space_revision、thread_version、post_revision分别1..current唯一完整，current thread title/state等实体字段与最后version一致。relation positive version，resolution唯一relation_id/version、2≤version≤current且reason同space固定postref；允许过滤后的历史缺项，不填造。若有terminal resolution则resolve对应resolved/reopen对应open；否则原state保留，history_complete=false。只有满足完整2..current历史时history_complete=true（version1无resolution为完整）；不强制缺项历史动作交替。所有四known structured refs存在时按现PostRef/EvidenceRef严格形状、同空间对象与revision验证；unknown字段原样保留，structured.pinned_refs不作系统字段。space_revision.pinned_refs严格验证。墓碑postref及missing/redacted artifact ref允许；redacted post不得revision_artifact输出。

新local审计仅一space.revised、revision=导入current、actor新admin、time=importTime、公有，与导入事务提交；不复制源events，summary new_local_event=true。

## 精确新增本地接口

ImportError.code = INVALID_OPTIONS | INVALID_INPUT | IMPORT_CANCELLED | IMPORT_TIMEOUT | DESTINATION_EXISTS | INCOMPLETE_DIRECTORY | IMPORT_FAILED。前一项CLI exit2，其余exit1；仅固定无secret诊断，发布双故障消息明确完整目标可能可启动但勿使用，另新目录重新导入。维护阶段错误包装为相应ImportError，不公开SQL/输入正文/cause。

测试seam options.hooks?.atStage同步有限名称：input-opened、record、validation、import-transaction、reservation、destination-created、publication、file-sync、directory-sync、readiness；不提供CLI hook开关。record边界是typed row落stagedDB后，token不传hook。仅测试注入，不通用框架。

Provenance严格JSON各记录最大16KiB（本地内部cap，不改变wire限额）：summary key=space_import.v1，shape {version:1,import_id,imported_at,source:header.source,export_id,chain_sha256,record_count,ready_to_missing,post_tombstones,artifact_tombstones,formal_review_status:'not_enabled',formal_check_status:'not_enabled',new_local_event:true}。perobject key=space_import.v1.provenance.+SHA256(JSON.stringify([kind,id,revision|null]))，shape {version:1,kind,object_id,revision:number|null,projected:boolean,source_content_hash:string|null,synthetic_fields:string[],history_complete:boolean|null}。每post_revision/space_revision、synthetic post/artifact、relation各一条；ID在metadata是来源对象定位，不是资格。source_content_hash仅来源非可信值，summary不含token/正文/URL或全集IDs。所有元数据固定字段/合法类型、有界；不覆盖initialized/token_secret。
