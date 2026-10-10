import { defineConfig } from 'vitest/config';
import base from '../../../../../vitest.config.ts';
export default defineConfig({ ...base, resolve: { alias: {
  '@detuned/client/node': '/Users/sakimi/Desktop/Detuned/packages/client/src/node.ts',
  ...(base.resolve?.alias as Record<string, string>),
} } });
