import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { initializeWorld, latest, runCounterfactual, stepWorld } from '../../src/sim/engine';
import { citizenDialogue } from '../../src/narrative/story';
import { readRoom } from './room';
async function state(page: Page) {
  return page.evaluate(() => JSON.parse(window.render_game_to_text!()));
}
async function reply(page: Page, topic: string) {
  const button = page.locator(`.dialogue-choices button[data-topic="${topic}"]`);
  const label = await button.innerText();
  await button.click();
  await expect(page.locator('.player-response')).toContainText(label);
}
async function noOverflow(page: Page) {
  expect(
    await page.evaluate(() => ({
      w: document.documentElement.scrollWidth,
      h: document.documentElement.scrollHeight,
      x: scrollX,
      y: scrollY,
    })),
  ).toEqual({ w: page.viewportSize()!.width, h: page.viewportSize()!.height, x: 0, y: 0 });
  expect(
    await page.locator('main .primary').evaluateAll((buttons) =>
      buttons
        .filter((el) => el.getClientRects().length)
        .filter((el) => {
          const box = el.getBoundingClientRect();
          const stage = el.closest('main')!.getBoundingClientRect();
          return (
            box.bottom > stage.bottom + 1 ||
            box.top < stage.top - 1 ||
            box.right > stage.right + 1 ||
            box.left < stage.left - 1
          );
        })
        .map((el) => el.textContent),
    ),
  ).toEqual([]);
}
async function accessible(page: Page) {
  if (await page.locator('.narrative-scene').count())
    await expect(page.locator('.narrative-scene')).toHaveCSS('opacity', '1');
  const scan = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(scan.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) }))).toEqual(
    [],
  );
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
}
async function enter(page: Page, screenshots?: string) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Enter the Story', exact: true }).click();
  await readRoom(page, 0, screenshots);
  await expect.poll(async () => (await state(page)).scene).toBe('PROLOGUE');
  await noOverflow(page);
  if (screenshots) {
    await accessible(page);
    await page.screenshot({ path: `output/screenshots/story-prologue-${screenshots}.png` });
  }
  await page.getByRole('button', { name: /Natural differences/ }).click();
  await expect(page.getByRole('dialog', { name: 'A phrase in the margin' })).toContainText(
    'printed 3 works by women and 11 by men',
  );
  await page
    .getByRole('button', { name: 'The figures do not prove that headline.', exact: true })
    .click();
  await expect(page.getByRole('dialog', { name: 'A phrase in the margin' })).toContainText(
    'what explanation would you print',
  );
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Meet Clara', exact: true }).click();
  await page.getByRole('button', { name: 'Examine her manuscript' }).click();
  await expect(page.getByRole('dialog', { name: 'The manuscript', exact: true })).toContainText(
    'manuscript',
  );
  await page.keyboard.press('Escape');
  await noOverflow(page);
  await page.getByRole('button', { name: 'Speak with Clara', exact: true }).click();
  await noOverflow(page);
  const before = (await state(page)).metrics;
  await reply(page, 'ambition');
  await expect(page.locator('.dialogue-stage blockquote')).toContainText('one small mistake');
  await reply(page, 'rules');
  await expect(page.locator('.dialogue-stage blockquote')).toContainText('School admitted');
  await reply(page, 'work');
  await reply(page, 'challenge');
  await reply(page, 'evidence');
  expect((await state(page)).metrics).toEqual(before);
  if (screenshots) {
    await accessible(page);
    await page.screenshot({ path: `output/screenshots/story-clara-${screenshots}.png` });
  }
  await page.getByRole('button', { name: 'Step into Vesper', exact: true }).click();
}
async function choose(
  page: Page,
  narrative: 'hierarchy' | 'equal-agency',
  channel: 'clinic' | 'gazette' | 'community',
) {
  if (page.viewportSize()!.width < 700) {
    await page.getByLabel('Choose a narrative', { exact: true }).selectOption(narrative);
    await page.getByLabel('Choose a messenger', { exact: true }).selectOption(channel);
  } else {
    await page.locator(`input[name="narrative"][value="${narrative}"]`).check();
    await page.locator(`input[name="channel"][value="${channel}"]`).check();
  }
}
async function closeMidpoint(page: Page, week: number) {
  if ([1, 2, 3, 5, 6, 7].includes(week)) {
    await expect.poll(async () => (await state(page)).scene).toBe('CHARACTER_ENCOUNTER');
    await expect(
      page.getByRole('heading', {
        name: week === 1 || week === 6 ? 'Henry Bell' : week === 3 ? 'Benjamin Grey' : 'Clara Vale',
        exact: true,
      }),
    ).toBeVisible();
    await noOverflow(page);
    const before = (await state(page)).metrics;
    await reply(page, 'challenge');
    await reply(page, 'rules');
    await noOverflow(page);
    expect((await state(page)).metrics).toEqual(before);
    await page
      .getByRole('button', {
        name: [2, 6].includes(week) ? 'Back to the upstairs room' : 'Return to the town',
        exact: true,
      })
      .click();
    if ([2, 6].includes(week))
      await readRoom(page, week === 2 ? 1 : 3, `${page.viewportSize()!.width}`);
  }
  if (week === 4) {
    await expect.poll(async () => (await state(page)).scene).toBe('STORY_TURNING_POINT');
    await noOverflow(page);
    await page.getByRole('button', { name: 'Check the room again', exact: true }).click();
    await readRoom(page, 2, `${page.viewportSize()!.width}`);
  }
}
async function skipWeek(page: Page, week: number, quiet = false) {
  await page
    .getByRole('button', {
      name: quiet
        ? 'Advance a quiet week with no intervention'
        : 'Release narrative and advance one week',
      exact: true,
    })
    .click();
  await page.getByRole('button', { name: 'Skip animation', exact: true }).click();
  await expect.poll(async () => (await state(page)).busy).toBe(false);
  await closeMidpoint(page, week);
}

