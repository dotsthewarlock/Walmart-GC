import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'./tests/browser',timeout:60000,workers:1,retries:0,build:{external:['**/src/**','**/tests/syncFixtures.mjs']},
 use:{baseURL:'http://127.0.0.1:5178',viewport:{width:412,height:923},trace:'retain-on-failure',screenshot:'only-on-failure'},
 webServer:{command:'npm run dev -- --host 127.0.0.1 --port 5178 --strictPort',url:'http://127.0.0.1:5178',reuseExistingServer:false}});
