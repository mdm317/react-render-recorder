import { expect, type Page } from "@playwright/test";

export async function clickRecorderButton(
  page: Page,
  name: "Start recording" | "Stop recording",
) {
  await page.evaluate((buttonName) => {
    const root = document.getElementById("recorder-root");
    const button = root?.shadowRoot?.querySelector(`button[aria-label="${buttonName}"]`);

    if (!(button instanceof HTMLElement)) {
      throw new Error(`Recorder button "${buttonName}" not found in shadow DOM`);
    }

    button.click();
  }, name);
}

export async function getRecorderButtonLabel(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    const root = document.getElementById("recorder-root");
    const button = root?.shadowRoot?.querySelector(
      'button[aria-label="Start recording"], button[aria-label="Stop recording"]',
    );

    return button?.getAttribute("aria-label") ?? null;
  });
}

export async function fillRecorderComponentFilter(page: Page, value: string) {
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

export async function getRecorderTextContent(
  page: Page,
  testId: string,
): Promise<string | null> {
  return page.evaluate((targetTestId) => {
    const root = document.getElementById("recorder-root");
    const target = root?.shadowRoot?.querySelector(`[data-testid="${targetTestId}"]`);

    return target?.textContent ?? null;
  }, testId);
}

export async function getRecorderAttribute(
  page: Page,
  testId: string,
  attributeName: string,
): Promise<string | null> {
  return page.evaluate(
    ({ attributeName, targetTestId }) => {
      const root = document.getElementById("recorder-root");
      const target = root?.shadowRoot?.querySelector(`[data-testid="${targetTestId}"]`);

      return target?.getAttribute(attributeName) ?? null;
    },
    { attributeName, targetTestId: testId },
  );
}

export async function getRecorderElementHeight(
  page: Page,
  testId: string,
): Promise<number | null> {
  return page.evaluate((targetTestId) => {
    const root = document.getElementById("recorder-root");
    const target = root?.shadowRoot?.querySelector(`[data-testid="${targetTestId}"]`);

    if (!(target instanceof HTMLElement)) {
      return null;
    }

    return Math.round(target.getBoundingClientRect().height);
  }, testId);
}

export async function getRecorderFilterInputValue(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    const root = document.getElementById("recorder-root");
    const input = root?.shadowRoot?.querySelector('[data-testid="component-filter-input"]');

    return input instanceof HTMLInputElement ? input.value : null;
  });
}

export async function clickRecorderElementByTestId(page: Page, testId: string) {
  await page.evaluate((targetTestId) => {
    const root = document.getElementById("recorder-root");
    const target = root?.shadowRoot?.querySelector(`[data-testid="${targetTestId}"]`);

    if (!(target instanceof HTMLElement)) {
      throw new Error(`Recorder element "${targetTestId}" not found in shadow DOM`);
    }

    target.click();
  }, testId);
}

export async function recorderElementExists(page: Page, testId: string): Promise<boolean> {
  return page.evaluate((targetTestId) => {
    const root = document.getElementById("recorder-root");
    return root?.shadowRoot?.querySelector(`[data-testid="${targetTestId}"]`) != null;
  }, testId);
}

export async function startRecording(page: Page) {
  await clickRecorderButton(page, "Start recording");
  await expect.poll(() => getRecorderButtonLabel(page)).toBe("Stop recording");
}

export async function stopRecording(page: Page) {
  await clickRecorderButton(page, "Stop recording");
  await expect.poll(() => getRecorderButtonLabel(page)).toBe("Start recording");
}

export async function expectRecorderCommitCount(page: Page, count: number) {
  await expect.poll(() => getRecorderTextContent(page, "commit-count")).toBe(`${count} commit(s)`);
}
