import {defineConfig} from '@playwright/test';
import {isolatedBaseURL} from './tests/fixtures/isolated-env';

// Existing journeys unlock explicitly; never invoke legacy setup/teardown.
export default defineConfig({
  testDir:'tests/e2e', timeout:30000, retries:0, workers:1,
  reporter:[['list']], outputDir:'artifacts/final-journey-results',
  use:{baseURL:isolatedBaseURL()},
});
