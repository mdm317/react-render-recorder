# Changelog

## [0.2.2](https://github.com/mdm317/react-render-recorder/compare/v0.2.1...v0.2.2) (2026-10-29)


### ⚠ BREAKING CHANGES

* **recorder:** getPaintCommitIndices() and getCommitHistoryTextByPaint() are no longer exposed on the browser API.

### Features

* **recorder:** remove paint browser APIs and test getCommitHistoryText options ([41a059d](https://github.com/mdm317/react-render-recorder/commit/41a059d482d51c29fdce8ed63e9d9a837ae2ee33))


### Bug Fixes

* **recorder:** remove paint browser APIs and test getCommitHistoryText options ([6269dfc](https://github.com/mdm317/react-render-recorder/commit/6269dfc29c72388a40b1d52e5260ac44edde1550))

## [0.2.1](https://github.com/mdm317/react-render-recorder/compare/v0.2.0...v0.2.1) (2026-10-28)


### Bug Fixes

* **recorder:** count every render in the summary regardless of view options ([0f57e71](https://github.com/mdm317/react-render-recorder/commit/0f57e710a4242b5c913921c236529564e8128e00))

## [0.2.0](https://github.com/mdm317/react-render-recorder/compare/v0.1.6...v0.2.0) (2026-10-28)


### Features

* improve source path display and label library code ([3081e1c](https://github.com/mdm317/react-render-recorder/commit/3081e1ca4a96f3ea121e718a21c3d1a2920080b7))
* **recorder:** add "Show all renders" option with DevTools render reasons ([5812d86](https://github.com/mdm317/react-render-recorder/commit/5812d866b26848f36769316aed4580515d9878e9))
* **recorder:** add record URL auto-start option ([bcd65ac](https://github.com/mdm317/react-render-recorder/commit/bcd65ac3249b3a33a0f5ae1815c6499e21f7d40a))
* **recorder:** add source option ([04f6c9c](https://github.com/mdm317/react-render-recorder/commit/04f6c9c277c8e5ad3274ce93c09e204df144eacb))
* **recorder:** show hook source locations in commit history ([e63503a](https://github.com/mdm317/react-render-recorder/commit/e63503aa1a1b5e83d5f84307681c4101129f969f))


### Bug Fixes

* **devtools-custom:** support data URL source maps ([8065364](https://github.com/mdm317/react-render-recorder/commit/806536414e438f5d1ebc08679da4b020c0f0ecff))
* inspectSymbolicateSource ([bee625d](https://github.com/mdm317/react-render-recorder/commit/bee625d096312263b34f153cd1a70520173a277c))
* **recorder:** sort rerenders by render duration ([13511cc](https://github.com/mdm317/react-render-recorder/commit/13511cc846197cfcf26885d79366a8d555296954))

## [0.1.6](https://github.com/mdm317/react-render-recorder/compare/v0.1.5...v0.1.6) (2026-06-23)

### Bug Fixes

- **recorder:** count summary by number of rerenders instead of hook-changed components ([638217e](https://github.com/mdm317/react-render-recorder/commit/638217e4cf08a1ffa1199373865369cdab8ecdc2))
