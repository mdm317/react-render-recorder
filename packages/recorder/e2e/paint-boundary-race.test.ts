import { expect, test } from "@playwright/test";

import { recordButton, START_BUTTON_TEXT, startRecording, stopRecording } from "./helpers/recorder";

// One click on ChainedTaskRenderButton produces three commits across two
// boundary paths:
//   commits 0-1 (click task + layout-effect cascade) are input-dispatch
//   commits, closed as one group by the frame marker rAF;
//   commit 2 (setSecond scheduled from the button's rAF, flushed in a React
//   scheduler task) is a non-dispatch commit, closed at the end of its own
//   task by the coalesced microtask.
// Expected groups: [0,1][2] → boundaries [1, 2].
test("input-dispatch commits and scheduler-task commits split into separate groups", async ({
  page,
}) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(recordButton(page, START_BUTTON_TEXT)).toBeVisible();

  await startRecording(page);
  await page.getByTestId("chained-task-render-button").click();
  await stopRecording(page);

  const paintCommitIndices = await page.evaluate(() =>
    (
      window as unknown as {
        __REACT_RENDER_RECORDER__: { getPaintCommitIndices: () => number[] };
      }
    ).__REACT_RENDER_RECORDER__.getPaintCommitIndices(),
  );
  expect(paintCommitIndices).toEqual([1, 2]);
});
