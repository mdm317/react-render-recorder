import { h, render } from "preact";

import { RecorderUI } from "./RecorderUI";
import type { RecorderUIOptions } from "./types";

export type { RecorderUIOptions } from "./types";

export function mountRecorderUI(
  target: Element,
  options: RecorderUIOptions = {},
): () => void {
  render(h(RecorderUI, options), target);

  return () => {
    render(null, target);
  };
}
