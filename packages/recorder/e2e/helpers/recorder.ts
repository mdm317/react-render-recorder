import { expect, type Locator, type Page } from "@playwright/test";

export const START_BUTTON_TEXT = "Start recording";
export const STOP_BUTTON_TEXT = "Stop recording";

type RecordButtonLabel = typeof START_BUTTON_TEXT | typeof STOP_BUTTON_TEXT;

export function recorderRoot(page: Page): Locator {
  return page.locator("#recorder-root");
}

export function recorderByTestId(page: Page, testId: string): Locator {
  return recorderRoot(page).getByTestId(testId);
}

export function recordButton(page: Page, label: RecordButtonLabel): Locator {
  return recorderRoot(page).getByRole("button", { name: label, exact: true });
}

export async function startRecording(page: Page) {
  await recordButton(page, START_BUTTON_TEXT).click();
  await expect(recordButton(page, STOP_BUTTON_TEXT)).toBeVisible();
}

export async function stopRecording(page: Page) {
  await recordButton(page, STOP_BUTTON_TEXT).click();
  await expect(recordButton(page, START_BUTTON_TEXT)).toBeVisible();
}

export async function recordCycle(page: Page, actions: () => Promise<void>) {
  await startRecording(page);
  await actions();
  await stopRecording(page);
}

async function waitForMacrotaskFlush(page: Page) {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        const first = new MessageChannel();
        first.port1.onmessage = () => {
          const second = new MessageChannel();
          second.port1.onmessage = () => resolve();
          second.port2.postMessage(null);
        };
        first.port2.postMessage(null);
      }),
  );
}

export async function clickTimes(page: Page, testId: string, times: number) {
  const button = page.getByTestId(testId);
  for (let i = 0; i < times; i += 1) {
    await button.click();
    if (i < times - 1) {
      await waitForMacrotaskFlush(page);
    }
  }
}

export async function fillRecorderComponentFilter(page: Page, value: string) {
  await recorderByTestId(page, "component-filter-input").fill(value);
}

export async function expectRecorderCommitCount(page: Page, count: number) {
  await expect(recorderByTestId(page, "commit-count")).toHaveText(`${count} commit(s)`);
}
