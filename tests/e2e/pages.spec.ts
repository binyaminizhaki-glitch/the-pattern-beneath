import { test, expect } from '@playwright/test';
import { latest, initializeWorld, stepWorld } from '../../src/sim/engine';
import { enterTown, fit, state, week } from './game';

test('a restrictive full game works locally under the Pages path with no remote runtime requests', async ({
  page,
  request,
}) => {
  const root = 'http://127.0.0.1:4174/the-pattern-beneath/';
  const errors: string[] = [],
    remote: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route('**/*', async (route) => {
    if (!['127.0.0.1', 'localhost'].includes(new URL(route.request().url()).hostname)) {
      remote.push(route.request().url());
      await route.abort();
    } else await route.continue();
  });
  for (const [file, type] of [
    ['sources/the-yellow-wall-paper-1892.pdf', 'application/pdf'],
    ['sources/ending-illustration.png', 'image/png'],
    ['art/bedroom.webp', 'image/webp'],
    ['art/wallpaper.webp', 'image/webp'],
    ['art/town.webp', 'image/webp'],
  ]) {
    const response = await request.get(root + file);
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain(type);
    if (type === 'application/pdf')
      expect((await response.body()).subarray(0, 5).toString()).toBe('%PDF-');
  }
  await enterTown(page, root);
  let expected = initializeWorld(42);
  for (let turn = 1; turn <= 8; turn++) {
    expected = stepWorld(expected, { narrative: 'hierarchy', channel: 'gazette' });
    await week(page, 'hierarchy', turn);
  }
  expect((await state(page)).metrics).toEqual(latest(expected).metrics);
  expect((await state(page)).metrics.restrictions).toBeGreaterThan(0.6);
  await fit(page);
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.locator('.ending-engraving img')).toBeVisible();
  await page.getByRole('button', { name: 'Play again', exact: true }).click();
  await expect(page.locator('#start-btn')).toBeVisible();
  expect(remote).toEqual([]);
  expect(errors).toEqual([]);
});
