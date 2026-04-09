import "./index.css";
import "./install-recorder";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./app";

const container = document.getElementById("root");

if (!container) {
  throw new Error("Root container #root was not found.");
}

const root = createRoot(container);

function renderApp() {
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

renderApp();

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    root.unmount();
  });
}
