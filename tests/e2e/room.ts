import { expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

export async function readRoom(page: Page, chapter: number, screenshot?: string) {
  await expect(page.getByRole('region', { name: 'Inside the story', exact: true })).toBeVisible();
  const before = await page.evaluate(() => JSON.parse(window.render_game_to_text!()));
  expect(before.room.chapter).toBe(chapter);
  await expect(page.locator('.room-continue')).toBeDisabled();
  for (let object = 0; object < 3; object++) {
    await page.locator('.room-objects button').nth(object).click();
    await expect(page.locator('.room-response .story-quote')).toBeVisible();
  }
  if ([2, 4].includes(chapter)) {
    await expect(page.locator('.room-continue')).toBeDisabled();
    if (chapter === 2)
      await expect(page.locator('.woman-in-paper')).toHaveAttribute('opacity', '0');
    if (chapter === 4)
      await expect(page.locator('.room-response')).not.toContainText("I've got out at last");
    for (let strip = 1; strip <= 3; strip++)
      await page
        .getByRole('button', {
          name: `${chapter === 4 ? 'Pull' : 'Trace'} strip ${strip}`,
          exact: true,
        })
        .click();
    await expect(page.locator('.woman-in-paper')).toHaveAttribute('opacity', '1');
  }
  await expect(page.locator('.room-continue')).toBeEnabled();
  const after = await page.evaluate(() => JSON.parse(window.render_game_to_text!()));
  expect(after.turn).toBe(before.turn);
  expect(after.metrics).toEqual(before.metrics);
  expect(after.citizens).toEqual(before.citizens);
  expect(after.institutions).toEqual(before.institutions);
  const outOfBounds = await page
    .locator('.room-page button, .strip-controls button')
    .evaluateAll((els) =>
      els
        .filter((el) => {
          const box = el.getBoundingClientRect(),
            stage = el.closest('main')!.getBoundingClientRect();
          return (
            box.top < stage.top || box.bottom > stage.bottom + 1 || box.right > stage.right + 1
          );
        })
        .map((el) => el.textContent),
    );
  expect(outOfBounds).toEqual([]);
  if (screenshot) {
    const scan = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(
      scan.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => ({ target: n.target, summary: n.failureSummary })),
      })),
    ).toEqual([]);
    await page.screenshot({ path: `output/screenshots/room-${chapter}-${screenshot}.png` });
  }
  await page.locator('.room-continue').focus();
  await page.keyboard.press('Enter');
}
