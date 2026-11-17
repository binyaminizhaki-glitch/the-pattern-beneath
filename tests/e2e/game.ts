import { expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

export const state = (page: Page) => page.evaluate(() => JSON.parse(window.render_game_to_text!()));

export async function freezeClock(page: Page) {
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
}

export async function enterTown(page: Page, url = '/') {
  await page.goto(url);
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await page.getByRole('button', { name: 'Skip opening', exact: true }).click();
  await expect.poll(async () => (await state(page)).scene).toBe('TOWN_GAMEPLAY');
}

export async function fit(page: Page) {
  const result = await page.evaluate(() => ({
    width: document.documentElement.scrollWidth,
    height: document.documentElement.scrollHeight,
    viewportWidth: innerWidth,
    viewportHeight: innerHeight,
    clipped: [
      ...document.querySelectorAll<HTMLElement>(
        '.game-header button, #start-btn, .film-controls button, .message-choice, .skip-week, .result-actions button, .closing-actions button',
      ),
    ]
      .filter((el) => el.checkVisibility())
      .filter((el) => {
        const box = el.getBoundingClientRect();
        return (
          box.top < 0 || box.left < 0 || box.bottom > innerHeight + 1 || box.right > innerWidth + 1
        );
      })
      .map((el) => el.textContent || el.getAttribute('aria-label')),
  }));
  expect(result.width).toBeLessThanOrEqual(result.viewportWidth + 1);
  expect(result.height).toBeLessThanOrEqual(result.viewportHeight + 1);
  expect(result.clipped).toEqual([]);
}

export async function accessible(page: Page) {
  const scan = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(
    scan.violations.map(({ id, nodes }) => ({
      id,
      nodes: nodes.map((node) => ({ target: node.target, summary: node.failureSummary })),
    })),
  ).toEqual([]);
}

export async function week(page: Page, narrative: 'equal-agency' | 'hierarchy', turn: number) {
  await page
    .getByRole('button', {
      name: narrative === 'equal-agency' ? 'Let people try' : 'Keep women out',
      exact: true,
    })
    .click();
  await page.getByRole('button', { name: 'Skip animation', exact: true }).click();
  await expect
    .poll(async () => (await state(page)).scene)
    .toBe(turn === 8 ? 'COUNTERFACTUAL_REVEAL' : 'TOWN_GAMEPLAY');
  expect((await state(page)).turn).toBe(turn);
  expect((await state(page)).panel).toBe(null);
  await expect(page.getByRole('dialog')).toHaveCount(0);
}
