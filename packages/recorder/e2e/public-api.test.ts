import { expect, test, type Page } from "@playwright/test";

import { clickTimes, recordButton, recorderByTestId, START_BUTTON_TEXT } from "./helpers/recorder";
import { SCENARIO_BUTTON, type ScenarioButtonId } from "./helpers/scenario-buttons";

test.describe.configure({ mode: "parallel" });

const DURATION_PATTERN = "[\\d.]+(?:s|ms|μs)";

type CommitHistoryFormatOptions = {
  includeRenderDuration: boolean;
  includeHookPath: boolean;
  includeSource: boolean;
  includeAllRenders: boolean;
};

type RecorderApi = {
  start(): void;
  end(): unknown;
  getCommitHistoryText(options?: Partial<CommitHistoryFormatOptions>): string;
};

async function recordWithApi(page: Page, testId: ScenarioButtonId, times: number) {
  await page.evaluate(() =>
    (
      window as unknown as { __REACT_RENDER_RECORDER__: RecorderApi }
    ).__REACT_RENDER_RECORDER__.start(),
  );
  await clickTimes(page, testId, times);
  await page.evaluate(() =>
    (
      window as unknown as { __REACT_RENDER_RECORDER__: RecorderApi }
    ).__REACT_RENDER_RECORDER__.end(),
  );
}

function readText(page: Page, options?: Partial<CommitHistoryFormatOptions>) {
  return page.evaluate(
    (options) =>
      (
        window as unknown as { __REACT_RENDER_RECORDER__: RecorderApi }
      ).__REACT_RENDER_RECORDER__.getCommitHistoryText(options),
    options,
  );
}

test.describe("browser API getCommitHistoryText options", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(recordButton(page, START_BUTTON_TEXT)).toBeVisible();
  });

  test("does not expose paint APIs", async ({ page }) => {
    const keys = await page.evaluate(() =>
      Object.keys(
        (window as unknown as { __REACT_RENDER_RECORDER__: object }).__REACT_RENDER_RECORDER__,
      ),
    );
    expect(keys).toEqual(["start", "end", "getFiberChanges", "getCommitHistoryText"]);
  });

  test("defaults every option to false", async ({ page }) => {
    await recordWithApi(page, SCENARIO_BUTTON.UPDATE, 1);

    expect(await readText(page)).toBe(
      await readText(page, {
        includeRenderDuration: false,
        includeHookPath: false,
        includeSource: false,
        includeAllRenders: false,
      }),
    );
  });

  test("includeRenderDuration adds (Xms) to each component header", async ({ page }) => {
    await recordWithApi(page, SCENARIO_BUTTON.UPDATE, 1);

    expect(await readText(page)).toContain("- UpdateButton:\n");
    expect(await readText(page, { includeRenderDuration: true })).toMatch(
      new RegExp(`- UpdateButton \\(${DURATION_PATTERN}\\):`),
    );
  });

  test("includeHookPath reveals the wrapper chain for custom hooks", async ({ page }) => {
    await recordWithApi(page, SCENARIO_BUTTON.CUSTOM_HOOK, 1);

    expect(await readText(page)).not.toContain("(in HookCounter)");
    expect(await readText(page, { includeHookPath: true })).toContain("(in HookCounter)");
  });

  test("includeSource prints resolved source locations", async ({ page }) => {
    await recordWithApi(page, SCENARIO_BUTTON.UPDATE, 1);

    await expect
      .poll(() => readText(page, { includeSource: true }))
      .toMatch(/Source: .*UpdateButton\.tsx:4:\d+/);
    expect(await readText(page, { includeSource: true })).not.toContain("(unmapped)");
    expect(await readText(page)).not.toContain("Source:");
    await expect(recorderByTestId(page, "commit-history-result")).not.toContainText("Source:");
  });

  test("includeAllRenders lists parent-rendered components with their reason", async ({ page }) => {
    await recordWithApi(page, SCENARIO_BUTTON.RENDER_BY_PARENT, 1);

    const defaultText = await readText(page);
    expect(defaultText).toContain("1 commits, 4 components rendered");
    expect(defaultText).not.toContain("StaticLeafA");

    const allRendersText = await readText(page, { includeAllRenders: true });
    expect(allRendersText).toContain("1 commits, 4 components rendered");
    expect(allRendersText).toContain("- RenderByParentButton:\n  • Hook changed:");
    expect(allRendersText).toContain("- StaticLeafA:\n  The parent component rendered.");
  });
});
