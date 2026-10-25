import {defineConfig} from '@playwright/test';
import {lstatSync,realpathSync} from 'node:fs';
import path from 'node:path';
import {isolatedBaseURL} from './tests/fixtures/isolated-env';
const file=path.resolve(process.env.UNAHOUSE_DB_PATH!);
const root=realpathSync(path.join(process.env.HOME!,'.hermes/cache/scratch'));
if(!file.startsWith(root+path.sep)||/finance\.db|test\.db|production|development/i.test(file)||lstatSync(file).isSymbolicLink()||realpathSync(file)!==file||realpathSync(path.dirname(file))!==path.dirname(file))throw new Error('Guarded synthetic DB required');
export default defineConfig({testDir:'tests/layout',timeout:120000,retries:0,workers:1,reporter:[['list']],outputDir:'artifacts/final-layout-results',use:{baseURL:isolatedBaseURL()}});
