import { h, render } from "preact";

import { RecorderButton } from "../ui/RecorderButton";
import recorderStyles from "../ui/recorder.css?inline";

function attachRecorderStyles(shadowRoot: ShadowRoot): () => void {
  let cleanupStyles: () => void;

  try {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(recorderStyles);
    shadowRoot.adoptedStyleSheets = [...shadowRoot.adoptedStyleSheets, sheet];

    cleanupStyles = function cleanupAdoptedStyles() {
      shadowRoot.adoptedStyleSheets = shadowRoot.adoptedStyleSheets.filter(
        (candidate) => candidate !== sheet,
      );
    };
  } catch {
    const styleTag = document.createElement("style");
    styleTag.textContent = recorderStyles;
    shadowRoot.prepend(styleTag);

    cleanupStyles = function cleanupStyleTag() {
      styleTag.remove();
    };
  }

  return cleanupStyles;
}

function initRecorderRoot(): {
  rootContainer: HTMLDivElement;
  rootTarget: HTMLDivElement;
  cleanupStyles: () => void;
} {
  const rootContainer = document.createElement("div");
  rootContainer.id = "recorder-root";

  Object.assign(rootContainer.style, {
    position: "fixed",
    bottom: "1rem",
    right: "1rem",
    zIndex: "2147483647",
  });

  const shadowRoot = rootContainer.attachShadow({ mode: "open" });
  const cleanupStyles = attachRecorderStyles(shadowRoot);
  const rootTarget = document.createElement("div");
  shadowRoot.appendChild(rootTarget);
  document.documentElement.appendChild(rootContainer);

  return { rootContainer, rootTarget, cleanupStyles };
}

export function renderRecorderUI(): () => void {
  const { rootContainer, rootTarget, cleanupStyles } = initRecorderRoot();
  render(h(RecorderButton, {}), rootTarget);

  function cleanupRecorderUI() {
    render(null, rootTarget);
    cleanupStyles();
    rootContainer.remove();
  }

  return cleanupRecorderUI;
}
