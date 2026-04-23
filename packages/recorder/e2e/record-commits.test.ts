import { expect, test } from "@playwright/test";

import {
  clickRecorderElementByTestId,
  expectRecorderCommitCount,
  fillRecorderComponentFilter,
  getRecorderAttribute,
  getRecorderButtonLabel,
  getRecorderElementHeight,
  getRecorderFilterInputValue,
  getRecorderTextContent,
  recorderElementExists,
  startRecording,
  stopRecording,
} from "./helpers/recorder";

const appCounterCommitsPerClick = 2;

test.describe("react-render-recorder E2E", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect.poll(() => getRecorderButtonLabel(page)).toBe("Start recording");
  });

  test("recorder starts idle", async ({ page }) => {
    await expect.poll(() => getRecorderButtonLabel(page)).toBe("Start recording");
    await expect.poll(() => recorderElementExists(page, "commit-count")).toBe(false);
    await expect.poll(() => recorderElementExists(page, "component-filter-input")).toBe(false);
  });

  test("start recording button toggles recorder state", async ({ page }) => {
    await startRecording(page);
  });

  test("commits accumulate while recording", async ({ page }) => {
    await startRecording(page);

    const button = page.getByTestId("count-button").first();
    await button.click();
    await button.click();

    await expect.poll(() => recorderElementExists(page, "commit-count")).toBe(false);

    await stopRecording(page);
    await expectRecorderCommitCount(page, appCounterCommitsPerClick * 2);
  });

  test("commits are ignored while recording is off", async ({ page }) => {
    const button = page.getByTestId("count-button").first();
    await button.click();
    await button.click();

    await expect.poll(() => recorderElementExists(page, "commit-count")).toBe(false);
    await expect.poll(() => getRecorderButtonLabel(page)).toBe("Start recording");
  });

  test("hook history appears only after recording finishes", async ({ page }) => {
    await startRecording(page);

    const button = page.getByTestId("count-button").first();
    await button.click();
    await expect.poll(() => recorderElementExists(page, "component-filter-result")).toBe(false);
    await expect.poll(() => recorderElementExists(page, "component-filter-input")).toBe(false);

    await stopRecording(page);

    await expectRecorderCommitCount(page, appCounterCommitsPerClick);
    await expect
      .poll(() => getRecorderTextContent(page, "component-filter-result"))
      .toContain("Component App");
    await expect
      .poll(() => getRecorderTextContent(page, "component-filter-result"))
      .not.toContain("No hook changes were recorded.");
  });

  test("recorded hook history includes hook names", async ({ page }) => {
    await startRecording(page);

    const button = page.getByTestId("count-button").first();
    await button.click();

    await stopRecording(page);

    await expectRecorderCommitCount(page, appCounterCommitsPerClick);
    await expect
      .poll(() => getRecorderTextContent(page, "component-filter-result"))
      .toContain("Hook 1 (CounterState > State)");
    await expect
      .poll(() => getRecorderTextContent(page, "component-filter-result"))
      .toContain("Commit 1: 0 -> 1");
  });

  test("multiple clicks continue to accumulate commits", async ({ page }) => {
    await startRecording(page);

    const button = page.getByTestId("count-button").first();
    for (let index = 0; index < 5; index += 1) {
      await button.click();
    }

    await stopRecording(page);
    await expectRecorderCommitCount(page, appCounterCommitsPerClick * 5);
  });

  test("stop recording preserves html element hook changes with concise identifiers", async ({
    page,
  }) => {
    await startRecording(page);

    await page.locator('[data-testid="element-alpha-button"]').click();
    await page.locator('[data-testid="element-beta-button"]').click();

    await stopRecording(page);

    await expectRecorderCommitCount(page, 2);
    await fillRecorderComponentFilter(page, "elementstate");

    await expect
      .poll(() => getRecorderTextContent(page, "component-filter-result"))
      .toContain(
        "[HTMLElement button#hook-target-alpha.hook-target.alpha.primary] -> [HTMLElement button#hook-target-beta.hook-target.beta.secondary]",
      );
  });

  test("stop recording shows filtered data for a specific component input", async ({ page }) => {
    await startRecording(page);

    await page.locator('[data-testid="element-alpha-button"]').click();

    await stopRecording(page);

    await expectRecorderCommitCount(page, 1);
    await fillRecorderComponentFilter(page, "elementstate");

    await expect
      .poll(() => getRecorderTextContent(page, "component-filter-result"))
      .toContain("Component ElementStatePanel");
    await expect
      .poll(() => getRecorderTextContent(page, "component-filter-result"))
      .toContain("[HTMLElement button#hook-target-alpha.hook-target.alpha.primary]");
    await expect
      .poll(() => getRecorderTextContent(page, "component-filter-result"))
      .not.toContain("Component App");
    await expect
      .poll(() => getRecorderTextContent(page, "component-filter-result"))
      .not.toContain("Component Child");
  });

  test("starting a new recording resets the previous component filter", async ({ page }) => {
    await startRecording(page);

    await page.locator('[data-testid="element-alpha-button"]').click();

    await stopRecording(page);
    await expectRecorderCommitCount(page, 1);
    await fillRecorderComponentFilter(page, "elementstate");

    await expect.poll(() => getRecorderFilterInputValue(page)).toBe("elementstate");

    await startRecording(page);

    await page.getByTestId("count-button").first().click();

    await stopRecording(page);

    await expectRecorderCommitCount(page, appCounterCommitsPerClick);
    await expect.poll(() => getRecorderFilterInputValue(page)).toBe("");
    await expect
      .poll(() => getRecorderTextContent(page, "component-filter-result"))
      .toContain("Component App");
  });

  test("empty filter shows the combined data for all recorded components", async ({ page }) => {
    await startRecording(page);

    await page.getByTestId("count-button").first().click();
    await page.locator('[data-testid="element-alpha-button"]').click();
    await page.getByTestId("count-button").nth(1).click();

    await stopRecording(page);

    await expectRecorderCommitCount(page, appCounterCommitsPerClick + 2);
    await expect
      .poll(() => getRecorderTextContent(page, "component-filter-available"))
      .not.toContain("Total");

    await expect
      .poll(() => getRecorderTextContent(page, "component-filter-result"))
      .toContain("Component App");
    await expect
      .poll(() => getRecorderTextContent(page, "component-filter-result"))
      .toContain("Component ElementStatePanel");
    await expect
      .poll(() => getRecorderTextContent(page, "component-filter-result"))
      .toContain("Component Child");
  });

  test("copy buttons copy hook and commit history", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await startRecording(page);

    await page.locator('[data-testid="element-alpha-button"]').click();

    await stopRecording(page);
    await expectRecorderCommitCount(page, 1);
    await fillRecorderComponentFilter(page, "elementstate");

    await clickRecorderElementByTestId(page, "copy-hook-history-button");
    await expect
      .poll(() => page.evaluate(() => navigator.clipboard.readText()))
      .toContain("Component ElementStatePanel");

    await clickRecorderElementByTestId(page, "copy-commit-history-button");
    await expect
      .poll(() => page.evaluate(() => navigator.clipboard.readText()))
      .toContain("Commit 1");
  });

  test("commit history panel can be collapsed and expanded when results exist", async ({
    page,
  }) => {
    await startRecording(page);

    await page.locator('[data-testid="element-alpha-button"]').click();
    await expect(page.getByTestId("element-state-label")).toContainText("button#hook-target-alpha");

    await stopRecording(page);

    await expect
      .poll(() => getRecorderAttribute(page, "commit-history-toggle", "aria-expanded"))
      .toBe("true");
    await expect
      .poll(() => getRecorderTextContent(page, "component-filter-result"))
      .toContain("Component ElementStatePanel");

    await clickRecorderElementByTestId(page, "commit-history-toggle");

    await expect
      .poll(() => getRecorderAttribute(page, "commit-history-toggle", "aria-expanded"))
      .toBe("false");
    await expect
      .poll(() => getRecorderAttribute(page, "commit-history-panel-content", "aria-hidden"))
      .toBe("true");
    await expect.poll(() => getRecorderElementHeight(page, "commit-history-panel-content")).toBe(0);

    await clickRecorderElementByTestId(page, "commit-history-toggle");

    await expect
      .poll(() => getRecorderAttribute(page, "commit-history-toggle", "aria-expanded"))
      .toBe("true");
    await expect
      .poll(() => getRecorderAttribute(page, "commit-history-panel-content", "aria-hidden"))
      .toBe("false");
    await expect
      .poll(() => getRecorderElementHeight(page, "commit-history-panel-content"))
      .toBeGreaterThan(0);
    await expect
      .poll(() => getRecorderTextContent(page, "component-filter-result"))
      .toContain("Component ElementStatePanel");
  });
});
