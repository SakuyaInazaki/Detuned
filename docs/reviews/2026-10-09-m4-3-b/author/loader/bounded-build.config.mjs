import loader from '../vendor/loader/tsdown.config.ts';
import appBoot from '../packages/boot/app-boot/tsdown.config.ts';
const configs=[
  {
    "name": "@deepseek-ai/cordis-plugin-loader",
    "entry": [
      "/private/tmp/detuned-m43-runtime.MU1a4q/vendor/loader/lib/types/index.js"
    ],
    "outDir": "/private/tmp/detuned-m43-runtime.MU1a4q/vendor/loader/lib",
    "format": [
      "esm"
    ],
    "platform": "node",
    "target": "es2024",
    "fixedExtension": false,
    "dts": false,
    "clean": false
  },
  {
    "name": "@deepseek-ai/cosmokit",
    "entry": [
      "/private/tmp/detuned-m43-runtime.MU1a4q/vendor/cosmokit/lib/types/index.js"
    ],
    "outDir": "/private/tmp/detuned-m43-runtime.MU1a4q/vendor/cosmokit/lib",
    "format": [
      "esm"
    ],
    "platform": "node",
    "target": "es2024",
    "fixedExtension": false,
    "dts": false,
    "clean": false
  },
  {
    "name": "@deepseek-ai/cordis",
    "entry": [
      "/private/tmp/detuned-m43-runtime.MU1a4q/vendor/cordis/lib/types/index.js"
    ],
    "outDir": "/private/tmp/detuned-m43-runtime.MU1a4q/vendor/cordis/lib",
    "format": [
      "esm"
    ],
    "platform": "node",
    "target": "es2024",
    "fixedExtension": false,
    "dts": false,
    "clean": false
  },
  {
    "name": "@deepseek-ai/schemastery",
    "entry": [
      "/private/tmp/detuned-m43-runtime.MU1a4q/vendor/schemastery/lib/types/index.js"
    ],
    "outDir": "/private/tmp/detuned-m43-runtime.MU1a4q/vendor/schemastery/lib",
    "format": [
      "esm"
    ],
    "platform": "node",
    "target": "es2024",
    "fixedExtension": false,
    "dts": false,
    "clean": false
  },
  {
    "name": "@deepseek-ai/dsh-hmr",
    "entry": [
      "/private/tmp/detuned-m43-runtime.MU1a4q/packages/boot/hmr/lib/types/index.js"
    ],
    "outDir": "/private/tmp/detuned-m43-runtime.MU1a4q/packages/boot/hmr/lib",
    "format": [
      "esm"
    ],
    "platform": "node",
    "target": "es2024",
    "fixedExtension": false,
    "dts": false,
    "clean": false
  },
  {
    "name": "@deepseek-ai/cordis-plugin-include",
    "entry": [
      "/private/tmp/detuned-m43-runtime.MU1a4q/vendor/include/lib/types/index.js"
    ],
    "outDir": "/private/tmp/detuned-m43-runtime.MU1a4q/vendor/include/lib",
    "format": [
      "esm"
    ],
    "platform": "node",
    "target": "es2024",
    "fixedExtension": false,
    "dts": false,
    "clean": false
  },
  {
    "name": "@deepseek-ai/cordis-plugin-timer",
    "entry": [
      "/private/tmp/detuned-m43-runtime.MU1a4q/vendor/timer/lib/types/index.js"
    ],
    "outDir": "/private/tmp/detuned-m43-runtime.MU1a4q/vendor/timer/lib",
    "format": [
      "esm"
    ],
    "platform": "node",
    "target": "es2024",
    "fixedExtension": false,
    "dts": false,
    "clean": false
  },
  {
    "name": "@deepseek-ai/dsh-app-boot",
    "entry": [
      "/private/tmp/detuned-m43-runtime.MU1a4q/packages/boot/app-boot/lib/types/index.js"
    ],
    "outDir": "/private/tmp/detuned-m43-runtime.MU1a4q/packages/boot/app-boot/lib",
    "format": [
      "esm"
    ],
    "platform": "node",
    "target": "es2024",
    "fixedExtension": false,
    "dts": false,
    "clean": false
  },
  {
    "name": "@deepseek-ai/cordis-plugin-group",
    "entry": [
      "/private/tmp/detuned-m43-runtime.MU1a4q/vendor/group/lib/types/index.js"
    ],
    "outDir": "/private/tmp/detuned-m43-runtime.MU1a4q/vendor/group/lib",
    "format": [
      "esm"
    ],
    "platform": "node",
    "target": "es2024",
    "fixedExtension": false,
    "dts": false,
    "clean": false
  },
  {
    "name": "@deepseek-ai/dsh-system-prompt",
    "entry": [
      "/private/tmp/detuned-m43-runtime.MU1a4q/packages/core/system-prompt/lib/types/index.js"
    ],
    "outDir": "/private/tmp/detuned-m43-runtime.MU1a4q/packages/core/system-prompt/lib",
    "format": [
      "esm"
    ],
    "platform": "node",
    "target": "es2024",
    "fixedExtension": false,
    "dts": false,
    "clean": false
  },
  {
    "name": "@deepseek-ai/dsh-llm",
    "entry": [
      "/private/tmp/detuned-m43-runtime.MU1a4q/packages/llm/llm/lib/types/index.js"
    ],
    "outDir": "/private/tmp/detuned-m43-runtime.MU1a4q/packages/llm/llm/lib",
    "format": [
      "esm"
    ],
    "platform": "node",
    "target": "es2024",
    "fixedExtension": false,
    "dts": false,
    "clean": false
  },
  {
    "name": "@deepseek-ai/dsh-brand",
    "entry": [
      "/private/tmp/detuned-m43-runtime.MU1a4q/packages/util/brand/lib/types/index.js"
    ],
    "outDir": "/private/tmp/detuned-m43-runtime.MU1a4q/packages/util/brand/lib",
    "format": [
      "esm"
    ],
    "platform": "node",
    "target": "es2024",
    "fixedExtension": false,
    "dts": false,
    "clean": false
  },
  {
    "name": "@deepseek-ai/dsh-attachment",
    "entry": [
      "/private/tmp/detuned-m43-runtime.MU1a4q/packages/attachment/attachment/lib/types/index.js"
    ],
    "outDir": "/private/tmp/detuned-m43-runtime.MU1a4q/packages/attachment/attachment/lib",
    "format": [
      "esm"
    ],
    "platform": "node",
    "target": "es2024",
    "fixedExtension": false,
    "dts": false,
    "clean": false
  },
  {
    "name": "@deepseek-ai/dsh-timeout",
    "entry": [
      "/private/tmp/detuned-m43-runtime.MU1a4q/packages/util/timeout/lib/types/index.js"
    ],
    "outDir": "/private/tmp/detuned-m43-runtime.MU1a4q/packages/util/timeout/lib",
    "format": [
      "esm"
    ],
    "platform": "node",
    "target": "es2024",
    "fixedExtension": false,
    "dts": false,
    "clean": false
  },
  {
    "name": "@deepseek-ai/dsh-util-crypto",
    "entry": [
      "/private/tmp/detuned-m43-runtime.MU1a4q/packages/util/crypto/lib/types/index.js"
    ],
    "outDir": "/private/tmp/detuned-m43-runtime.MU1a4q/packages/util/crypto/lib",
    "format": [
      "esm"
    ],
    "platform": "node",
    "target": "es2024",
    "fixedExtension": false,
    "dts": false,
    "clean": false
  },
  {
    "name": "@deepseek-ai/dsh-util-values",
    "entry": [
      "/private/tmp/detuned-m43-runtime.MU1a4q/packages/util/values/lib/types/index.js"
    ],
    "outDir": "/private/tmp/detuned-m43-runtime.MU1a4q/packages/util/values/lib",
    "format": [
      "esm"
    ],
    "platform": "node",
    "target": "es2024",
    "fixedExtension": false,
    "dts": false,
    "clean": false
  },
  {
    "name": "@deepseek-ai/dsh-typert-protocol",
    "entry": [
      "/private/tmp/detuned-m43-runtime.MU1a4q/packages/typert/protocol/lib/types/index.js"
    ],
    "outDir": "/private/tmp/detuned-m43-runtime.MU1a4q/packages/typert/protocol/lib",
    "format": [
      "esm"
    ],
    "platform": "node",
    "target": "es2024",
    "fixedExtension": false,
    "dts": false,
    "clean": false
  },
  {
    "name": "@deepseek-ai/dsh-scope",
    "entry": [
      "/private/tmp/detuned-m43-runtime.MU1a4q/packages/core/scope/lib/types/index.js"
    ],
    "outDir": "/private/tmp/detuned-m43-runtime.MU1a4q/packages/core/scope/lib",
    "format": [
      "esm"
    ],
    "platform": "node",
    "target": "es2024",
    "fixedExtension": false,
    "dts": false,
    "clean": false
  },
  {
    "name": "@deepseek-ai/dsh-launch-environment",
    "entry": [
      "/private/tmp/detuned-m43-runtime.MU1a4q/packages/util/launch-environment/lib/types/index.js"
    ],
    "outDir": "/private/tmp/detuned-m43-runtime.MU1a4q/packages/util/launch-environment/lib",
    "format": [
      "esm"
    ],
    "platform": "node",
    "target": "es2024",
    "fixedExtension": false,
    "dts": false,
    "clean": false
  },
  {
    "name": "@deepseek-ai/dsh-home-paths",
    "entry": [
      "/private/tmp/detuned-m43-runtime.MU1a4q/packages/util/home-paths/lib/types/index.js"
    ],
    "outDir": "/private/tmp/detuned-m43-runtime.MU1a4q/packages/util/home-paths/lib",
    "format": [
      "esm"
    ],
    "platform": "node",
    "target": "es2024",
    "fixedExtension": false,
    "dts": false,
    "clean": false
  },
  {
    "name": "@deepseek-ai/dsh-package-manifest",
    "entry": [
      "/private/tmp/detuned-m43-runtime.MU1a4q/packages/util/package-manifest/lib/types/index.js"
    ],
    "outDir": "/private/tmp/detuned-m43-runtime.MU1a4q/packages/util/package-manifest/lib",
    "format": [
      "esm"
    ],
    "platform": "node",
    "target": "es2024",
    "fixedExtension": false,
    "dts": false,
    "clean": false
  },
  {
    "name": "@deepseek-ai/dsh-atomic-write",
    "entry": [
      "/private/tmp/detuned-m43-runtime.MU1a4q/packages/util/atomic-write/lib/types/index.js"
    ],
    "outDir": "/private/tmp/detuned-m43-runtime.MU1a4q/packages/util/atomic-write/lib",
    "format": [
      "esm"
    ],
    "platform": "node",
    "target": "es2024",
    "fixedExtension": false,
    "dts": false,
    "clean": false
  },
  {
    "name": "@deepseek-ai/dsh-cmdline",
    "entry": [
      "/private/tmp/detuned-m43-runtime.MU1a4q/packages/boot/cmdline/lib/types/index.js"
    ],
    "outDir": "/private/tmp/detuned-m43-runtime.MU1a4q/packages/boot/cmdline/lib",
    "format": [
      "esm"
    ],
    "platform": "node",
    "target": "es2024",
    "fixedExtension": false,
    "dts": false,
    "clean": false
  },
  {
    "name": "@deepseek-ai/dsh-tools",
    "entry": [
      "/private/tmp/detuned-m43-runtime.MU1a4q/packages/core/tools/lib/types/index.js"
    ],
    "outDir": "/private/tmp/detuned-m43-runtime.MU1a4q/packages/core/tools/lib",
    "format": [
      "esm"
    ],
    "platform": "node",
    "target": "es2024",
    "fixedExtension": false,
    "dts": false,
    "clean": false
  },
  {
    "name": "@deepseek-ai/dsh-session",
    "entry": [
      "/private/tmp/detuned-m43-runtime.MU1a4q/packages/core/session/lib/types/index.js"
    ],
    "outDir": "/private/tmp/detuned-m43-runtime.MU1a4q/packages/core/session/lib",
    "format": [
      "esm"
    ],
    "platform": "node",
    "target": "es2024",
    "fixedExtension": false,
    "dts": false,
    "clean": false
  },
  {
    "name": "@deepseek-ai/dsh-ptc-runtime",
    "entry": [
      "/private/tmp/detuned-m43-runtime.MU1a4q/packages/ptc-runtime/ptc-runtime/lib/types/index.js"
    ],
    "outDir": "/private/tmp/detuned-m43-runtime.MU1a4q/packages/ptc-runtime/ptc-runtime/lib",
    "format": [
      "esm"
    ],
    "platform": "node",
    "target": "es2024",
    "fixedExtension": false,
    "dts": false,
    "clean": false
  },
  {
    "name": "@deepseek-ai/dsh-sandbox",
    "entry": [
      "/private/tmp/detuned-m43-runtime.MU1a4q/packages/sandbox/sandbox/lib/types/index.js"
    ],
    "outDir": "/private/tmp/detuned-m43-runtime.MU1a4q/packages/sandbox/sandbox/lib",
    "format": [
      "esm"
    ],
    "platform": "node",
    "target": "es2024",
    "fixedExtension": false,
    "dts": false,
    "clean": false
  },
  {
    "name": "@deepseek-ai/dsh-agent",
    "entry": [
      "/private/tmp/detuned-m43-runtime.MU1a4q/packages/core/agent/lib/types/index.js"
    ],
    "outDir": "/private/tmp/detuned-m43-runtime.MU1a4q/packages/core/agent/lib",
    "format": [
      "esm"
    ],
    "platform": "node",
    "target": "es2024",
    "fixedExtension": false,
    "dts": false,
    "clean": false
  },
  {
    "name": "@deepseek-ai/dsh-session-projection",
    "entry": [
      "/private/tmp/detuned-m43-runtime.MU1a4q/packages/session/session-projection/lib/types/index.js"
    ],
    "outDir": "/private/tmp/detuned-m43-runtime.MU1a4q/packages/session/session-projection/lib",
    "format": [
      "esm"
    ],
    "platform": "node",
    "target": "es2024",
    "fixedExtension": false,
    "dts": false,
    "clean": false
  },
  {
    "name": "@deepseek-ai/dsh-workspace",
    "entry": [
      "/private/tmp/detuned-m43-runtime.MU1a4q/packages/workspace/workspace/lib/types/index.js"
    ],
    "outDir": "/private/tmp/detuned-m43-runtime.MU1a4q/packages/workspace/workspace/lib",
    "format": [
      "esm"
    ],
    "platform": "node",
    "target": "es2024",
    "fixedExtension": false,
    "dts": false,
    "clean": false
  },
  {
    "name": "@deepseek-ai/dsh-storage",
    "entry": [
      "/private/tmp/detuned-m43-runtime.MU1a4q/packages/storage/storage/lib/types/index.js"
    ],
    "outDir": "/private/tmp/detuned-m43-runtime.MU1a4q/packages/storage/storage/lib",
    "format": [
      "esm"
    ],
    "platform": "node",
    "target": "es2024",
    "fixedExtension": false,
    "dts": false,
    "clean": false
  },
  {
    "name": "@deepseek-ai/dsh-storage-domain",
    "entry": [
      "/private/tmp/detuned-m43-runtime.MU1a4q/packages/storage/storage-domain/lib/types/index.js"
    ],
    "outDir": "/private/tmp/detuned-m43-runtime.MU1a4q/packages/storage/storage-domain/lib",
    "format": [
      "esm"
    ],
    "platform": "node",
    "target": "es2024",
    "fixedExtension": false,
    "dts": false,
    "clean": false
  },
  {
    "name": "@deepseek-ai/dsh-session-persistence",
    "entry": [
      "/private/tmp/detuned-m43-runtime.MU1a4q/packages/session/session-persistence/lib/types/index.js"
    ],
    "outDir": "/private/tmp/detuned-m43-runtime.MU1a4q/packages/session/session-persistence/lib",
    "format": [
      "esm"
    ],
    "platform": "node",
    "target": "es2024",
    "fixedExtension": false,
    "dts": false,
    "clean": false
  },
  {
    "name": "@deepseek-ai/dsh-user-approval",
    "entry": [
      "/private/tmp/detuned-m43-runtime.MU1a4q/packages/interaction/user-approval/lib/types/index.js"
    ],
    "outDir": "/private/tmp/detuned-m43-runtime.MU1a4q/packages/interaction/user-approval/lib",
    "format": [
      "esm"
    ],
    "platform": "node",
    "target": "es2024",
    "fixedExtension": false,
    "dts": false,
    "clean": false
  },
  {
    "name": "@deepseek-ai/dsh-sandbox-policy",
    "entry": [
      "/private/tmp/detuned-m43-runtime.MU1a4q/packages/sandbox/sandbox-policy/lib/types/index.js"
    ],
    "outDir": "/private/tmp/detuned-m43-runtime.MU1a4q/packages/sandbox/sandbox-policy/lib",
    "format": [
      "esm"
    ],
    "platform": "node",
    "target": "es2024",
    "fixedExtension": false,
    "dts": false,
    "clean": false
  },
  {
    "name": "@deepseek-ai/dsh-mcp-client",
    "entry": [
      "/private/tmp/detuned-m43-runtime.MU1a4q/packages/mcp/mcp-client/lib/types/index.js"
    ],
    "outDir": "/private/tmp/detuned-m43-runtime.MU1a4q/packages/mcp/mcp-client/lib",
    "format": [
      "esm"
    ],
    "platform": "node",
    "target": "es2024",
    "fixedExtension": false,
    "dts": false,
    "clean": false
  },
  {
    "name": "@deepseek-ai/dsh-subprocess",
    "entry": [
      "/private/tmp/detuned-m43-runtime.MU1a4q/packages/subprocess/subprocess/lib/types/index.js"
    ],
    "outDir": "/private/tmp/detuned-m43-runtime.MU1a4q/packages/subprocess/subprocess/lib",
    "format": [
      "esm"
    ],
    "platform": "node",
    "target": "es2024",
    "fixedExtension": false,
    "dts": false,
    "clean": false
  },
  {
    "name": "@deepseek-ai/dsh-http-proxy",
    "entry": [
      "/private/tmp/detuned-m43-runtime.MU1a4q/packages/util/http-proxy/lib/types/index.js"
    ],
    "outDir": "/private/tmp/detuned-m43-runtime.MU1a4q/packages/util/http-proxy/lib",
    "format": [
      "esm"
    ],
    "platform": "node",
    "target": "es2024",
    "fixedExtension": false,
    "dts": false,
    "clean": false
  },
  {
    "name": "@deepseek-ai/dsh-mcp-resources",
    "entry": [
      "/private/tmp/detuned-m43-runtime.MU1a4q/packages/mcp/mcp-resources/lib/types/index.js"
    ],
    "outDir": "/private/tmp/detuned-m43-runtime.MU1a4q/packages/mcp/mcp-resources/lib",
    "format": [
      "esm"
    ],
    "platform": "node",
    "target": "es2024",
    "fixedExtension": false,
    "dts": false,
    "clean": false
  },
  {
    "name": "@deepseek-ai/dsh-typert-generator",
    "entry": [
      "/private/tmp/detuned-m43-runtime.MU1a4q/packages/typert/generator/lib/types/index.js"
    ],
    "outDir": "/private/tmp/detuned-m43-runtime.MU1a4q/packages/typert/generator/lib",
    "format": [
      "esm"
    ],
    "platform": "node",
    "target": "es2024",
    "fixedExtension": false,
    "dts": false,
    "clean": false
  }
];
function specialized(value,dir,name){return value.map(c=>({...c,name,entry:Array.isArray(c.entry)?c.entry.map(p=>dir+'/'+p):Object.fromEntries(Object.entries(c.entry).map(([k,p])=>[k,dir+'/'+p])),outDir:dir+'/lib'}))}
export default [...configs.filter(c=>!['@deepseek-ai/cordis-plugin-loader','@deepseek-ai/dsh-app-boot'].includes(c.name)),...specialized(loader,'/private/tmp/detuned-m43-runtime.MU1a4q/vendor/loader','@deepseek-ai/cordis-plugin-loader'),...specialized(appBoot,'/private/tmp/detuned-m43-runtime.MU1a4q/packages/boot/app-boot','@deepseek-ai/dsh-app-boot')];
