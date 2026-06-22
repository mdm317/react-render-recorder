import { expect, test } from "@playwright/test";

import {
  clickTimes,
  recordButton,
  recorderByTestId,
  recordCycle,
  START_BUTTON_TEXT,
} from "./helpers/recorder";
import { SCENARIO_BUTTON } from "./helpers/scenario-buttons";

test.describe.configure({ mode: "parallel" });

const DURATION_PATTERN = "[\\d.]+(?:s|ms|μs)";

test.describe("summary header", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(recordButton(page, START_BUTTON_TEXT)).toBeVisible();
  });

  test("history view shows ## Summary with the count line", async ({ page }) => {
    await recordCycle(page, async () => {
      await clickTimes(page, SCENARIO_BUTTON.UPDATE, 2);
    });

    const result = recorderByTestId(page, "commit-history-result");
    await expect(result).toContainText("## Summary");
    await expect(result).toContainText("2 commits, 2 components rerendered");
  });

  test("history view count line for a single commit", async ({ page }) => {
    await recordCycle(page, async () => {
      await clickTimes(page, SCENARIO_BUTTON.UPDATE, 1);
    });

    const result = recorderByTestId(page, "commit-history-result");
    await expect(result).toContainText("## Summary");
    await expect(result).toContainText("1 commits, 1 components rerendered");
  });

  test("paint view shows ## Summary with a count line per segment", async ({ page }) => {
    await recordCycle(page, async () => {
      await clickTimes(page, SCENARIO_BUTTON.UPDATE, 2);
    });

    await recorderByTestId(page, "paint-view-toggle-paint").click();

    const segments = recorderByTestId(page, "paint-segment-result").locator("article");
    await expect(segments).toHaveCount(2);

    for (const i of [0, 1]) {
      const segment = segments.nth(i);
      await expect(segment).toContainText("## Summary");
      await expect(segment).toContainText("1 commits, 1 components rerendered");
    }
  });

  test("history view render time line shows total render time", async ({ page }) => {
    await recordCycle(page, async () => {
      await clickTimes(page, SCENARIO_BUTTON.UPDATE, 2);
    });

    const result = recorderByTestId(page, "commit-history-result");
    await expect(result).toContainText(new RegExp(`${DURATION_PATTERN} total render time`));
  });

  test("count line counts only hook-changed components, not parent-driven leaves", async ({
    page,
  }) => {
    await recordCycle(page, async () => {
      await clickTimes(page, SCENARIO_BUTTON.RENDER_BY_PARENT, 1);
    });

    const result = recorderByTestId(page, "commit-history-result");
    // 1 commit in which 4 components render (RenderByParentButton + 3 static
    // leaves), but only RenderByParentButton has a hook change, so the count
    // line counts just the 1 hook-changed component.
    await expect(result).toContainText("1 commits, 1 components rerendered");
    await expect(result).toContainText(new RegExp(`${DURATION_PATTERN} total render time`));
  });

  test("paint view count line reflects multi-commit segments", async ({ page }) => {
    await recordCycle(page, async () => {
      await clickTimes(page, SCENARIO_BUTTON.DOUBLE_LAYOUT_EFFECT, 2);
    });

    await recorderByTestId(page, "paint-view-toggle-paint").click();

    const segments = recorderByTestId(page, "paint-segment-result").locator("article");
    await expect(segments).toHaveCount(2);

    for (const i of [0, 1]) {
      const segment = segments.nth(i);
      await expect(segment).toContainText("## Summary");
      await expect(segment).toContainText("2 commits, 2 components rerendered");
    }
  });
});
