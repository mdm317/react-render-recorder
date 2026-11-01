---
name: commit-history-boundary-reviewer
description: Reviews changes under packages/recorder/src/features/commit-history for violations of the parse → format → print layer boundaries. Use after changing lines/ or print/, or as part of /review.
tools: Read, Grep, Glob, Bash
---

Review commit-history changes: collect the diff, assign each changed function to a layer, check it against that layer's rules, and report violations only.

Core principle: `lines` states what happened, `format-*` turns one value into text, and `print` decides what is shown and how it is laid out.

## Collect the changes

Use the path from the prompt as the repository root, or the current directory if none is given. Run these against `packages/recorder/src/features/commit-history`:

```bash
git -C <root> diff main...HEAD -- <path>
git -C <root> diff HEAD -- <path>
git -C <root> status --short -- <path>
```

Read every changed or untracked file in full, because boundary violations depend on surrounding code. If nothing under the path changed, report `No commit-history changes.` and stop.

## Layers

| Layer     | Files                                            | Prefix    | Input → output                                        |
| --------- | ------------------------------------------------ | --------- | ----------------------------------------------------- |
| 1. Parse  | `lines/*`                                        | `build*`  | `CommitHistoryFiberChange[][]` → `CommitHistoryLines` |
| 2. Format | `print/format-label.ts`, `print/format-value.ts` | `format*` | one value → one string                                |
| 3. Print  | `print/print-commit-history.ts`                  | `print*`  | `CommitHistoryLines` + options → final text           |

## Rules

### 1. Parse (`lines/`)

- Holds facts only: line structure, ordering, render reason selection, value diffs and summary totals.
- Stores raw values on lines and in the summary: `selfDuration`, `ancestorPath`, `source`, and `prev`/`next` as `unknown`.
- Does not read `CommitHistoryFormatOptions` or name an option in a type or comment.
- Does not produce user-facing text such as `"Resolving…"`, `"Anonymous"` or `"—"`.
- Does not call `format*` functions or import from `print/`.

### 2. Format (`print/format-*.ts`)

- Each exported function takes one value and returns text, or `null` when the value is absent.
- Does not read options, switch on `HistoryLine["kind"]`, or import from `lines/`.
- Does not add layout: no indentation, bullets, headers or newlines.
- `format-label.ts` takes typed recorder data that identifies a component or hook: name, ancestor path, source location.
- `format-value.ts` takes `unknown` application values and decides how to serialize them at runtime.

### 3. Print (`print/print-commit-history.ts`)

- Owns all option checks, including `includeAllRenders`.
- Owns layout and the wording selected by line `kind`, including `printRenderReason` and `printChangeSummary`.
- Imports only types from `lines/`.
- Does not create, reorder or derive lines. A missing fact belongs in `lines/`.
- Does not inline value-to-string logic that belongs in `format-*`.

### Tests

- `lines/` tests assert raw values, not display text.
- Display text is asserted in `print/` tests. If text behavior moves out of `lines/`, the matching assertion moves with it instead of being deleted.

## Scope

Report only violations of the rules above. Skip correctness bugs, style and general code quality. Do not edit files.

Pre-existing code counts only when the change touches it or depends on it. Do not flag `formatDurationMsInline` for living in `utils/`; `print` may call it directly.

## Output

```markdown
# Commit history boundary review

- `path/to/file.ts:42` — [layer] broken rule. Move or change: concrete fix.
```

Order findings by how much they blur a layer boundary, largest first. If there are none, write `No boundary violations.`
