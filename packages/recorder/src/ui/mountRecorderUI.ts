import { h, render } from "preact";

import { createRecorderStore } from "../store";
import { RecorderUI } from "./RecorderUI";
import type { RecorderUIOptions } from "./types";

export type { RecorderUIOptions } from "./types";

export function mountRecorderUI(
  target: Element,
  options: RecorderUIOptions = {},
): () => void {
  const store =
    options.store ?? createRecorderStore({ initialRecording: options.initialRecording });

  render(h(RecorderUI, { ...options, store }), target);

  return () => {
    render(null, target);
  };
}
