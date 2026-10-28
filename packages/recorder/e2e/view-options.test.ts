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

    const result = recorderByTestId(page, "commit-history-result");
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
    await recorderByTestId(page, "view-option-includeRenderDuration").click();

    const result = recorderByTestId(page, "commit-history-result");
    await expect(result).toContainText(new RegExp(`- UpdateButton \\(${DURATION_PATTERN}\\):`));
  });

  test("disabling Show render time after enabling it removes the inline timing", async ({
    page,
  }) => {
    await recordCycle(page, async () => {
      await clickTimes(page, SCENARIO_BUTTON.UPDATE, 2);
    });

    const optionsButton = recorderByTestId(page, "view-options-button");
    const renderTimeToggle = recorderByTestId(page, "view-option-includeRenderDuration");
    const result = recorderByTestId(page, "commit-history-result");

    await optionsButton.click();
    await renderTimeToggle.click();
    await expect(result).toContainText(new RegExp(`- UpdateButton \\(${DURATION_PATTERN}\\):`));

    await renderTimeToggle.click();
    await expect(result).toContainText("- UpdateButton:");
    const text = (await result.textContent()) ?? "";
    expect(text).not.toMatch(/- UpdateButton \(/);
  });

  test("Show hook path toggle reveals the wrapper chain for custom hooks", async ({ page }) => {
    await recordCycle(page, async () => {
      await clickTimes(page, SCENARIO_BUTTON.CUSTOM_HOOK, 1);
    });

    const optionsButton = recorderByTestId(page, "view-options-button");
    const hookPathToggle = recorderByTestId(page, "view-option-includeHookPath");
    const result = recorderByTestId(page, "commit-history-result");

    const initialText = (await result.textContent()) ?? "";
    expect(initialText).not.toMatch(/\(in HookCounter\)/);

    await optionsButton.click();
    await hookPathToggle.click();
    await expect(result).toContainText("(in HookCounter)");

    await hookPathToggle.click();
    const finalText = (await result.textContent()) ?? "";
    expect(finalText).not.toMatch(/\(in HookCounter\)/);
  });

  test("Show all renders toggle lists parent-rendered components with their reason", async ({
    page,
  }) => {
    await recordCycle(page, async () => {
      await clickTimes(page, SCENARIO_BUTTON.RENDER_BY_PARENT, 1);
    });

    const optionsButton = recorderByTestId(page, "view-options-button");
    const allRendersToggle = recorderByTestId(page, "view-option-includeAllRenders");
    const result = recorderByTestId(page, "commit-history-result");

    await expect(result).toContainText("1 commits, 1 components rerendered");
    await expect(result).not.toContainText("StaticLeafA");

    await optionsButton.click();
    await allRendersToggle.click();
    await expect(result).toContainText("1 commits, 4 components rerendered");
    await expect(result).toContainText("- RenderByParentButton: • Hook changed:");
    await expect(result).toContainText("- StaticLeafA: The parent component rendered.");

    await allRendersToggle.click();
    await expect(result).toContainText("1 commits, 1 components rerendered");
    await expect(result).not.toContainText("StaticLeafA");
  });
});

test("source option resolves locations in both views and copied output", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/");
  await recordCycle(page, async () => {
    await clickTimes(page, SCENARIO_BUTTON.UPDATE, 1);
  });
  const result = recorderByTestId(page, "commit-history-result");
  await expect(result).not.toContainText("Source:");
  await recorderByTestId(page, "view-options-button").click();
  const toggle = recorderByTestId(page, "view-option-includeSource");
  await toggle.click();
  await expect(result).toContainText("Source:");
  await expect(result).toContainText(/Source: .*UpdateButton\.tsx:4:\d+/);
  await expect(result).not.toContainText("(unmapped)");
  await toggle.click();
  await expect(result).not.toContainText("Source:");
  await toggle.click();
  await recorderByTestId(page, "view-options-button").click();
  await recorderByTestId(page, "paint-view-toggle-paint").click();
  await expect(recorderByTestId(page, "paint-segment-result")).toContainText("Source:");
  await recorderByTestId(page, "copy-paint-history-button").click();
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toContain("Source:");
});

test("source URL option enables source display initially", async ({ page }) => {
  await page.goto("/?source=true");
  await recordCycle(page, async () => {
    await clickTimes(page, SCENARIO_BUTTON.UPDATE, 1);
  });
  await expect(recorderByTestId(page, "commit-history-result")).toContainText("Source:");
});

test("browser API includes resolved sources in full and per-paint text independently of UI options", async ({
  page,
}) => {
  await page.goto("/");
  await expect(recordButton(page, START_BUTTON_TEXT)).toBeVisible();
  await page.evaluate(() => {
    const recorder = (window as unknown as { __REACT_RENDER_RECORDER__: { start(): void } })
      .__REACT_RENDER_RECORDER__;
    recorder.start();
  });
  await clickTimes(page, SCENARIO_BUTTON.UPDATE, 1);
  await page.evaluate(() => {
    const recorder = (window as unknown as { __REACT_RENDER_RECORDER__: { end(): unknown } })
      .__REACT_RENDER_RECORDER__;
    recorder.end();
  });

  const readText = () =>
    page.evaluate(() => {
      const recorder = (
        window as unknown as {
          __REACT_RENDER_RECORDER__: {
            getCommitHistoryText(options?: { includeSource: boolean }): string;
            getCommitHistoryTextByPaint(options?: { includeSource: boolean }): string[];
          };
        }
      ).__REACT_RENDER_RECORDER__;
      return {
        full: recorder.getCommitHistoryText({ includeSource: true }),
        paints: recorder.getCommitHistoryTextByPaint({ includeSource: true }).join("\n"),
        defaultFull: recorder.getCommitHistoryText(),
        defaultPaints: recorder.getCommitHistoryTextByPaint().join("\n"),
      };
    });

  await expect
    .poll(async () => (await readText()).full)
    .toMatch(/Source: .*UpdateButton\.tsx:4:\d+/);
  const text = await readText();
  expect(text.paints).toMatch(/Source: .*UpdateButton\.tsx:4:\d+/);
  expect(text.full).not.toContain("(unmapped)");
  expect(text.paints).not.toContain("(unmapped)");
  expect(text.defaultFull).not.toContain("Source:");
  expect(text.defaultPaints).not.toContain("Source:");
  await expect(recorderByTestId(page, "commit-history-result")).not.toContainText("Source:");
});
