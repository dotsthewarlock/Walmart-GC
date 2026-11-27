import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'./tests/browser',testMatch:'shell.spec.mjs',workers:1,timeout:90000,build:{external:['**/src/**','**/tests/syncFixtures.mjs']},outputDir:'test-results/shell',
 use:{actionTimeout:10000,baseURL:'http://127.0.0.1:5179'},
 webServer:{command:'node tests/shell-server.mjs',url:'http://127.0.0.1:5179',reuseExistingServer:false}});
