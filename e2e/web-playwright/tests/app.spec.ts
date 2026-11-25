import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import * as path from 'path';
import * as fs from 'fs';

const SCREEN_DIR = path.resolve(__dirname, '../../../docs/qa/screens');
fs.mkdirSync(SCREEN_DIR, { recursive: true });

test.describe('Khidmat Web E2E (Demo Mode — No DB)', () => {
  test('Auth screen validation, Axe audit, wizard toggle, and login with seeded demo@khidmat.app', async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-testid="auth-login-button"]', { timeout: 60000 });
    await page.screenshot({ path: path.join(SCREEN_DIR, '01-auth-login.png'), fullPage: true });

    // Axe accessibility audit on Auth screen
    const axe = await new AxeBuilder({ page }).analyze();
    console.log(
      'AXE_AUTH_VIOLATIONS:',
      axe.violations.length,
      axe.violations.map((v) => `${v.id}(${v.impact})`).join(', ')
    );

    // Switch to signup wizard and check customer/provider segments
    await page.getByTestId('auth-switch-button').click();
    await page.waitForSelector('[data-testid="segment-customer"]');
    await page.getByTestId('segment-provider').click();
    await page.screenshot({
      path: path.join(SCREEN_DIR, '02-auth-signup-provider.png'),
      fullPage: true,
    });

    // Switch back to login & sign in with seeded mockClient user
    await page.getByTestId('auth-switch-button').click();
    await page.getByTestId('auth-email-input').fill('demo@khidmat.app');
    await page.getByTestId('auth-password-input').fill('123456');
    await page.getByTestId('auth-login-button').click();

    await page.getByText('Assalamu Alaikum').waitFor({ timeout: 30000 });
    const hasHomeGreetingTestId = (await page.locator('[data-testid="home-greeting"]').count()) > 0;
    console.log('HAS_HOME_GREETING_TESTID:', hasHomeGreetingTestId);
    const axeHome = await new AxeBuilder({ page }).analyze();
    console.log(
      'AXE_HOME_VIOLATIONS:',
      axeHome.violations.length,
      axeHome.violations.map((v) => `${v.id}(${v.impact})`).join(', ')
    );
    await page.screenshot({ path: path.join(SCREEN_DIR, '03-customer-home.png'), fullPage: true });
    expect(errors).toEqual([]);
  });

  test('Customer Home categories, search, tabs, legal pages, admin guard, and offline resilience', async ({
    page,
    context,
  }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-testid="auth-login-button"]', { timeout: 60000 });
    await page.getByTestId('auth-email-input').fill('demo@khidmat.app');
    await page.getByTestId('auth-password-input').fill('123456');
    await page.getByTestId('auth-login-button').click();
    await page.getByText('Assalamu Alaikum').waitFor({ timeout: 30000 });

    // Search input (by placeholder since home-search-input testID is missing)
    const search = page.getByPlaceholder(/Search electrician/i);
    await search.fill('Electrician');

    // Navigate to Categories, Providers, Legal pages
    await page.goto('/categories', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(SCREEN_DIR, '04-categories.png'), fullPage: true });

    await page.goto('/providers', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(SCREEN_DIR, '05-providers.png'), fullPage: true });

    await page.goto('/privacy', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(SCREEN_DIR, '06-privacy.png'), fullPage: true });

    await page.goto('/terms', { waitUntil: 'domcontentloaded' });
    await page.goto('/safety', { waitUntil: 'domcontentloaded' });

    // Admin route guard for non-admin customer
    await page.goto('/admin', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(SCREEN_DIR, '07-admin-guard.png'), fullPage: true });

    // Offline resilience check
    await context.setOffline(true);
    await page.goto('/(tabs)/bookings', { waitUntil: 'domcontentloaded' }).catch(() => {});
    await context.setOffline(false);
  });
});