test('single-screen eight-week experience, real animation, inspection and cinematic comparison', async ({
  page,
}, info) => {
  // Five literary scenes add interactions and Axe scans to the complete town path.
  test.setTimeout(180_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.clock.install({ time: new Date('2026-10-25T10:00:00Z') });
  await page.goto('/');
  await noOverflow(page);
  await accessible(page);
  await expect(page.getByRole('button', { name: 'Enable ambience', exact: true })).toHaveAttribute(
    'aria-pressed',
    'false',
  );
  await page.getByRole('button', { name: 'Enable ambience', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Mute ambience', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.getByRole('button', { name: 'Mute ambience', exact: true }).click();
  await page.screenshot({ path: `output/screenshots/immersive-cover-${info.project.name}.png` });
  await enter(page, info.project.name);
  await noOverflow(page);
  await accessible(page);
  const initial = (await state(page)).metrics;
  await choose(page, 'hierarchy', 'clinic');
  await choose(page, 'equal-agency', 'community');
  await choose(page, 'equal-agency', 'gazette');
  expect((await state(page)).metrics).toEqual(initial);
  // Freeze only the first cinematic so host load cannot skip its short inspection windows.
  await page.clock.pauseAt(new Date('2026-10-25T12:00:00Z'));
  await page.getByRole('button', { name: 'Release narrative and advance one week' }).click();
  await expect(page.locator('.broadcast-lines path').first()).toBeAttached();
  await page.clock.runFor(401);
  await expect.poll(async () => (await state(page)).phase).toBe(1);
  expect(await page.locator('.active-link').count()).toBeGreaterThan(0);
  await page.clock.runFor(650);
  await expect.poll(async () => (await state(page)).phase).toBe(2);
  await expect(page.locator('.causality-toast')).toContainText('citizens revised their beliefs');
  expect((await state(page)).metrics).toEqual(initial);
  await page.clock.runFor(650);
  await expect.poll(async () => (await state(page)).phase).toBe(3);
  await expect(page.locator('.building-reaction').first()).toBeAttached();
  await page.clock.runFor(600);
  await expect.poll(async () => (await state(page)).phase).toBe(4);
  await expect(page.locator('.world-event text').first()).toContainText(/seminar|writing/);
  await page.screenshot({
    path: `output/screenshots/immersive-causality-${info.project.name}.png`,
  });
  await noOverflow(page);
  await page.clock.runFor(800);
  await expect.poll(async () => (await state(page)).phase).toBe(5);
  expect((await state(page)).metrics).toEqual(
    latest(stepWorld(initializeWorld(42), { narrative: 'equal-agency', channel: 'gazette' }))
      .metrics,
  );
  await page.clock.runFor(550);
  await expect.poll(async () => (await state(page)).phase).toBe(6);
  await page.clock.runFor(550);
  await expect.poll(async () => (await state(page)).busy).toBe(false);
  await page.clock.resume();
  await closeMidpoint(page, 1);
  for (let week = 2; week <= 8; week++) {
    if (week === 2) await choose(page, 'equal-agency', 'community');
    if (week === 3) await choose(page, 'equal-agency', 'clinic');
    if (week === 4) await choose(page, 'equal-agency', 'gazette');
    await skipWeek(page, week);
    await noOverflow(page);
    if (week === 3) {
      if (page.viewportSize()!.width >= 700) {
        const sidebar = await page.locator('.control-panel').boundingBox();
        const record = await page.locator('.followed-week').boundingBox();
        expect(record!.y + record!.height).toBeLessThanOrEqual(sidebar!.y + sidebar!.height);
      }
      await page.screenshot({ path: `output/screenshots/immersive-town-${info.project.name}.png` });
      await page.getByLabel('Follow a citizen', { exact: true }).selectOption('citizen-4');
      await expect(page.getByRole('dialog', { name: 'Citizen profile' })).toBeVisible();
      await page.screenshot({
        path: `output/screenshots/immersive-profile-${info.project.name}.png`,
      });
      await noOverflow(page);
      await page.getByRole('button', { name: 'Open the decision ledger', exact: true }).click();
      await expect(page.getByText('Unmeasured by the town', { exact: true })).toBeVisible();
      await accessible(page);
      await page.keyboard.press('Escape');
      await page.getByRole('button', { name: 'Close inspector', exact: true }).click();
      await page.getByRole('button', { name: /Inspect Vesper School/ }).click();
      await expect(page.getByRole('dialog', { name: 'Institution inspector' })).toContainText(
        '75%',
      );
      await page.keyboard.press('Escape');
      await page.getByRole('button', { name: 'Inspect week 1', exact: true }).click();
      await expect(
        page.getByRole('button', { name: 'Release narrative and advance one week' }),
      ).toBeDisabled();
      await page.getByRole('button', { name: 'Return to the present', exact: true }).click();
      await page.getByRole('button', { name: 'Zoom into town' }).click();
      await page.getByRole('button', { name: 'Zoom out of town' }).click();
    }
  }
  await expect.poll(async () => (await state(page)).compareWeek).toBe(8);
  await expect.poll(async () => (await state(page)).revealSeen).toBe(true);
  await expect(page.getByRole('heading', { name: /The abilities did not change/ })).toBeVisible();
  await noOverflow(page);
  await accessible(page);
  await page.screenshot({ path: `output/screenshots/immersive-reveal-${info.project.name}.png` });
  await page.getByRole('button', { name: 'See both paths', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Citizen profile' })).toContainText('Unchanged');
  await expect(page.locator('.path-record')).toHaveCount(2);
  await noOverflow(page);
  await page.getByRole('button', { name: 'Close inspector' }).click();
  if (info.project.name === 'mobile-390') {
    await page.getByRole('button', { name: 'No intervention', exact: true }).click();
    await expect(page.locator('.baseline-world')).toBeVisible();
    await page.getByRole('button', { name: 'Your town', exact: true }).click();
  }
  await page.getByRole('button', { name: 'Inspect the evidence', exact: true }).click();
  await expect(page.getByRole('table')).toBeVisible();
  await page.getByRole('button', { name: 'The unchanged aptitude' }).click();
  await expect(page.locator('.evidence-overlay tbody tr')).toHaveCount(24);
  await noOverflow(page);
  await accessible(page);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Look beneath the pattern', exact: true }).click();
  await expect.poll(async () => (await state(page)).scene).toBe('PATTERN_REVEAL');
  await expect(page.locator('.causal-chain li')).toHaveCount(8);
  await expect(page.locator('.peeling-surface')).toHaveCSS('opacity', '0');
  await noOverflow(page);
  await accessible(page);
  await page.screenshot({ path: `output/screenshots/cinema-pattern-${info.project.name}.png` });
  await page.getByRole('button', { name: 'Return to the room', exact: true }).click();
  await readRoom(page, 4, info.project.name);
  await expect.poll(async () => (await state(page)).scene).toBe('LITERARY_EPILOGUE');
  await expect(page.getByRole('region', { name: 'Literary epilogue' })).toContainText(
    'Her sense of reality has changed',
  );
  await noOverflow(page);
  await accessible(page);
  await page.screenshot({ path: `output/screenshots/story-epilogue-${info.project.name}.png` });
  await page.getByRole('button', { name: 'Review the two towns', exact: true }).click();
  await page.getByRole('button', { name: 'Sources and model notes' }).click();
  await expect(page.getByRole('link', { name: /The Yellow Wall-Paper, 1892/ })).toHaveAttribute(
    'href',
    /nlm.nih.gov/,
  );
  await noOverflow(page);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Try the opposite narrative' }).click();
  expect((await state(page)).turn).toBe(0);
  expect((await state(page)).choices.narrative).toBe('hierarchy');
  await noOverflow(page);
  expect(errors).toEqual([]);
});
test('keyboard focus, duplicate protection, reduced motion and reset stay inside the stage', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await enter(page);
  const help = page.getByRole('button', { name: 'How to play', exact: true });
  await help.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog', { name: 'How to play' })).toBeVisible();
  await accessible(page);
  await page.keyboard.press('Escape');
  await expect(help).toBeFocused();
  await choose(page, 'hierarchy', 'gazette');
  const release = page.getByRole('button', { name: 'Release narrative and advance one week' });
  await release.dblclick({ force: true });
  expect((await state(page)).turn).toBe(1);
  await expect(page.locator('.release-button')).toBeDisabled();
  await page.getByRole('button', { name: 'Skip animation' }).focus();
  await page.keyboard.press('Enter');
  expect((await state(page)).turn).toBe(1);
  await closeMidpoint(page, 1);
  await page.getByLabel('Follow a citizen', { exact: true }).focus();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  if (await page.getByRole('dialog', { name: 'Citizen profile' }).count())
    await page.keyboard.press('Escape');
  await page.mouse.wheel(0, 1000);
  await noOverflow(page);
  expect(
    await page
      .locator('.person-idle')
      .first()
      .evaluate((el) => getComputedStyle(el).animationName),
  ).toBe('none');
  await page.getByRole('button', { name: 'Restart experiment', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Enter the Story', exact: true })).toBeVisible();
  await noOverflow(page);
  await page.reload();
  expect((await state(page)).turn).toBe(0);
});
test('eight quiet weeks exactly match the passive world without any remote runtime request', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const remote: string[] = [];
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (!['127.0.0.1', 'localhost'].includes(url.hostname)) {
      remote.push(url.hostname);
      await route.abort();
    } else await route.continue();
  });
  await enter(page);
  for (let week = 1; week <= 8; week++) await skipWeek(page, week, true);
  await expect.poll(async () => (await state(page)).compareWeek).toBe(8);
  expect((await state(page)).metrics).toEqual(latest(runCounterfactual(42)).metrics);
  expect(remote).toEqual([]);
  await noOverflow(page);
  await page.getByRole('button', { name: 'Replay comparison' }).click();
  await expect.poll(async () => (await state(page)).compareWeek).toBe(8);
  await noOverflow(page);
  await page.getByRole('button', { name: 'Restart same town', exact: true }).click();
  expect((await state(page)).turn).toBe(0);
  await noOverflow(page);
});
test('a restrictive eight-week story follows its own recorded consequences', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await enter(page);
  await choose(page, 'hierarchy', 'gazette');
  let expected = initializeWorld(42);
  for (let week = 1; week <= 8; week++) {
    expected = stepWorld(expected, { narrative: 'hierarchy', channel: 'gazette' });
    await page
      .getByRole('button', { name: 'Release narrative and advance one week', exact: true })
      .click();
    await page.getByRole('button', { name: 'Skip animation', exact: true }).click();
    if ([2, 5, 7].includes(week)) {
      await expect(page.locator('.dialogue-stage blockquote')).toContainText(
        citizenDialogue(latest(expected), 'citizen-0', 'situation'),
      );
    }
    await closeMidpoint(page, week);
    await noOverflow(page);
  }
  await expect.poll(async () => (await state(page)).compareWeek).toBe(8);
  expect((await state(page)).metrics).toEqual(latest(expected).metrics);
  expect((await state(page)).metrics.restrictions).toBeGreaterThan(0.6);
  await page.getByRole('button', { name: 'Look beneath the pattern', exact: true }).click();
  await page.getByRole('button', { name: 'Return to the room', exact: true }).click();
  await readRoom(page, 4);
  await noOverflow(page);
  await page.getByRole('button', { name: 'Try the other story', exact: true }).click();
  expect((await state(page)).choices.narrative).toBe('equal-agency');
  expect((await state(page)).turn).toBe(0);
});
test('conversations offer challenges and evidence in each character’s own voice', async ({
  page,
}, info) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await enter(page);
  const unchanged = await state(page);
  for (const name of ['The Clinic', 'The Gazette', 'Vesper School']) {
    await page.getByRole('button', { name: new RegExp(`Inspect ${name}:`) }).click();
    await page.getByRole('button', { name: 'Hear the representative', exact: true }).click();
    const actor = await page.locator('.dialogue-stage h1').innerText();
    for (const topic of ['challenge', 'evidence', 'work', 'rules', 'ambition']) {
      await reply(page, topic);
      await noOverflow(page);
      const box = await page.locator('.dialogue-stage').boundingBox();
      const stage = await page.locator('main').boundingBox();
      expect(box!.y).toBeGreaterThanOrEqual(stage!.y);
      expect(box!.y + box!.height).toBeLessThanOrEqual(stage!.y + stage!.height);
      if (topic === 'evidence')
        await page.screenshot({
          path: `output/screenshots/dialogue-${actor.split(' ')[0].toLowerCase()}-${info.project.name}.png`,
        });
    }
    await page.keyboard.press('Tab');
    await expect(page.locator('.dialogue-choices button').first()).toBeFocused();
    await accessible(page);
    await page.getByRole('button', { name: 'Step into Vesper', exact: true }).click();
  }
  const after = await state(page);
  expect(after.turn).toBe(unchanged.turn);
  expect(after.metrics).toEqual(unchanged.metrics);
  expect(after.institutions).toEqual(unchanged.institutions);
  expect(after.citizens).toEqual(unchanged.citizens);
});
