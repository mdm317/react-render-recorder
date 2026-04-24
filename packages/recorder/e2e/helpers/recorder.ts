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

export async function fillRecorderComponentFilter(page: Page, value: string) {
  await recorderByTestId(page, "component-filter-input").fill(value);
}

export async function expectRecorderCommitCount(page: Page, count: number) {
  await expect(recorderByTestId(page, "commit-count")).toHaveText(`${count} commit(s)`);
}
