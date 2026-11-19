import { test, expect } from '@playwright/test';
import { initializeWorld, latest, runCounterfactual, stepWorld } from '../../src/sim/engine';
import { PHASES } from '../../src/presentation/causality';
import { accessible, enterTown, fit, freezeClock, state, week } from './game';

test('Start plays the complete cinematic opening automatically without changing the town', async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.clock.install();
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /THE PATTERN.*BENEATH/s })).toBeVisible();
  await fit(page);
  await accessible(page);
  await page.screenshot({ path: `output/screenshots/cinematic-cover-${info.project.name}.png` });
  const before = await state(page);
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Mute ambience', exact: true })).toBeVisible();
  const durations = [7000, 8000, 6000, 6000, 4000];
  for (let beat = 0; beat < 5; beat++) {
    expect((await state(page)).intro.beat).toBe(beat);
    if (beat < 4) {
      await expect(page.locator('.film-quote blockquote')).toHaveCount(1);
      await expect(page.locator('.film-quote a')).toHaveAttribute(
        'href',
        /sources\/the-yellow-wall-paper-1892\.pdf#page=/,
      );
    }
    await fit(page);
    if (beat === 0 || beat === 3) {
      await accessible(page);
      await page.screenshot({
        path: `output/screenshots/cinematic-intro-${beat}-${info.project.name}.png`,
      });
    }
    await page.clock.runFor(durations[beat]);
  }
  await expect.poll(async () => (await state(page)).scene).toBe('TOWN_GAMEPLAY');
  const after = await state(page);
  expect(after.turn).toBe(0);
  expect(after.metrics).toEqual(before.metrics);
  expect(after.citizens).toEqual(before.citizens);
  await expect(page.locator('.message-actions button')).toHaveCount(2);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('eight direct choices animate real records without intermediate scenes or popups', async ({
  page,
}, info) => {
  await page.clock.install();
  await enterTown(page);
  await fit(page);
  await accessible(page);
  await page.screenshot({ path: `output/screenshots/cinematic-town-${info.project.name}.png` });
  const pan = page.getByRole('button', { name: 'Look right across town', exact: true });
  if (await pan.isVisible()) {
    const start = await page.locator('.town-view').evaluate((el) => el.scrollLeft);
    const distance = page.viewportSize()!.width * 0.75;
    await pan.click();
    await expect
      .poll(() =>
        page
          .locator('.town-view')
          .evaluate((el, target) => Math.abs(el.scrollLeft - target), start + distance),
      )
      .toBeLessThanOrEqual(1);
    await page.getByRole('button', { name: 'Look left across town', exact: true }).click();
    await expect
      .poll(() =>
        page
          .locator('.town-view')
          .evaluate((el, target) => Math.abs(el.scrollLeft - target), start),
      )
      .toBeLessThanOrEqual(1);
  }
  // Native smooth scrolling uses the compositor clock, not the mocked JS clock.
  // Freeze only the simulation phases, after the real scrolling has settled.
  await freezeClock(page);
  let expected = initializeWorld(42);
  await page.getByRole('button', { name: 'Let people try', exact: true }).click();
  expected = stepWorld(expected, { narrative: 'equal-agency', channel: 'gazette' });
  for (let phase = 0; phase < 7; phase++) {
    expect((await state(page)).phase).toBe(phase);
    await expect(page.getByRole('button', { name: 'Let people try', exact: true })).toBeDisabled();
    await expect(page.locator('.world-event')).toHaveCount(0);
    if (phase < 5) expect((await state(page)).metrics).toEqual(latest(initializeWorld(42)).metrics);
    if (phase === 4)
      await page.screenshot({
        path: `output/screenshots/cinematic-action-${info.project.name}.png`,
      });
    await page.clock.runFor(PHASES[phase].duration);
  }
  await page.clock.resume();
  await expect.poll(async () => (await state(page)).scene).toBe('TOWN_GAMEPLAY');
  for (let turn = 2; turn <= 8; turn++) {
    const narrative = turn % 3 === 0 ? 'hierarchy' : 'equal-agency';
    expected = stepWorld(expected, { narrative, channel: 'gazette' });
    await week(page, narrative, turn);
    await fit(page);
  }
  const end = await state(page);
  expect(end.metrics).toEqual(latest(expected).metrics);
  expect(end.choices.channel).toBe('gazette');
  expect(end.citizens.map((person: { baseAptitude: number }) => person.baseAptitude)).toEqual(
    latest(initializeWorld(42)).agents.map((agent) => agent.baseAptitude),
  );
  const passive = runCounterfactual(42);
  expect(end.comparison.actual).toBe(
    expected.snapshots.slice(1).reduce((sum, snap) => sum + snap.metrics.womenPublished, 0),
  );
  expect(end.comparison.passive).toBe(
    passive.snapshots.slice(1).reduce((sum, snap) => sum + snap.metrics.womenPublished, 0),
  );
  await accessible(page);
  await page.screenshot({
    path: `output/screenshots/cinematic-comparison-${info.project.name}.png`,
  });
  const tabs = page.getByRole('group', { name: 'Choose comparison town' });
  if (await tabs.isVisible()) {
    await tabs.getByRole('button', { name: 'No intervention', exact: true }).click();
    await expect(page.getByRole('region', { name: 'No intervention', exact: true })).toBeVisible();
    await tabs.getByRole('button', { name: 'Your town', exact: true }).click();
  }
  await page.getByRole('button', { name: 'Details', exact: true }).click();
  await expect(page.getByRole('table')).toContainText('Published works by week');
  await accessible(page);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Back in the room', exact: true })).toBeVisible();
  await expect(page.locator('.ending-engraving img')).toHaveAttribute(
    'src',
    './sources/ending-illustration.png',
  );
  await fit(page);
  await accessible(page);
  await page.clock.runFor(2200);
  await page.screenshot({ path: `output/screenshots/cinematic-ending-${info.project.name}.png` });
  await page.getByRole('button', { name: 'Compare towns', exact: true }).click();
  expect((await state(page)).turn).toBe(8);
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: 'Play again', exact: true }).click();
  await expect(page.locator('#start-btn')).toBeVisible();
  expect((await state(page)).turn).toBe(0);
});

