import { defineConfig } from 'vitest/config';
import base from '../../../../../vitest.config.ts';
// The current base already has the exact client/node alias and source browser entry.
export default defineConfig({ ...base });
