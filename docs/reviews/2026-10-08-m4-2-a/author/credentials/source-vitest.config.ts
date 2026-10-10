import {defineConfig} from 'vitest/config';
import path from 'node:path';
export default defineConfig({test:{environment:'node'},resolve:{alias:[
{find:/^@detuned\/client\/node$/,replacement:path.resolve('packages/client/src/node.ts')},
...['protocol','core','storage-sqlite','server','client'].map(name=>({find:new RegExp(`^@detuned/${name}$`),replacement:path.resolve(`packages/${name}/src/index.ts`)}))
]}});
