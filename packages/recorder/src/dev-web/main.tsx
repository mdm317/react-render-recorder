import "./index.css";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { cleanupDevtools } from "./bootstrapDevtools";
import { App } from "./App";

const container = document.getElementById("root");

if (!container) {
  throw new Error("Root container #root was not found.");
}

const root = createRoot(container);

root.render(
  <StrictMode>
    <App />
  </StrictMode>,
);

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    cleanupDevtools();
    root.unmount();
  });
}
