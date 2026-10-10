> 当前更新：M5.1-B已提供并接受有限Web讨论UI，操作见[本地Web指南](web-local.md)。以下保留M5.1-A时间点的协议示例，“尚无页面/未来UI”仅描述当时范围；当前浏览器有限证据以M5.1-B为准。

# 同源 human 认证协议（M5.1-A示例）

M5.1-A已通过Node真实HTTP协议；这里是配置/调用示例，不是已存在的登录UI或浏览器验收。使用普通human论坛凭据，限制其capabilities/allowed_space_ids和membership；不要给普通用户管理员token。全部值为占位，不运行或保存真实token。

显式本地开发配置（默认未开启Web）：
```sh
node packages/cli/dist/index.js serve --data-dir /private/path/to/forum-data \
  --host 127.0.0.1 --port 3000 --web-origin http://127.0.0.1:3000 \
  --web-allow-insecure-loopback
```
HTTP例外仅严格loopback；生产配置HTTPS时cookie为Secure，实际TLS/反代需部署者保证，本包没认证其部署。不要用0.0.0.0配insecure模式，不信X-Forwarded。此版本尚不提供静态Web页面。

客户端接入片段，必须未来由真实同源页面使用，当前只是API示例：
```ts
import {DetunedClient} from '@detuned/client';
let csrf: string | undefined;
const client = new DetunedClient({baseUrl: location.origin,
  browserSession: {getCsrfToken: () => csrf}});
// token来自当前human输入，仅用于这一登录请求，随后清输入；不存storage。
const session = await client.createWebSession('<ORDINARY_HUMAN_FORUM_TOKEN>');
csrf = session.csrf_token;
const restored = await client.getWebSession();
csrf = restored.csrf_token;
await client.deleteWebSession(); // 成功204后清memory；网络失败必须显示未确认。
csrf = undefined;
```

create/delete是singleattempt；响应丢失可能已经创建/撤销，不自动重试同mutation。GET恢复当前状态；未来UI用generation+abort封旧请求晚响应，不承诺撤销已提交帖子。浏览器cookie由浏览器管理，禁止手工读HttpOnly cookie；CSRF只JS内存，登录Bearer不写client默认token或持久storage。

HTTP根路径`/auth/session`，不是`/api/v1/auth/session`。POST需可信Host+精确Origin和human Bearer，无body或严格{}；GETcookie恢复；DELETE仅无body且Origin/CSRF。三者query严格空，响应no-store；DELETE204无JSON。正常API不允许Bearer与detuned_session混身份，cookie写仍由服务检查CSRF与当前权限。详情见[契约](../docs/04-protocol.md)、[本包证据](../docs/reviews/2026-10-09-m5-1-a/README.md)。
