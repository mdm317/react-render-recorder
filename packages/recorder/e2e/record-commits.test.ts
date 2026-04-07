import { expect, test, type Page } from "@playwright/test";

type RecorderTestSnapshot = {
  commitCount: number;
  fiberChangeCount: number;
  hookChangedHistory: Record<
    string,
    Record<
      number,
      Array<{
        commitIndex: number;
        hookIndex: number;
        next: unknown;
        prev: unknown;
      }>
    >
  >;
  isRecording: boolean;
};

async function getRecorderSnapshot(page: Page): Promise<RecorderTestSnapshot> {
  return page.evaluate(() => {
    const testApi = window.__REACT_RECORD_TEST__;
    if (!testApi) {
      throw new Error("window.__REACT_RECORD_TEST__ is not available");
    }

    return testApi.getSnapshot();
  });
}

async function clickRecorderButton(
  page: Page,
  name: "Start recording" | "Stop recording",
) {
  await page.evaluate((buttonName) => {
    const root = document.getElementById("recorder-root");
    const buttons = root?.shadowRoot?.querySelectorAll("button") ?? [];

    for (const button of buttons) {
      if (button.getAttribute("aria-label") === buttonName) {
        button.click();
        return;
      }
    }

    throw new Error(`Recorder button "${buttonName}" not found in shadow DOM`);
  }, name);
}

async function fillRecorderComponentFilter(page: Page, value: string) {
  await page.evaluate((nextValue) => {
    const root = document.getElementById("recorder-root");
    const input = root?.shadowRoot?.querySelector(
      '[data-testid="component-filter-input"]',
    );

    if (!(input instanceof HTMLInputElement)) {
      throw new Error("Recorder component filter input not found in shadow DOM");
    }

    input.value = nextValue;
    input.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
  }, value);
}

async function getRecorderTextContent(
  page: Page,
  testId: string,
): Promise<string | null> {
  return page.evaluate((targetTestId) => {
    const root = document.getElementById("recorder-root");
    const target = root?.shadowRoot?.querySelector(
      `[data-testid="${targetTestId}"]`,
    );

    return target?.textContent ?? null;
  }, testId);
}

async function clickRecorderElementByTestId(page: Page, testId: string) {
  await page.evaluate((targetTestId) => {
    const root = document.getElementById("recorder-root");
    const target = root?.shadowRoot?.querySelector(
      `[data-testid="${targetTestId}"]`,
    );

    if (!(target instanceof HTMLElement)) {
      throw new Error(`Recorder element "${targetTestId}" not found in shadow DOM`);
    }

    target.click();
  }, testId);
}

async function startRecording(page: Page) {
  await clickRecorderButton(page, "Start recording");
  await expect
    .poll(() => getRecorderSnapshot(page).then((snapshot) => snapshot.isRecording))
    .toBe(true);
}

async function stopRecording(page: Page) {
  await clickRecorderButton(page, "Stop recording");
  await expect
    .poll(() => getRecorderSnapshot(page).then((snapshot) => snapshot.isRecording))
    .toBe(false);
}