test('records and sources are optional, keyboard accessible and cannot change outcomes', async ({
  page,
}) => {
  await enterTown(page);
  const before = await state(page);
  const records = page.getByRole('button', { name: 'Records', exact: true });
  await records.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog', { name: 'Clara Vale', exact: true })).toBeVisible();
  await expect(page.locator('.short-record-table tbody tr')).toHaveCount(4);
  await accessible(page);
  await page.getByRole('combobox', { name: 'Citizen', exact: true }).selectOption('citizen-5');
  await expect(page.getByRole('dialog', { name: 'Henry Bell', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(records).toBeFocused();
  for (const building of ['Vesper School', 'The Clinic', 'The Gazette']) {
    const target = page.getByRole('button', { name: new RegExp(`Inspect ${building}:`) });
    await target.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog', { name: building, exact: true })).toBeVisible();
    await accessible(page);
    await page.keyboard.press('Escape');
    await expect(target).toBeFocused();
  }
  const source = page.getByRole('button', { name: 'Sources', exact: true });
  await source.focus();
  await page.keyboard.press('Enter');
  await expect(
    page.getByRole('link', { name: 'Read the original story (PDF)', exact: true }),
  ).toHaveAttribute('href', './sources/the-yellow-wall-paper-1892.pdf');
  await accessible(page);
  await page.keyboard.press('Escape');
  await expect(source).toBeFocused();
  const after = await state(page);
  expect(after.metrics).toEqual(before.metrics);
  expect(after.institutions).toEqual(before.institutions);
  expect(after.citizens).toEqual(before.citizens);
  expect(after.turn).toBe(0);
});

test('pause, hidden tabs, skip, duplicate clicks and restart never leave delayed actions', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.clock.install();
  await page.goto('/');
  await freezeClock(page);
  await page.locator('#start-btn').click();
  await page.clock.runFor(1500);
  await page.getByRole('button', { name: 'Pause opening', exact: true }).click();
  await page.clock.runFor(20000);
  expect((await state(page)).intro.beat).toBe(0);
  await page.getByRole('button', { name: 'Resume opening', exact: true }).click();
  await page.clock.runFor(5500);
  expect((await state(page)).intro.beat).toBe(1);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.clock.runFor(12000);
  expect((await state(page)).intro.beat).toBe(1);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.getByRole('button', { name: 'Sources', exact: true }).click();
  await page.clock.runFor(15000);
  expect((await state(page)).intro.beat).toBe(1);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Skip opening', exact: true }).click();
  await page.clock.runFor(40000);
  expect((await state(page)).scene).toBe('TOWN_GAMEPLAY');
  expect((await state(page)).turn).toBe(0);
  await page.getByRole('button', { name: 'Keep women out', exact: true }).dblclick({ force: true });
  expect((await state(page)).turn).toBe(1);
  await page.getByRole('button', { name: 'Restart game', exact: true }).click();
  await page.clock.runFor(40000);
  expect((await state(page)).scene).toBe('TITLE');
  expect((await state(page)).turn).toBe(0);
  await page.locator('#start-btn').click();
  await page.getByRole('button', { name: 'Skip opening', exact: true }).click();
  await page.getByRole('button', { name: 'Let people try', exact: true }).click();
  for (const { duration } of PHASES) await page.clock.runFor(duration + 20);
  expect((await state(page)).scene).toBe('TOWN_GAMEPLAY');
  expect((await state(page)).turn).toBe(1);
  await fit(page);
});
