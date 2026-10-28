# Apply one fix

Apply the single candidate you were given to the original code, measure it against the baseline, save it as a stash, and leave the working tree as you found it.

Read `../../../references/recorder-api.md` and `../../../references/measurement.md`, relative to this file, before recording.

1. Run `git status`. If a file you plan to edit already has uncommitted changes, stop and return `discarded` with that reason.
2. Apply the fix.
3. Run the whole replay script you were given, not just the target step, until every step's counts repeat run to run.
4. Run the tests covering what you touched.
5. Check the screen still behaves as before.
6. If the target step improved, no other step regressed, and nothing broke, stash only your files:
   `git stash push -u -m "improve-perf: <candidate>" -- <files you changed>`
   Otherwise discard your edits: `git checkout -- <files>`, and delete any files you created. If a step regressed, name it and its numbers in the reason.
7. Run `git status` and confirm none of your files remain changed.

Never commit or push.

Return:

- `stashed` or `discarded` (with the reason)
- the stash message
- the full per-step table, before → after
- the files you changed and the tests you ran
