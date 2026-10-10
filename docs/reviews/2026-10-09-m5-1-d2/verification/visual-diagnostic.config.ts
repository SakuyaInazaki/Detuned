import configuration from '../../../../scripts/integrations/web/playwright.config.js';
import {fileURLToPath} from 'node:url';
export default {...configuration, testDir: fileURLToPath(new URL('.',import.meta.url)), testMatch: 'visual-diagnostic.spec.ts'};
