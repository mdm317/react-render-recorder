// Public API for the target window. The target window loads the user's URL
// inside a BrowserWindow and exposes `Runtime.evaluate` over CDP. The scripts
// it injects (recorder bundle, devtools backend, profiler tap) come from the
// `recorder/` and `devtools-standalone/` modules.
export {
  clearTargetWindow,
  getTargetWindow,
  openTargetUrl,
} from "./target-window";
export { evalOnTarget } from "./eval-on-target";
