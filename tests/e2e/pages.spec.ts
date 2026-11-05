import { test, expect } from '@playwright/test';
import { readRoom } from './room';
test('production assets and story load beneath a GitHub Pages project path', async ({
  page,
  request,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const root = 'http://127.0.0.1:4174/the-pattern-beneath/';
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(root);
  const pdf = await request.get(root + 'sources/the-yellow-wall-paper-1892.pdf');
  expect(pdf.status()).toBe(200);
  expect(pdf.headers()['content-type']).toContain('application/pdf');
  expect((await pdf.body()).subarray(0, 5).toString()).toBe('%PDF-');
  const illustration = await request.get(root + 'sources/ending-illustration.png');
  expect(illustration.status()).toBe(200);
  expect(illustration.headers()['content-type']).toContain('image/png');
  await expect(page.locator('#start-btn')).toBeVisible();
  const manifest = await (await request.get(root + 'art/manifest.json')).json();
  expect(manifest.assets).toHaveLength(11);
  for (const asset of manifest.assets) {
    const response = await request.get(root + 'art/' + asset.file);
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toBe('image/webp');
  }
  expect(
    await page
      .locator('.scene-art')
      .evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 1000),
  ).toBe(true);
  await page.locator('#start-btn').click();
  await readRoom(page, 0);
  await expect(
    page.getByRole('heading', { name: 'The Vesper Gazette', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Meet Clara', exact: true }).click();
  await page.getByRole('button', { name: 'Speak with Clara', exact: true }).click();
  await page.getByRole('button', { name: 'Step into Vesper', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Release narrative and advance one week' }),
  ).toBeVisible();
  for (let week = 1; week <= 8; week++) {
    await page
      .getByRole('button', { name: 'Release narrative and advance one week', exact: true })
      .click();
    await page.getByRole('button', { name: 'Skip animation', exact: true }).click();
    if ([1, 2, 3, 5, 6, 7].includes(week))
      await page
        .getByRole('button', {
          name: [2, 6].includes(week) ? 'Back to the upstairs room' : 'Return to the town',
          exact: true,
        })
        .click();
    if ([2, 6].includes(week)) await readRoom(page, week === 2 ? 1 : 3);
    if (week === 4) {
      await page.getByRole('button', { name: 'Check the room again', exact: true }).click();
      await readRoom(page, 2);
    }
  }
  await expect
    .poll(async () => page.evaluate(() => JSON.parse(window.render_game_to_text!()).compareWeek))
    .toBe(8);
  await page.getByRole('button', { name: 'Look beneath the pattern', exact: true }).click();
  await page.getByRole('button', { name: 'Return to the room', exact: true }).click();
  await readRoom(page, 4);
  await page.getByRole('button', { name: 'About the experiment', exact: true }).click();
  await expect(
    page.getByRole('dialog', { name: 'Sources & model notes', exact: true }),
  ).toContainText('invented town');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Replay the story', exact: true }).click();
  await expect(page.locator('#start-btn')).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(window.render_game_to_text!()).turn)).toBe(0);
  expect(errors).toEqual([]);
});
