import { expect, test } from "@playwright/test";

import {
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
        await page.getByTestId(SCENARIO_BUTTON.UPDATE).click();
        await page.getByTestId(SCENARIO_BUTTON.UPDATE).click();
      });
      await expectRecorderCommitCount(page, 2);
    });

    test("hook history shows the state increment", async ({ page }) => {
      await recordCycle(page, async () => {
        await page.getByTestId(SCENARIO_BUTTON.UPDATE).click();
      });
      const result = recorderByTestId(page, "component-filter-result");
      await expect(result).toContainText("Component UpdateButton");
      await expect(result).toContainText("Hook 0 (State)");
      await expect(result).toContainText("Commit 1: 0 -> 1");
    });
  });

  test.describe("Double render · useLayoutEffect", () => {
    test("records 2 commits per click (sync follow-up)", async ({ page }) => {
      await recordCycle(page, async () => {
        await page.getByTestId(SCENARIO_BUTTON.DOUBLE_LAYOUT_EFFECT).click();
      });
      await expectRecorderCommitCount(page, 2);
    });

    test("hook history tracks both state hooks across the two commits", async ({ page }) => {
      await recordCycle(page, async () => {
        await page.getByTestId(SCENARIO_BUTTON.DOUBLE_LAYOUT_EFFECT).click();
      });
      const result = recorderByTestId(page, "component-filter-result");
      await expect(result).toContainText("Component DoubleUpdateLayoutEffectButton");
      await expect(result).toContainText("Hook 0 (State)");
      await expect(result).toContainText("Hook 1 (State)");
      await expect(result).toContainText("Commit 1: 0 -> 1");
      await expect(result).toContainText("Commit 2: 1 -> 2");
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
      await expect(result).toContainText("Component DoubleUpdateEffectButton");
      await expect(result).toContainText("Hook 0 (State)");
      await expect(result).toContainText("Hook 1 (State)");
    });
  });

  test.describe("Custom hook · state update", () => {
    test("records commits triggered through a reusable hook", async ({ page }) => {
      await recordCycle(page, async () => {
        await page.getByTestId(SCENARIO_BUTTON.CUSTOM_HOOK).click();
        await page.getByTestId(SCENARIO_BUTTON.CUSTOM_HOOK).click();
      });
      await expectRecorderCommitCount(page, 2);
    });

    test("hook history labels the custom hook as the source", async ({ page }) => {
      await recordCycle(page, async () => {
        await page.getByTestId(SCENARIO_BUTTON.CUSTOM_HOOK).click();
      });
      const result = recorderByTestId(page, "component-filter-result");
      await expect(result).toContainText("Component CustomHookButton");
      await expect(result).toContainText("Hook 0 (HookCounter > State)");
      await expect(result).toContainText("Commit 1: 0 -> 1");
    });
  });

  test.describe("Custom hook · useDebugValue", () => {
    test("hook history includes the useDebugValue label", async ({ page }) => {
      await recordCycle(page, async () => {
        await page.getByTestId(SCENARIO_BUTTON.DEBUG_VALUE).click();
      });
      await expectRecorderCommitCount(page, 1);
      const result = recorderByTestId(page, "component-filter-result");
      await expect(result).toContainText("Component DebugValueButton");
      await expect(result).toContainText('DebugCounter("count = 1")');
      await expect(result).toContainText("Commit 1: 0 -> 1");
    });
  });

  test.describe("DOM reference in state", () => {
    test("records the button's HTMLElement as hook value", async ({ page }) => {
      await recordCycle(page, async () => {
        await page.getByTestId(SCENARIO_BUTTON.ELEMENT_ALPHA).click();
      });
      await expectRecorderCommitCount(page, 1);
      const result = recorderByTestId(page, "component-filter-result");
      await expect(result).toContainText("Component ElementStatePanel");
      await expect(result).toContainText(
        "null -> [HTMLElement button#hook-target-alpha.hook-target.alpha.primary]",
      );
    });

    test("records clearing the stored element back to null", async ({ page }) => {
      await recordCycle(page, async () => {
        await page.getByTestId(SCENARIO_BUTTON.ELEMENT_ALPHA).click();
        await page.getByTestId(SCENARIO_BUTTON.ELEMENT_ALPHA).click();
      });
      await expectRecorderCommitCount(page, 2);
      const result = recorderByTestId(page, "component-filter-result");
      await expect(result).toContainText(
        "Commit 1: null -> [HTMLElement button#hook-target-alpha.hook-target.alpha.primary]",
      );
      await expect(result).toContainText(
        "Commit 2: [HTMLElement button#hook-target-alpha.hook-target.alpha.primary] -> null",
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

    test("single-render clicks produce one paint segment per commit", async ({ page }) => {
      await recordCycle(page, async () => {
        await page.getByTestId(SCENARIO_BUTTON.UPDATE).click();
        await page.getByTestId(SCENARIO_BUTTON.UPDATE).click();
      });

      await recorderByTestId(page, "paint-view-toggle-paint").click();

      const segmentResult = recorderByTestId(page, "paint-segment-result");
      await expect(segmentResult).toContainText("Paint 1");
      await expect(segmentResult).toContainText("Paint 2");
      await expect(segmentResult).toContainText("Commit range: 1");
      await expect(segmentResult).toContainText("Commit range: 2");
    });

    test("useLayoutEffect double-render groups both commits into one paint", async ({ page }) => {
      await recordCycle(page, async () => {
        await page.getByTestId(SCENARIO_BUTTON.DOUBLE_LAYOUT_EFFECT).click();
      });

      await recorderByTestId(page, "paint-view-toggle-paint").click();

      const segmentResult = recorderByTestId(page, "paint-segment-result");
      await expect(segmentResult).toContainText("Paint 1");
      await expect(segmentResult).toContainText("Commit range: 1-2");
      await expect(segmentResult).not.toContainText("Paint 2");
    });

    test("shows empty state when recording produced no paint markers", async ({ page }) => {
      await recordCycle(page, async () => {
        await page.getByTestId(SCENARIO_BUTTON.ELEMENT_ALPHA).click();
        await page.getByTestId(SCENARIO_BUTTON.ELEMENT_ALPHA).click();
      });

      await recorderByTestId(page, "paint-view-toggle-paint").click();

      await expect(recorderByTestId(page, "paint-history-empty")).toContainText(
        "기록된 paint marker가 없습니다.",
      );
      await expect(recorderByTestId(page, "paint-segment-result")).toHaveCount(0);
    });
  });
});