test.describe("react-record E2E", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect
      .poll(() =>
        page.evaluate(() => Boolean(window.__REACT_RECORD_TEST__)),
      )
      .toBe(true);
  });

  test("recorder starts idle", async ({ page }) => {
    const snapshot = await getRecorderSnapshot(page);

    expect(snapshot.isRecording).toBe(false);
    expect(snapshot.commitCount).toBe(0);
    expect(snapshot.fiberChangeCount).toBe(0);
    expect(snapshot.hookChangedHistory).toEqual({});
  });

  test("start recording button toggles recorder state", async ({ page }) => {
    await startRecording(page);

    const snapshot = await getRecorderSnapshot(page);
    expect(snapshot.isRecording).toBe(true);
  });

  test("commits accumulate while recording", async ({ page }) => {
    await startRecording(page);

    const button = page.getByTestId("count-button").first();
    await button.click();
    await expect
      .poll(() => getRecorderSnapshot(page).then((snapshot) => snapshot.commitCount))
      .toBe(1);

    await button.click();
    await expect
      .poll(() => getRecorderSnapshot(page).then((snapshot) => snapshot.commitCount))
      .toBe(2);
  });

  test("commits are ignored while recording is off", async ({ page }) => {
    const button = page.getByTestId("count-button").first();
    await button.click();
    await button.click();

    const snapshot = await getRecorderSnapshot(page);
    expect(snapshot.commitCount).toBe(0);
    expect(snapshot.fiberChangeCount).toBe(0);
  });

  test("stop recording halts commit capture and derives hook history", async ({
    page,
  }) => {
    await startRecording(page);

    const button = page.getByTestId("count-button").first();
    await button.click();
    await expect
      .poll(() => getRecorderSnapshot(page).then((snapshot) => snapshot.commitCount))
      .toBe(1);

    await stopRecording(page);

    const snapshotAfterStop = await getRecorderSnapshot(page);
    expect(snapshotAfterStop.commitCount).toBe(1);
    expect(snapshotAfterStop.fiberChangeCount).toBe(1);
    expect(snapshotAfterStop.hookChangedHistory).not.toEqual({});

    await button.click();
    await button.click();

    const snapshotAfterExtraClicks = await getRecorderSnapshot(page);
    expect(snapshotAfterExtraClicks.commitCount).toBe(1);
    expect(snapshotAfterExtraClicks.fiberChangeCount).toBe(1);
  });

  test("hook history is only derived after recording stops", async ({ page }) => {
    await startRecording(page);

    const button = page.getByTestId("count-button").first();
    await button.click();
    await expect
      .poll(() => getRecorderSnapshot(page).then((snapshot) => snapshot.commitCount))
      .toBe(1);

    const duringRecording = await getRecorderSnapshot(page);
    expect(duringRecording.hookChangedHistory).toEqual({});

    await stopRecording(page);

    const afterStop = await getRecorderSnapshot(page);
    expect(afterStop.hookChangedHistory).not.toEqual({});
  });

  test("multiple clicks continue to accumulate commits", async ({ page }) => {
    await startRecording(page);

    const button = page.getByTestId("count-button").first();
    for (let index = 0; index < 5; index += 1) {
      await button.click();
    }

    await expect
      .poll(() => getRecorderSnapshot(page).then((snapshot) => snapshot.commitCount))
      .toBe(5);
  });

  test("stop recording logs html element hook changes with concise identifiers", async ({
    page,
  }) => {
    const hookHistoryLogs: string[] = [];
    const jsonLogs: string[] = [];

    page.on("console", (message) => {
      const text = message.text();
      if (text.includes("Hook change history summary")) {
        hookHistoryLogs.push(text);
      }

      if (
        text.includes("hook-target-alpha") &&
        text.includes("hook-target-beta") &&
        text.startsWith("{")
      ) {
        jsonLogs.push(text);
      }
    });

    await startRecording(page);

    await page.locator('[data-testid="element-alpha-button"]').click();
    await expect
      .poll(() => getRecorderSnapshot(page).then((snapshot) => snapshot.commitCount))
      .toBe(1);

    await page.locator('[data-testid="element-beta-button"]').click();
    await expect
      .poll(() => getRecorderSnapshot(page).then((snapshot) => snapshot.commitCount))
      .toBe(2);

    await stopRecording(page);

    await expect
      .poll(() => hookHistoryLogs.at(-1))
      .toContain(
        "[HTMLElement button#hook-target-alpha.hook-target.alpha.primary] -> [HTMLElement button#hook-target-beta.hook-target.beta.secondary]",
      );
    await expect
      .poll(() =>
        page.evaluate(() => {
          const testApi = window.__REACT_RECORD_TEST__;
          if (!testApi) {
            throw new Error("window.__REACT_RECORD_TEST__ is not available");
          }

          return JSON.stringify(testApi.getSnapshot().hookChangedHistory);
        }),
      )
      .toContain("[HTMLElement button#hook-target-alpha.hook-target.alpha.primary]");
    expect(
      jsonLogs.some((message) =>
        message.includes("[HTMLElement button#hook-target-alpha.hook-target.alpha.primary]"),
      ),
    ).toBe(true);
  });

  test("stop recording shows filtered data for a specific component input", async ({
    page,
  }) => {
    await startRecording(page);

    await page.locator('[data-testid="element-alpha-button"]').click();
    await expect
      .poll(() => getRecorderSnapshot(page).then((snapshot) => snapshot.commitCount))
      .toBe(1);

    await stopRecording(page);

    await fillRecorderComponentFilter(page, "elementstate");

    await expect
      .poll(() => getRecorderTextContent(page, "component-filter-result"))
      .toContain("Showing: ElementStatePanel");
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

  test("copy buttons copy hook and commit history", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await startRecording(page);

    await page.locator('[data-testid="element-alpha-button"]').click();
    await expect
      .poll(() => getRecorderSnapshot(page).then((snapshot) => snapshot.commitCount))
      .toBe(1);

    await stopRecording(page);
    await fillRecorderComponentFilter(page, "elementstate");

    await clickRecorderElementByTestId(page, "copy-hook-history-button");
    await expect
      .poll(() => page.evaluate(() => navigator.clipboard.readText()))
      .toContain("Component ElementStatePanel");

    await clickRecorderElementByTestId(page, "copy-commit-history-button");
    await expect
      .poll(() => page.evaluate(() => navigator.clipboard.readText()))
      .toContain("Commit 0");
  });
});
