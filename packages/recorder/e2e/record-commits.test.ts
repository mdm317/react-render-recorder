import { expect, test, type Page } from "@playwright/test";

async function clickRecorderButton(page: Page, name: "Start recording" | "Stop recording") {
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

async function getRecorderButtonLabel(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    const root = document.getElementById("recorder-root");
    const button = root?.shadowRoot?.querySelector("button[aria-label]");

    return button?.getAttribute("aria-label") ?? null;
  });
}

async function fillRecorderComponentFilter(page: Page, value: string) {
  await page.evaluate((nextValue) => {
    const root = document.getElementById("recorder-root");
    const input = root?.shadowRoot?.querySelector('[data-testid="component-filter-input"]');

    if (!(input instanceof HTMLInputElement)) {
      throw new Error("Recorder component filter input not found in shadow DOM");
    }

    input.value = nextValue;
    input.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
  }, value);
}

async function getRecorderTextContent(page: Page, testId: string): Promise<string | null> {
  return page.evaluate((targetTestId) => {
    const root = document.getElementById("recorder-root");
    const target = root?.shadowRoot?.querySelector(`[data-testid="${targetTestId}"]`);

    return target?.textContent ?? null;
  }, testId);
}

async function getRecorderFilterInputValue(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    const root = document.getElementById("recorder-root");
    const input = root?.shadowRoot?.querySelector('[data-testid="component-filter-input"]');

    return input instanceof HTMLInputElement ? input.value : null;
  });
}

async function clickRecorderElementByTestId(page: Page, testId: string) {
  await page.evaluate((targetTestId) => {
    const root = document.getElementById("recorder-root");
    const target = root?.shadowRoot?.querySelector(`[data-testid="${targetTestId}"]`);

    if (!(target instanceof HTMLElement)) {
      throw new Error(`Recorder element "${targetTestId}" not found in shadow DOM`);
    }

    target.click();
  }, testId);
}

async function recorderElementExists(page: Page, testId: string): Promise<boolean> {
  return page.evaluate((targetTestId) => {
    const root = document.getElementById("recorder-root");
    return root?.shadowRoot?.querySelector(`[data-testid="${targetTestId}"]`) != null;
  }, testId);
}

async function startRecording(page: Page) {
  await clickRecorderButton(page, "Start recording");
  await expect.poll(() => getRecorderButtonLabel(page)).toBe("Stop recording");
}

async function stopRecording(page: Page) {
  await clickRecorderButton(page, "Stop recording");
  await expect.poll(() => getRecorderButtonLabel(page)).toBe("Start recording");
}

async function expectRecorderCommitCount(page: Page, count: number) {
  await expect.poll(() => getRecorderTextContent(page, "commit-count")).toBe(`${count} commit(s)`);
}

test.describe("react-record E2E", () => {
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
    await expectRecorderCommitCount(page, 2);
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

    await expectRecorderCommitCount(page, 1);
    await expect.poll(() => getRecorderTextContent(page, "component-filter-result")).toContain(
      "Component App",
    );
    await expect
      .poll(() => getRecorderTextContent(page, "component-filter-result"))
      .not.toContain("No hook changes were recorded.");
  });

  test("recorded hook history includes hook names", async ({ page }) => {
    await startRecording(page);

    const button = page.getByTestId("count-button").first();
    await button.click();

    await stopRecording(page);

    await expectRecorderCommitCount(page, 1);
    await expect.poll(() => getRecorderTextContent(page, "component-filter-result")).toContain(
      "Hook 1 (CounterState(0) > State)",
    );
    await expect.poll(() => getRecorderTextContent(page, "component-filter-result")).toContain(
      'Commit 0: 0 -> 1',
    );
  });

  test("multiple clicks continue to accumulate commits", async ({ page }) => {
    await startRecording(page);

    const button = page.getByTestId("count-button").first();
    for (let index = 0; index < 5; index += 1) {
      await button.click();
    }

    await stopRecording(page);
    await expectRecorderCommitCount(page, 5);
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

    await expectRecorderCommitCount(page, 1);
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

    await expectRecorderCommitCount(page, 3);
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
      .toContain("Commit 0");
  });
});
