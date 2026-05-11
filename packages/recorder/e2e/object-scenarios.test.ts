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

test.describe("object-state scenarios", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(recordButton(page, START_BUTTON_TEXT)).toBeVisible();
  });

  test("partial field update renders only the changed leaf path", async ({ page }) => {
    await recordCycle(page, async () => {
      await clickTimes(page, SCENARIO_BUTTON.OBJECT_PARTIAL_UPDATE, 1);
    });

    const result = recorderByTestId(page, "component-filter-result");
    await expect(result).toContainText("ObjectPartialUpdateButton hook[0] State: changed paths:");
    await expect(result).toContainText("x: 0 → 1");
    await expect(result).not.toContainText('"y":0');
  });

  test("same-value setState is flagged as (equal)", async ({ page }) => {
    await recordCycle(page, async () => {
      await clickTimes(page, SCENARIO_BUTTON.OBJECT_SAME_VALUE, 1);
    });

    const result = recorderByTestId(page, "component-filter-result");
    await expect(result).toContainText("ObjectSameValueButton hook[0] State: (equal)");
  });

  test("function-ref churn is flagged as (equal — only function refs differ)", async ({ page }) => {
    await recordCycle(page, async () => {
      await clickTimes(page, SCENARIO_BUTTON.OBJECT_FUNCTION_REF, 1);
    });

    const result = recorderByTestId(page, "component-filter-result");
    await expect(result).toContainText(
      "ObjectFunctionRefButton hook[0] State: (equal — only function refs differ)",
    );
  });
});
