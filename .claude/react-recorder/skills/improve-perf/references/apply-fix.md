# Apply one fix

Apply the single candidate you were given to the original code, measure it against the baseline, save it as a stash, and leave the working tree as you found it.

Read `../../../references/recorder-api.md`, relative to this file, before recording.

1. Run `git status`. If a file you plan to edit already has uncommitted changes, stop and return `discarded` with that reason.
2. Apply the fix.
3. Re-record the exact steps you were given until the counts in `## Summary` repeat run to run.
4. Run the tests covering what you touched.
5. Check the screen still behaves as before.
6. If the counts dropped and nothing broke, stash only your files:
   `git stash push -u -m "improve-perf: <candidate>" -- <files you changed>`
   Otherwise discard your edits: `git checkout -- <files>`, and delete any files you created.
7. Run `git status` and confirm none of your files remain changed.

Never commit or push.

Return:

- `stashed` or `discarded` (with the reason)
- the stash message
- the numbers before and after
- the files you changed and the tests you ran
