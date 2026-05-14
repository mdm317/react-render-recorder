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

  test("history view shows ## Summary with the count line (plural)", async ({ page }) => {
    await recordCycle(page, async () => {
      await clickTimes(page, SCENARIO_BUTTON.UPDATE, 2);
    });

    const result = recorderByTestId(page, "component-filter-result");
    await expect(result).toContainText("## Summary");
    await expect(result).toContainText("2 commits, 1 component with hook changes");
  });

  test("history view count line uses singular for 1 commit / 1 component", async ({ page }) => {
    await recordCycle(page, async () => {
      await clickTimes(page, SCENARIO_BUTTON.UPDATE, 1);
    });

    const result = recorderByTestId(page, "component-filter-result");
    await expect(result).toContainText("## Summary");
    await expect(result).toContainText("1 commit, 1 component with hook changes");
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
      await expect(segment).toContainText("1 commit, 1 component with hook changes");
    }
  });

  test("history view totals line counts hook-changed-only renders for hook-only scenarios", async ({
    page,
  }) => {
    await recordCycle(page, async () => {
      await clickTimes(page, SCENARIO_BUTTON.UPDATE, 2);
    });

    const result = recorderByTestId(page, "component-filter-result");
    await expect(result).toContainText(
      new RegExp(`2 total rerenders, ${DURATION_PATTERN} total render time`),
    );
  });

  test("history view totals line includes render-by-parent (no hook change) components", async ({
    page,
  }) => {
    await recordCycle(page, async () => {
      await clickTimes(page, SCENARIO_BUTTON.RENDER_BY_PARENT, 1);
    });

    const result = recorderByTestId(page, "component-filter-result");
    // 1 commit, but 4 components render (RenderByParentButton + 3 static leaves).
    // Only RenderByParentButton has a hook change — totals must still count all 4.
    await expect(result).toContainText("1 commit, 1 component with hook changes");
    await expect(result).toContainText(
      new RegExp(`4 total rerenders, ${DURATION_PATTERN} total render time`),
    );
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
      await expect(segment).toContainText("2 commits, 1 component with hook changes");
    }
  });
});
