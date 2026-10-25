import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';
import { guardedPath } from './scripts/tax-migrate';
const file=guardedPath(process.env.UNAHOUSE_DB_PATH!);
export default defineConfig({plugins:[tsconfigPaths()],test:{include:['tests/api/**/*.test.ts'],environment:'node',setupFiles:['scripts/tax-safe-api-setup.ts'],fileParallelism:false,testTimeout:30000,env:{UNAHOUSE_DB_PATH:file,UNAHOUSE_ACCESS_KEY_BASE64:'test-key-base64'}}});
