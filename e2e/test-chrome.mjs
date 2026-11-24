import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

async function testLaunch() {
  const chromePath = path.resolve('chrome/win64-157.0.8103.78/chrome-win64/chrome.exe');
  console.log('Testing Chrome launch at:', chromePath);
  const tempUserData = path.join(process.cwd(), '.chrome-qa-profile');
  if (!fs.existsSync(tempUserData)) fs.mkdirSync(tempUserData, { recursive: true });

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-extensions',
      '--disable-default-apps',
      '--disable-component-update',
      `--user-data-dir=${tempUserData}`,
      '--window-size=1280,800',
    ],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844 });

  const consoleLogs = [];
  page.on('console', (msg) => consoleLogs.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', (err) => consoleLogs.push(`[PAGE_ERROR] ${err.message}`));

  console.log('Navigating to http://localhost:8081 ...');
  await page.goto('http://localhost:8081', { waitUntil: 'networkidle0', timeout: 30000 });

  const title = await page.title();
  console.log('Page title:', title);

  const screenshotPath = path.resolve('docs/qa-artifacts/00_initial_load.png');
  await page.screenshot({ path: screenshotPath });
  console.log('Screenshot saved to:', screenshotPath);
  console.log('Console logs captured:', consoleLogs.length);
  consoleLogs.forEach((l) => console.log('  LOG:', l));

  await browser.close();
}

testLaunch().catch((err) => {
  console.error('Launch test failed:', err);
  process.exit(1);
});
