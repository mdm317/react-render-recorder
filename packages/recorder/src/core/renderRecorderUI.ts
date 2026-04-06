import { h, render } from "preact";

import { RecorderUI } from "../ui/RecorderUI";

function initRecorderRoot(): HTMLDivElement {
  const rootContainer = document.createElement("div");
  rootContainer.id = "recorder-root";

  Object.assign(rootContainer.style, {
    position: "fixed",
    bottom: "1rem",
    right: "1rem",
    zIndex: "2147483647",
  });

  const shadowRoot = rootContainer.attachShadow({ mode: "open" });
  const rootTarget = document.createElement("div");
  shadowRoot.appendChild(rootTarget);
  document.documentElement.appendChild(rootContainer);

  return rootTarget;
}

export function renderRecorderUI(): () => void {
  const target = initRecorderRoot();
  render(h(RecorderUI, { label: "react-record" }), target);

  return () => {
    render(null, target);
  };
}
