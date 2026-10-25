import { lstatSync, realpathSync } from 'node:fs';
import path from 'node:path';

function guardedPath(input: string): void {
  const root = realpathSync(path.join(process.env.HOME!, '.hermes/cache/scratch'));
  const file = path.resolve(input);
  if (!file.startsWith(root + path.sep) || /finance\.db|test\.db|production|development/i.test(file) ||
      lstatSync(file).isSymbolicLink() || realpathSync(file) !== file ||
      realpathSync(path.dirname(file)) !== path.dirname(file)) {
    throw new Error('Existing guarded synthetic database required');
  }
}

// No default origin or database: safe wrappers must be explicitly isolated.
export function isolatedBaseURL(): string {
  if (!process.env.UNAHOUSE_DB_PATH || !process.env.UNAHOUSE_TEST_BASE_URL) {
    throw new Error('Explicit isolated database and test URL required');
  }
  guardedPath(process.env.UNAHOUSE_DB_PATH);
  const url = new URL(process.env.UNAHOUSE_TEST_BASE_URL);
  if (url.protocol !== 'http:' || url.hostname !== '127.0.0.1' || !url.port ||
      ['3101', '3104', '3105', '3106'].includes(url.port) || url.pathname !== '/' ||
      url.search || url.hash || url.username || url.password) {
    throw new Error('Dedicated loopback test origin required');
  }
  if (!['layout-test-key', 'test-key-base64', 'synthetic-tax-local-only'].includes(process.env.UNAHOUSE_ACCESS_KEY_BASE64 ?? '')) {
    throw new Error('Synthetic test authentication required');
  }
  return url.origin;
}

export default { isolatedBaseURL };
