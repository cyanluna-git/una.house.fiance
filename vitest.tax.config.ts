import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';
export default defineConfig({ plugins:[tsconfigPaths()], test: { include: ['tests/tax/**/*.test.ts','tests/api/auth-middleware.test.ts'], environment: 'node' } });
