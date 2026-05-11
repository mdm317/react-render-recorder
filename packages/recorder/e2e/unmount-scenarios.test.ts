import { expect, test } from "@playwright/test";

import {
  expectRecorderCommitCount,
  recordButton,
  recorderByTestId,
  recordCycle,
  START_BUTTON_TEXT,
} from "./helpers/recorder";

const CHILD_UPDATE = "unmount-child-update";
const CHILD_UNMOUNT = "unmount-child-unmount";
const PARENT_UPDATE = "unmount-parent-update";

async function runThreeStep(page: import("@playwright/test").Page) {
  await page.getByTestId(CHILD_UPDATE).click();
  await page.getByTestId(CHILD_UNMOUNT).click();
  await page.getByTestId(PARENT_UPDATE).click();
}

test.describe.configure({ mode: "parallel" });

test.describe("unmount-before-flush scenarios", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(recordButton(page, START_BUTTON_TEXT)).toBeVisible();
  });

  test("3-step sequence: child update → child unmount → parent update produces 3 commits without crash", async ({
    page,
  }) => {
    const pageErrors: Error[] = [];
    page.on("pageerror", (err) => pageErrors.push(err));

    await recordCycle(page, () => runThreeStep(page));

    expect(pageErrors, pageErrors.map((e) => e.message).join("\n")).toHaveLength(0);
    await expectRecorderCommitCount(page, 3);
  });

  test("commit 1 records child-only hook change", async ({ page }) => {
    await recordCycle(page, () => runThreeStep(page));

    const result = recorderByTestId(page, "component-filter-result");
    await expect(result).toContainText("## Commit 1");
    await expect(result).toContainText("ForwardRef(UnmountReproChild)");
    await expect(result).toContainText("0 → 1");
  });

  test("commit 2 records parent's mounted hook flipping while the child fiber unmounts", async ({
    page,
  }) => {
    await recordCycle(page, () => runThreeStep(page));

    const result = recorderByTestId(page, "component-filter-result");
    await expect(result).toContainText("## Commit 2");
    await expect(result).toContainText("UnmountBeforeFlushPanel");
    await expect(result).toContainText("true → false");
  });

  test("commit 3 still records a parent update after the dangerous unmount", async ({ page }) => {
    await recordCycle(page, () => runThreeStep(page));

    const result = recorderByTestId(page, "component-filter-result");
    await expect(result).toContainText("## Commit 3");
    await expect(result).toContainText("UnmountBeforeFlushPanel");
    await expect(result).toContainText("0 → 1");
  });
});
