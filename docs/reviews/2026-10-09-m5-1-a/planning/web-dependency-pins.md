# M5.1-B 精确公开依赖 pins（只读，2026-10-09）

父已选方向，本材料只确认 registry 元数据，不安装/改 lock。首次 web 工具访问四 metadata 全 InternalError；没有重复同一失败。父准最小 managed network 下 env-i `/usr/bin/python3` HTTPS 读取公开 npm registry 后 exit0；无 npm/Agent rc、认证、安装脚本或tarball下载。补查已成功metadata的TS最低版本/optional peers亦exit0。

| pin | license | engine / peer |
|---|---|---|
| react-dom 19.3.0 | MIT | engines未声明；peer react ^19.3.0，依赖scheduler ^0.28.0 |
| @types/react 19.3.0 | MIT | engines未声明；typeScriptVersion 5.6，依赖csstype ^3.2.2 |
| @types/react-dom 19.3.0 | MIT | engines未声明；typeScriptVersion5.6，peer @types/react ^19.3.0 |
| vite 7.3.7 | MIT | node ^20.19.0或>=22.12.0；@types/node ^20.19.0或>=22.12.0是optional peer |

当前已安装 TypeScript **5.9.3**，满足两个types公开最低5.6。当前Node26.3.0满足Vite engine。React19.3.0已在上包官方registry确认MIT，同版react-dom真实存在且其peer明确匹配；建议四React包都精确19.3.0，Vite同维护线7.3.7。仅父准后写manifest/lock，不能把尚未安装声明成build成功。

## dist 完整性（registry元数据，不是本地已下载验证）

- [react-dom19.3.0](https://registry.npmjs.org/react-dom/19.3.0)：`sha512-JDk8dgif51OjFoDE70+OT9ICyYr+69HlmihNwp1+Nsfbna3t5sIiCa9ZJktDmQ4/1b/rn26hIAR2uYXDMr5r0Q==`；shasum `a0ff19161d7f4e9be5469a07278b0c06e00f9001`。
- [@types/react19.3.0](https://registry.npmjs.org/@types%2freact/19.3.0)：`sha512-N0rFCuH9YoxG9/m61l9MfpJKfmLOVU0em7ipIz6TRgSSkvReLB9vL85GB+yr8Bs5leqpvg96JSwF4ZS1s4viQg==`；shasum `3b3ce8d8c1627fb5ccd4dadd57ef445c5a153b77`。
- [@types/react-dom19.3.0](https://registry.npmjs.org/@types%2freact-dom/19.3.0)：`sha512-ZI7bU42mZXXKHn/qNLEw2IrbiINU7X5+vfgdixBHkCNpYWXjKgfQ/P+uyGb5CjOLB9UcnTeg3rylQtV2hym44Q==`；shasum `90294a9266efd928a5266f2110d60d5dba5015d2`。
- [vite7.3.7](https://registry.npmjs.org/vite/7.3.7)：`sha512-AHEzTORMbi7/7aXp7w7KZ5+DCUdSeLsJz0grY8xHpc9DHdYb0vQu6DqJfm2tOw3gDExNgPgnJTXxM6syYFHaCA==`；shasum `017a80fdce051003a4aa290dddd0b159aa769282`。

Vite其它peer全部optional：tsx ^4.8.1、jiti>=1.21、less ^4、sass ^1.70、yaml ^2.4.2、stylus>=0.54.8、terser ^5.16、sugarss ^5、lightningcss ^1.21、sass-embedded ^1.70；不因metadata出现就新增它们。直接依赖fdir ^6.5、rollup ^4.43、esbuild ^0.27或^0.28、postcss ^8.5.6、picomatch ^4.0.3、tinyglobby ^0.2.15，实际锁图变化须安装授权后审阅。

父选Playwright1.64.0配现Chrome与独立private BrowserContexts优先；此前官方metadata已确认Apache-2.0、Node>=20。此轮不下载浏览器、不启动Chrome、不读取用户profile。Vite7.3.7是2026-10-06 [GHSA-9jrq-w75r-8gcw修复版](https://github.com/vitejs/vite/security/advisories/GHSA-9jrq-w75r-8gcw)，不升级major；这不是完整依赖审计证明。
