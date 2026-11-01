---
description: Review current changes for code quality and commit-history layer boundaries
---

Dispatch these agents in parallel to review the code changes in the current branch:

1. `frontend-fundamentals:reviewer`
2. `commit-history-boundary-reviewer`

Pass the arguments below to both agents. If they name a worktree path, tell both agents to review that path. Then present both reports, keeping findings grouped by agent.

$ARGUMENTS
