// `<script>` tag that loads the react-devtools-standalone backend bundle
// served by the standalone DevTools window. The backend installs
// `__REACT_DEVTOOLS_GLOBAL_HOOK__` in the target page, so this tag must be
// in `<head>` before any React code runs.
export function buildDevtoolsBackendScriptTag(host: string, port: number): string {
  return `<script src="http://${host}:${port}"></script>`;
}
