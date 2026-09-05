import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
 testDir:'./tests/e2e',
 timeout:60_000,
 expect:{timeout:10_000},
 fullyParallel:false,
 workers:1,
 reporter:[['list'],['html',{open:'never'}]],
 use:{baseURL:'http://127.0.0.1:3100',trace:'retain-on-failure',screenshot:'only-on-failure'},
 webServer:{command:process.platform==='win32'?'.\\node_modules\\.bin\\wrangler.cmd d1 execute site-creator-d1 --local --persist-to .wrangler/e2e --config dist/server/wrangler.json --file tests/e2e/schema.sql && .\\node_modules\\.bin\\wrangler.cmd dev --config dist/server/wrangler.json --port 3100 --persist-to .wrangler/e2e --var REGISTRY_SYNC_TOKEN:local-e2e-registry-token':'pnpm exec wrangler d1 execute site-creator-d1 --local --persist-to .wrangler/e2e --config dist/server/wrangler.json --file tests/e2e/schema.sql && pnpm exec wrangler dev --config dist/server/wrangler.json --port 3100 --persist-to .wrangler/e2e --var REGISTRY_SYNC_TOKEN:local-e2e-registry-token',url:'http://127.0.0.1:3100',reuseExistingServer:true,timeout:120_000},
 projects:[{name:'chromium',use:{...devices['Desktop Chrome']}}],
});
