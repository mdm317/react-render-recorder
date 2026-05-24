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

test.describe("commit history view options", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(recordButton(page, START_BUTTON_TEXT)).toBeVisible();
  });

  test("default view shows component headers without inline timing", async ({ page }) => {
    await recordCycle(page, async () => {
      await clickTimes(page, SCENARIO_BUTTON.UPDATE, 2);
    });

    const result = recorderByTestId(page, "component-filter-result");
    await expect(result).toContainText("- UpdateButton:");
    const text = (await result.textContent()) ?? "";
    expect(text).not.toMatch(/- UpdateButton \(/);
  });

  test("Show render time toggle adds (Xms) to each component header in the body", async ({
    page,
  }) => {
    await recordCycle(page, async () => {
      await clickTimes(page, SCENARIO_BUTTON.UPDATE, 2);
    });

    await recorderByTestId(page, "view-options-button").click();
    await recorderByTestId(page, "view-option-isRenderDurationVisible").click();

    const result = recorderByTestId(page, "component-filter-result");
    await expect(result).toContainText(new RegExp(`- UpdateButton \\(${DURATION_PATTERN}\\):`));
  });

  test("disabling Show render time after enabling it removes the inline timing", async ({
    page,
  }) => {
    await recordCycle(page, async () => {
      await clickTimes(page, SCENARIO_BUTTON.UPDATE, 2);
    });

    const optionsButton = recorderByTestId(page, "view-options-button");
    const renderTimeToggle = recorderByTestId(page, "view-option-isRenderDurationVisible");
    const result = recorderByTestId(page, "component-filter-result");

    await optionsButton.click();
    await renderTimeToggle.click();
    await expect(result).toContainText(new RegExp(`- UpdateButton \\(${DURATION_PATTERN}\\):`));

    await renderTimeToggle.click();
    await expect(result).toContainText("- UpdateButton:");
    const text = (await result.textContent()) ?? "";
    expect(text).not.toMatch(/- UpdateButton \(/);
  });
});
