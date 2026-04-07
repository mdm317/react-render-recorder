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
        hookName?: string | null;
        hookPath?: string[] | null;
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
    await page.goto("/", { waitUntil: "networkidle" });
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

  test("recorded hook history includes hook names", async ({ page }) => {
    await startRecording(page);

    const button = page.getByTestId("count-button").first();
    await button.click();
    await expect
      .poll(() => getRecorderSnapshot(page).then((snapshot) => snapshot.commitCount))
      .toBe(1);

    await stopRecording(page);

    const snapshot = await getRecorderSnapshot(page);
    const appHooks = snapshot.hookChangedHistory.App;
    expect(appHooks).toBeTruthy();

    const firstHookEntries = appHooks?.[1] ?? [];
    expect(firstHookEntries.length).toBeGreaterThan(0);
    expect(firstHookEntries[0]?.hookName).toBe("State");
    expect(firstHookEntries[0]?.hookPath).toEqual(["CounterState(0)", "State"]);
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

    page.on("console", (message) => {
      const text = message.text();
      if (text.includes("Hook change history summary")) {
        hookHistoryLogs.push(text);
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
  });
});
