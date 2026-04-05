import { test, expect, type Page } from "@playwright/test";

type RecorderUIState = {
  isRecording: boolean;
  commitCount: number;
  hasCommits: boolean;
  latestCommitText: string;
  priorityText: string;
};

async function getRecorderUIState(page: Page): Promise<RecorderUIState> {
  return page.evaluate(() => {
    const root = document.getElementById("recorder-root");
    const shadow = root?.shadowRoot;
    if (!shadow) throw new Error("Recorder shadow root not found");
    const text = shadow.textContent ?? "";
    return {
      isRecording: text.includes("Recording in progress"),
      commitCount: Number.parseInt(text.match(/(\d+) commits captured/)?.[1] ?? "0", 10),
      hasCommits: !text.includes("No commits captured yet"),
      latestCommitText: text.match(/Renderer \d+ at .+?(?=Latest)/)?.[0]?.trim() ?? "",
      priorityText: text.match(/Latest priority: (.+)/)?.[1]?.trim() ?? "",
    };
  });
}

async function clickRecorderButton(page: Page, name: "Start recording" | "Stop recording") {
  await page.evaluate((btnName) => {
    const root = document.getElementById("recorder-root");
    const btns = root?.shadowRoot?.querySelectorAll("button") ?? [];
    for (const btn of btns) {
      if (btn.textContent?.trim().includes(btnName)) {
        btn.click();
        return;
      }
    }
    throw new Error(`Recorder button "${btnName}" not found in shadow DOM`);
  }, name);
}

async function startRecording(page: Page) {
  await clickRecorderButton(page, "Start recording");
  await expect.poll(() => getRecorderUIState(page).then((s) => s.isRecording)).toBe(true);
}

async function stopRecording(page: Page) {
  await clickRecorderButton(page, "Stop recording");
  await expect.poll(() => getRecorderUIState(page).then((s) => s.isRecording)).toBe(false);
}

test.describe("react-record E2E", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
  });

  test("recorder UI shows idle state initially", async ({ page }) => {
    const state = await getRecorderUIState(page);
    expect(state.isRecording).toBe(false);
    expect(state.commitCount).toBe(0);
    expect(state.hasCommits).toBe(false);
  });

  test("Start recording button transitions UI to recording state", async ({ page }) => {
    await startRecording(page);
    const state = await getRecorderUIState(page);
    expect(state.isRecording).toBe(true);
  });

  test("clicking the count button produces commits while recording", async ({ page }) => {
    await startRecording(page);

    const button = page.locator('[data-testid="count-button"]');
    await button.click();
    await expect.poll(() => getRecorderUIState(page).then((s) => s.commitCount)).toBe(1);

    await button.click();
    await expect.poll(() => getRecorderUIState(page).then((s) => s.commitCount)).toBe(2);

    await button.click();
    await expect.poll(() => getRecorderUIState(page).then((s) => s.commitCount)).toBe(3);
  });

  test("commits are NOT recorded when recording is off", async ({ page }) => {
    const button = page.locator('[data-testid="count-button"]');
    await button.click();
    await button.click();

    const state = await getRecorderUIState(page);
    expect(state.commitCount).toBe(0);
    expect(state.hasCommits).toBe(false);
  });

  test("Stop recording button halts commit capture", async ({ page }) => {
    await startRecording(page);

    await page.locator('[data-testid="count-button"]').click();
    await expect.poll(() => getRecorderUIState(page).then((s) => s.commitCount)).toBe(1);

    // Capture the latest commit text before stopping
    const beforeStop = await getRecorderUIState(page);

    await stopRecording(page);

    // Click more after stopping
    await page.locator('[data-testid="count-button"]').click();
    await page.locator('[data-testid="count-button"]').click();

    const state = await getRecorderUIState(page);
    expect(state.isRecording).toBe(false);
    // Latest commit text unchanged — no new commits recorded
    expect(state.latestCommitText).toBe(beforeStop.latestCommitText);
  });

  test("UI displays renderer ID and timestamp from real React commit", async ({ page }) => {
    await startRecording(page);
    await page.locator('[data-testid="count-button"]').click();
    await expect.poll(() => getRecorderUIState(page).then((s) => s.hasCommits)).toBe(true);

    const state = await getRecorderUIState(page);
    expect(state.latestCommitText).toMatch(/Renderer \d+ at /);
    expect(state.priorityText).not.toBe("n/a");
  });

  test("commit count accumulates across multiple clicks", async ({ page }) => {
    await startRecording(page);

    const button = page.locator('[data-testid="count-button"]');
    for (let i = 0; i < 5; i++) {
      await button.click();
    }

    await expect
      .poll(() => getRecorderUIState(page).then((s) => s.commitCount))
      .toBeGreaterThanOrEqual(5);
  });
});
