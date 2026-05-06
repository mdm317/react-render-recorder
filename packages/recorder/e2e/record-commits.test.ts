import { expect, test } from "@playwright/test";

import {
  clickTimes,
  expectRecorderCommitCount,
  fillRecorderComponentFilter,
  recordButton,
  recorderByTestId,
  recordCycle,
  START_BUTTON_TEXT,
  startRecording,
  stopRecording,
} from "./helpers/recorder";
import { SCENARIO_BUTTON } from "./helpers/scenario-buttons";

test.describe.configure({ mode: "parallel" });

test.describe("react-render-recorder E2E", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(recordButton(page, START_BUTTON_TEXT)).toBeVisible();
  });

  test.describe("basic operation", () => {
    test("record button toggles between Start and Stop", async ({ page }) => {
      await startRecording(page);
      await stopRecording(page);
      await startRecording(page);
    });

    test("commits accumulate while recording and surface only after stop", async ({ page }) => {
      await startRecording(page);

      await clickTimes(page, SCENARIO_BUTTON.UPDATE, 2);

      await expect(recorderByTestId(page, "commit-count")).toHaveCount(0);

      await stopRecording(page);
      await expectRecorderCommitCount(page, 2);
    });

    test("commits are ignored while recording is off", async ({ page }) => {
      await clickTimes(page, SCENARIO_BUTTON.UPDATE, 2);

      await expect(recorderByTestId(page, "commit-count")).toHaveCount(0);
    });

    test("commit history appears only after recording finishes", async ({ page }) => {
      await startRecording(page);

      await page.getByTestId(SCENARIO_BUTTON.UPDATE).click();
      await expect(recorderByTestId(page, "component-filter-result")).toHaveCount(0);

      await stopRecording(page);

      await expectRecorderCommitCount(page, 1);
      const result = recorderByTestId(page, "component-filter-result");
      await expect(result).toContainText("UpdateButton hook[0] State");
    });
  });

  test("copy commit history button copies the commit history text", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await recordCycle(page, async () => {
      await page.getByTestId(SCENARIO_BUTTON.ELEMENT_ALPHA).click();
    });
    await expectRecorderCommitCount(page, 1);

    await recorderByTestId(page, "copy-commit-history-button").click();
    await expect
      .poll(() => page.evaluate(() => navigator.clipboard.readText()))
      .toContain("## Commit 1");
  });

  test("commit history panel can be collapsed and expanded when results exist", async ({
    page,
  }) => {
    await recordCycle(page, async () => {
      await page.getByTestId(SCENARIO_BUTTON.ELEMENT_ALPHA).click();
      await expect(page.getByTestId("element-state-label")).toContainText(
        "button#hook-target-alpha",
      );
    });

    const toggle = recorderByTestId(page, "commit-history-toggle");
    const panel = recorderByTestId(page, "commit-history-panel-content");
    const result = recorderByTestId(page, "component-filter-result");

    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await expect(result).toContainText("ElementStatePanel hook[0] State");

    await toggle.click();

    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(panel).toHaveAttribute("aria-hidden", "true");
    await expect
      .poll(() => panel.evaluate((el) => Math.round(el.getBoundingClientRect().height)))
      .toBe(0);

    await toggle.click();

    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await expect(panel).toHaveAttribute("aria-hidden", "false");
    await expect
      .poll(() => panel.evaluate((el) => Math.round(el.getBoundingClientRect().height)))
      .toBeGreaterThan(0);
    await expect(result).toContainText("ElementStatePanel hook[0] State");
  });
});

// TODO: Hook history UI is currently disabled.
// Re-enable this test when the hook history rendering is re-implemented.
// (Note: also depends on the component name filter input.)
test.describe.skip("hook history", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(recordButton(page, START_BUTTON_TEXT)).toBeVisible();
  });

  test("copy buttons copy hook and commit history", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await recordCycle(page, async () => {
      await page.getByTestId(SCENARIO_BUTTON.ELEMENT_ALPHA).click();
    });
    await expectRecorderCommitCount(page, 1);
    await fillRecorderComponentFilter(page, "elementstate");

    await recorderByTestId(page, "copy-hook-history-button").click();
    await expect
      .poll(() => page.evaluate(() => navigator.clipboard.readText()))
      .toContain("Component ElementStatePanel");

    await recorderByTestId(page, "copy-commit-history-button").click();
    await expect
      .poll(() => page.evaluate(() => navigator.clipboard.readText()))
      .toContain("Commit 1");
  });
});

// TODO: Component name filter UI is currently disabled.
// Re-enable these tests when the filter is re-implemented.
test.describe.skip("component name filter", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(recordButton(page, START_BUTTON_TEXT)).toBeVisible();
  });

  test("starting a new recording resets the previous component filter", async ({ page }) => {
    await recordCycle(page, async () => {
      await page.getByTestId(SCENARIO_BUTTON.ELEMENT_ALPHA).click();
    });
    await expectRecorderCommitCount(page, 1);
    await fillRecorderComponentFilter(page, "elementstate");

    const filter = recorderByTestId(page, "component-filter-input");
    await expect(filter).toHaveValue("elementstate");

    await recordCycle(page, async () => {
      await page.getByTestId(SCENARIO_BUTTON.UPDATE).click();
    });

    await expectRecorderCommitCount(page, 1);
    await expect(filter).toHaveValue("");
    await expect(recorderByTestId(page, "component-filter-result")).toContainText(
      "Component UpdateButton",
    );
  });

  test("component filter narrows result to a single component", async ({ page }) => {
    await recordCycle(page, async () => {
      await page.getByTestId(SCENARIO_BUTTON.UPDATE).click();
      await page.getByTestId(SCENARIO_BUTTON.ELEMENT_ALPHA).click();
    });

    await expectRecorderCommitCount(page, 2);
    await fillRecorderComponentFilter(page, "elementstate");

    const result = recorderByTestId(page, "component-filter-result");
    await expect(result).toContainText("ElementStatePanel hook[0] State");
    await expect(result).not.toContainText("Component UpdateButton");
  });

  test("empty filter shows the combined data for all recorded components", async ({ page }) => {
    await recordCycle(page, async () => {
      await page.getByTestId(SCENARIO_BUTTON.UPDATE).click();
      await page.getByTestId(SCENARIO_BUTTON.ELEMENT_ALPHA).click();
      await page.getByTestId(SCENARIO_BUTTON.CUSTOM_HOOK).click();
    });

    await expectRecorderCommitCount(page, 3);
    await expect(recorderByTestId(page, "component-filter-available")).not.toContainText("Total");

    const result = recorderByTestId(page, "component-filter-result");
    await expect(result).toContainText("Component UpdateButton");
    await expect(result).toContainText("ElementStatePanel hook[0] State");
    await expect(result).toContainText("Component CustomHookButton");
  });

  test("non-matching filter shows the no-match state", async ({ page }) => {
    await recordCycle(page, async () => {
      await page.getByTestId(SCENARIO_BUTTON.UPDATE).click();
    });

    await fillRecorderComponentFilter(page, "doesnotexist-xyz");

    await expect(recorderByTestId(page, "component-filter-no-match")).toBeVisible();
    await expect(recorderByTestId(page, "component-filter-result")).toHaveCount(0);
  });
});
