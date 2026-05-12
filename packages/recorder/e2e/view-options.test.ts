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

  test("default view shows no summary lines for rerenders or render time", async ({ page }) => {
    await recordCycle(page, async () => {
      await clickTimes(page, SCENARIO_BUTTON.UPDATE, 2);
    });

    const result = recorderByTestId(page, "component-filter-result");
    await expect(result).not.toContainText("rerenders:");
    await expect(result).not.toContainText("render time:");
    await expect(result).not.toContainText("component stats");
  });

  test("Show rerenders toggle adds the rerenders summary line", async ({ page }) => {
    await recordCycle(page, async () => {
      await clickTimes(page, SCENARIO_BUTTON.UPDATE, 2);
    });

    await recorderByTestId(page, "view-options-button").click();
    await recorderByTestId(page, "view-option-isRerenderCountVisible").click();

    const result = recorderByTestId(page, "component-filter-result");
    await expect(result).toContainText("rerenders: UpdateButton=1, UpdateButton=1");
    await expect(result).not.toContainText("render time:");
    await expect(result).not.toContainText("component stats");
  });

  test("Show render time toggle adds the render time summary line", async ({ page }) => {
    await recordCycle(page, async () => {
      await clickTimes(page, SCENARIO_BUTTON.UPDATE, 2);
    });

    await recorderByTestId(page, "view-options-button").click();
    await recorderByTestId(page, "view-option-isRenderDurationVisible").click();

    const result = recorderByTestId(page, "component-filter-result");
    await expect(result).toContainText("render time:");
    await expect(result).toContainText(new RegExp(`UpdateButton=${DURATION_PATTERN}`));
    await expect(result).not.toContainText("rerenders:");
    await expect(result).not.toContainText("component stats");
  });

  test("enabling both toggles switches to the combined component stats list", async ({ page }) => {
    await recordCycle(page, async () => {
      await clickTimes(page, SCENARIO_BUTTON.UPDATE, 2);
    });

    await recorderByTestId(page, "view-options-button").click();
    await recorderByTestId(page, "view-option-isRerenderCountVisible").click();
    await recorderByTestId(page, "view-option-isRenderDurationVisible").click();

    const result = recorderByTestId(page, "component-filter-result");
    await expect(result).toContainText(
      "component stats (rerender count + total render time, all renders):",
    );
    const perFiberStatPattern = new RegExp(
      `- UpdateButton: 1 rerender, ${DURATION_PATTERN} total render time`,
      "g",
    );
    await expect
      .poll(
        async () => ((await result.textContent()) ?? "").match(perFiberStatPattern)?.length ?? 0,
      )
      .toBe(2);
    await expect(result).not.toContainText("rerenders: UpdateButton=");
    await expect(result).not.toContainText("render time: UpdateButton=");
  });

  test("Show rerenders summary includes render-by-parent components (no hook change)", async ({
    page,
  }) => {
    await recordCycle(page, async () => {
      await clickTimes(page, SCENARIO_BUTTON.RENDER_BY_PARENT, 1);
    });

    await recorderByTestId(page, "view-options-button").click();
    await recorderByTestId(page, "view-option-isRerenderCountVisible").click();

    const result = recorderByTestId(page, "component-filter-result");
    const text = (await result.textContent()) ?? "";
    expect(text).toMatch(/rerenders:\s*[^\n]*RenderByParentButton=1/);
    expect(text).toMatch(/StaticLeafA=1/);
    expect(text).toMatch(/StaticLeafB=1/);
    expect(text).toMatch(/StaticLeafC=1/);
  });

  test("combined component stats includes render-by-parent components with timing", async ({
    page,
  }) => {
    await recordCycle(page, async () => {
      await clickTimes(page, SCENARIO_BUTTON.RENDER_BY_PARENT, 1);
    });

    await recorderByTestId(page, "view-options-button").click();
    await recorderByTestId(page, "view-option-isRerenderCountVisible").click();
    await recorderByTestId(page, "view-option-isRenderDurationVisible").click();

    const result = recorderByTestId(page, "component-filter-result");
    await expect(result).toContainText(
      "component stats (rerender count + total render time, all renders):",
    );
    for (const name of ["RenderByParentButton", "StaticLeafA", "StaticLeafB", "StaticLeafC"]) {
      await expect(result).toContainText(
        new RegExp(`- ${name}: 1 rerender, ${DURATION_PATTERN} total render time`),
      );
    }
  });

  test("disabling Show rerenders after enabling it removes the summary line", async ({ page }) => {
    await recordCycle(page, async () => {
      await clickTimes(page, SCENARIO_BUTTON.UPDATE, 2);
    });

    const optionsButton = recorderByTestId(page, "view-options-button");
    const rerenderToggle = recorderByTestId(page, "view-option-isRerenderCountVisible");
    const result = recorderByTestId(page, "component-filter-result");

    await optionsButton.click();
    await rerenderToggle.click();
    await expect(result).toContainText("rerenders:");

    await rerenderToggle.click();
    await expect(result).not.toContainText("rerenders:");
  });
});
