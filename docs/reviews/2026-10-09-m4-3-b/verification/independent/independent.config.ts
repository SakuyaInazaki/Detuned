import { defineConfig } from 'vitest/config';
import paths from 'vite-tsconfig-paths';
import { standardDecoratorPlugin, vitestExecArgv } from '../vitest.shared.ts';
export default defineConfig({ plugins:[paths({projects:['./tsconfig.base.json']}),standardDecoratorPlugin()], test:{include:['.detuned-m43/b-independent.spec.ts'],server:{deps:{external:process.env.DETUNED_EXPERIMENT_SUITE==='loader'?[/\/lib\//]:[]}},setupFiles:[],fileParallelism:false,maxWorkers:1,testTimeout:45000,hookTimeout:45000,execArgv:vitestExecArgv} });
