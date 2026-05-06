import { expect, test } from "@playwright/test";

import {
  clickTimes,
  expectRecorderCommitCount,
  recordButton,
  recorderByTestId,
  recordCycle,
  START_BUTTON_TEXT,
} from "./helpers/recorder";
import { SCENARIO_BUTTON } from "./helpers/scenario-buttons";

test.describe.configure({ mode: "parallel" });

test.describe("rendering scenarios", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(recordButton(page, START_BUTTON_TEXT)).toBeVisible();
  });

  test.describe("Single render · useState", () => {
    test("records 1 commit per click", async ({ page }) => {
      await recordCycle(page, async () => {
        await clickTimes(page, SCENARIO_BUTTON.UPDATE, 2);
      });
      await expectRecorderCommitCount(page, 2);
    });

    test("commit history shows the state increment", async ({ page }) => {
      await recordCycle(page, async () => {
        await page.getByTestId(SCENARIO_BUTTON.UPDATE).click();
      });
      const result = recorderByTestId(page, "component-filter-result");
      await expect(result).toContainText("UpdateButton hook[0] State");
      await expect(result).toContainText("## Commit 1");
      await expect(result).toContainText("0 → 1");
    });
  });

  test.describe("Double render · useLayoutEffect", () => {
    test("records 2 commits per click (sync follow-up)", async ({ page }) => {
      await recordCycle(page, async () => {
        await page.getByTestId(SCENARIO_BUTTON.DOUBLE_LAYOUT_EFFECT).click();
      });
      await expectRecorderCommitCount(page, 2);
    });

    test("commit history tracks both state hooks across the two commits", async ({ page }) => {
      await recordCycle(page, async () => {
        await page.getByTestId(SCENARIO_BUTTON.DOUBLE_LAYOUT_EFFECT).click();
      });
      const result = recorderByTestId(page, "component-filter-result");
      await expect(result).toContainText("DoubleUpdateLayoutEffectButton hook[0] State");
      await expect(result).toContainText("DoubleUpdateLayoutEffectButton hook[1] State");
      await expect(result).toContainText("## Commit 1");
      await expect(result).toContainText("## Commit 2");
      await expect(result).toContainText("0 → 1");
      await expect(result).toContainText("1 → 2");
    });
  });

  test.describe("Double render · useEffect", () => {
    test("records 2 commits for a single click (passive follow-up)", async ({ page }) => {
      await recordCycle(page, async () => {
        await page.getByTestId(SCENARIO_BUTTON.DOUBLE_EFFECT).click();
      });
      await expectRecorderCommitCount(page, 2);
    });

    test("hook history surfaces both state hooks", async ({ page }) => {
      await recordCycle(page, async () => {
        await page.getByTestId(SCENARIO_BUTTON.DOUBLE_EFFECT).click();
      });
      const result = recorderByTestId(page, "component-filter-result");
      await expect(result).toContainText("DoubleUpdateEffectButton hook[0] State");
      await expect(result).toContainText("DoubleUpdateEffectButton hook[1] State");
    });
  });

  test.describe("Custom hook · state update", () => {
    test("records commits triggered through a reusable hook", async ({ page }) => {
      await recordCycle(page, async () => {
        await clickTimes(page, SCENARIO_BUTTON.CUSTOM_HOOK, 2);
      });
      await expectRecorderCommitCount(page, 2);
    });

    test("commit history labels the custom hook as the source", async ({ page }) => {
      await recordCycle(page, async () => {
        await page.getByTestId(SCENARIO_BUTTON.CUSTOM_HOOK).click();
      });
      const result = recorderByTestId(page, "component-filter-result");
      await expect(result).toContainText("CustomHookButton hook[0] State (in HookCounter)");
      await expect(result).toContainText("## Commit 1");
      await expect(result).toContainText("0 → 1");
    });
  });

  test.describe("Custom hook · useDebugValue", () => {
    test("commit history includes the useDebugValue label", async ({ page }) => {
      await recordCycle(page, async () => {
        await page.getByTestId(SCENARIO_BUTTON.DEBUG_VALUE).click();
      });
      await expectRecorderCommitCount(page, 1);
      const result = recorderByTestId(page, "component-filter-result");
      await expect(result).toContainText("DebugValueButton hook[0] State");
      await expect(result).toContainText('in DebugCounter, debug="count = 1"');
      await expect(result).toContainText("## Commit 1");
      await expect(result).toContainText("0 → 1");
    });
  });

  test.describe("DOM reference in state", () => {
    test("records the button's HTMLElement as hook value", async ({ page }) => {
      await recordCycle(page, async () => {
        await page.getByTestId(SCENARIO_BUTTON.ELEMENT_ALPHA).click();
      });
      await expectRecorderCommitCount(page, 1);
      const result = recorderByTestId(page, "component-filter-result");
      await expect(result).toContainText("ElementStatePanel hook[0] State");
      await expect(result).toContainText(
        "null → [button#hook-target-alpha.hook-target.alpha.primary]",
      );
    });

    test("records clearing the stored element back to null", async ({ page }) => {
      await recordCycle(page, async () => {
        await clickTimes(page, SCENARIO_BUTTON.ELEMENT_ALPHA, 2);
      });
      await expectRecorderCommitCount(page, 2);
      const result = recorderByTestId(page, "component-filter-result");
      await expect(result).toContainText("## Commit 1");
      await expect(result).toContainText(
        "null → [button#hook-target-alpha.hook-target.alpha.primary]",
      );
      await expect(result).toContainText("## Commit 2");
      await expect(result).toContainText(
        "[button#hook-target-alpha.hook-target.alpha.primary] → null",
      );
    });
  });

  test.describe("Paint view", () => {
    test("toggle defaults to By Commit and switches to By Paint on click", async ({ page }) => {
      await recordCycle(page, async () => {
        await page.getByTestId(SCENARIO_BUTTON.UPDATE).click();
      });

      const historyToggle = recorderByTestId(page, "paint-view-toggle-history");
      const paintToggle = recorderByTestId(page, "paint-view-toggle-paint");

      await expect(historyToggle).toHaveAttribute("aria-checked", "true");
      await expect(paintToggle).toHaveAttribute("aria-checked", "false");
      await expect(recorderByTestId(page, "paint-segment-result")).toHaveCount(0);

      await paintToggle.click();

      await expect(historyToggle).toHaveAttribute("aria-checked", "false");
      await expect(paintToggle).toHaveAttribute("aria-checked", "true");
    });

    test("single-render 2 clicks produce one paint segment per commit with hook data", async ({
      page,
    }) => {
      await recordCycle(page, async () => {
        await clickTimes(page, SCENARIO_BUTTON.UPDATE, 2);
      });

      await recorderByTestId(page, "paint-view-toggle-paint").click();

      const segments = recorderByTestId(page, "paint-segment-result").locator("article");
      await expect(segments).toHaveCount(2);

      const paint1 = segments.nth(0);
      await expect(paint1).toContainText("Paint 1");
      await expect(paint1).toContainText("UpdateButton hook[0] State");
      await expect(paint1).toContainText("0 → 1");

      const paint2 = segments.nth(1);
      await expect(paint2).toContainText("Paint 2");
      await expect(paint2).toContainText("1 → 2");
    });

    test("useLayoutEffect 2 clicks produce two paints each grouping a pair of commits with hook data", async ({
      page,
    }) => {
      await recordCycle(page, async () => {
        await clickTimes(page, SCENARIO_BUTTON.DOUBLE_LAYOUT_EFFECT, 2);
      });

      await recorderByTestId(page, "paint-view-toggle-paint").click();

      const segments = recorderByTestId(page, "paint-segment-result").locator("article");
      await expect(segments).toHaveCount(2);

      const paint1 = segments.nth(0);
      await expect(paint1).toContainText("Paint 1");
      await expect(paint1).toContainText("DoubleUpdateLayoutEffectButton hook[0] State");
      await expect(paint1).toContainText("0 → 1");
      await expect(paint1).toContainText("1 → 2");
      await expect(paint1).toContainText("false → true");

      const paint2 = segments.nth(1);
      await expect(paint2).toContainText("Paint 2");
      await expect(paint2).toContainText("2 → 3");
      await expect(paint2).toContainText("3 → 4");
    });

    test("shows empty state when a single click produces no paint marker", async ({ page }) => {
      await recordCycle(page, async () => {
        await page.getByTestId(SCENARIO_BUTTON.UPDATE).click();
      });

      await recorderByTestId(page, "paint-view-toggle-paint").click();

      await expect(recorderByTestId(page, "paint-history-empty")).toContainText(
        "기록된 paint marker가 없습니다.",
      );
      await expect(recorderByTestId(page, "paint-segment-result")).toHaveCount(0);
    });

    test("single-render 3 clicks produce 3 separate paint segments with hook data", async ({
      page,
    }) => {
      await recordCycle(page, async () => {
        await clickTimes(page, SCENARIO_BUTTON.UPDATE, 3);
      });
      await expectRecorderCommitCount(page, 3);

      await recorderByTestId(page, "paint-view-toggle-paint").click();

      const segments = recorderByTestId(page, "paint-segment-result").locator("article");
      await expect(segments).toHaveCount(3);

      const paint1 = segments.nth(0);
      await expect(paint1).toContainText("Paint 1");
      await expect(paint1).toContainText("UpdateButton hook[0] State");
      await expect(paint1).toContainText("0 → 1");

      const paint2 = segments.nth(1);
      await expect(paint2).toContainText("Paint 2");
      await expect(paint2).toContainText("1 → 2");

      const paint3 = segments.nth(2);
      await expect(paint3).toContainText("Paint 3");
      await expect(paint3).toContainText("2 → 3");
    });

    test("useLayoutEffect 3 clicks produce 3 paints each grouping a pair of commits with hook data", async ({
      page,
    }) => {
      await recordCycle(page, async () => {
        await clickTimes(page, SCENARIO_BUTTON.DOUBLE_LAYOUT_EFFECT, 3);
      });
      await expectRecorderCommitCount(page, 6);

      await recorderByTestId(page, "paint-view-toggle-paint").click();

      const segments = recorderByTestId(page, "paint-segment-result").locator("article");
      await expect(segments).toHaveCount(3);

      const paint1 = segments.nth(0);
      await expect(paint1).toContainText("Paint 1");
      await expect(paint1).toContainText("DoubleUpdateLayoutEffectButton hook[0] State");
      await expect(paint1).toContainText("0 → 1");
      await expect(paint1).toContainText("1 → 2");

      const paint2 = segments.nth(1);
      await expect(paint2).toContainText("Paint 2");
      await expect(paint2).toContainText("2 → 3");
      await expect(paint2).toContainText("3 → 4");

      const paint3 = segments.nth(2);
      await expect(paint3).toContainText("Paint 3");
      await expect(paint3).toContainText("4 → 5");
      await expect(paint3).toContainText("5 → 6");
    });
  });
});
