# 07 — Merge conflicts & getting out of trouble

> Two facts that make git much less scary:
>
> 1. A merge conflict is not an error. It's git saying *"two people changed the
>    same lines and I refuse to guess which one you meant."*
> 2. **Almost nothing committed is ever truly lost.** `git reflog` is your
>    undo history, and it remembers for ~90 days.

---

## Part 1 — Merge conflicts

### What one looks like

```bash
$ git merge origin/develop
Auto-merging src/tasks/tasks.service.ts
CONFLICT (content): Merge conflict in src/tasks/tasks.service.ts
Automatic merge failed; fix conflicts and then commit the result.
```

Open the file:

```typescript
<<<<<<< HEAD
export const MAX_TITLE_LENGTH = 120;
=======
export const MAX_TITLE_LENGTH = 200;
>>>>>>> origin/develop
```

| Marker         | Meaning                                          |
| -------------- | ------------------------------------------------ |
| `<<<<<<< HEAD` | Start of **your** version (the branch you're on) |
| `=======`      | The divider                                      |
| `>>>>>>> ...`  | End of **their** version (what you're merging in) |

### Resolving it

1. **See the damage:** `git status` — the "Unmerged paths" list is your to-do list.
2. **Open each file.** Decide what the code *should* be — that may be yours,
   theirs, or something new that combines both.
3. **Delete all three markers.** `<<<<<<<`, `=======`, `>>>>>>>` must be gone.
   (A leftover marker is a syntax error — which is one more reason CI is useful.)
4. **Verify it actually works:** `npm run verify`
5. **Mark it resolved and finish:**

```bash
git add src/tasks/tasks.service.ts
git commit                 # for a merge — git pre-fills a sensible message
# or, if you're rebasing:
git rebase --continue
```

**Panicking? Just stop:**

```bash
git merge --abort      # back to exactly where you were
git rebase --abort
```

Nothing is lost. You can always try again.

### Helpful tools

```bash
git checkout --ours   src/file.ts   # take MY version wholesale
git checkout --theirs src/file.ts   # take THEIR version wholesale
git diff --name-only --diff-filter=U   # list only the conflicted files
git mergetool                          # open your configured 3-way merge tool
```

> ⚠️ "ours" and "theirs" **swap meaning during a rebase**, because a rebase
> replays your commits on top of theirs — so "ours" becomes the branch you're
> rebasing *onto*. When in doubt, edit the file by hand instead.

VS Code has a good built-in conflict UI ("Accept Current / Incoming / Both") and
a 3-way merge editor — worth showing your team, it removes most of the fear.

### How to have fewer conflicts

| Practice                                | Why it works                                              |
| --------------------------------------- | --------------------------------------------------------- |
| **Short-lived branches (< 3 days)**     | Less time for the world to move under you                  |
| **Sync with `develop` daily**           | Ten tiny conflicts instead of one enormous one             |
| **Small PRs**                           | Fewer lines touched = fewer collisions                     |
| **Agreed file ownership**               | Two people rewriting the same file the same week is avoidable |
| **A committed formatter config**        | Kills the "conflict" that's really just different formatting |
| `git config --global rerere.enabled true` | Git remembers how you resolved a conflict and reapplies it |

---

## Part 2 — Undoing things

The most important table in this document. **What do you want to undo?**

### I haven't committed yet

```bash
git restore src/file.ts              # throw away changes to one file (UNRECOVERABLE)
git restore .                        # throw away ALL uncommitted changes
git restore --staged src/file.ts     # unstage, but keep my edits
git stash                            # put everything aside safely
git stash pop                        # ...and bring it back
```

`git stash` is the safe alternative to `git restore` — it hides your work
instead of destroying it. Teach that one first.

### I committed, but haven't pushed

```bash
git commit --amend                          # fix the message, or add a forgotten file
git commit --amend --no-edit                # add staged changes to the last commit, same message

git reset --soft HEAD~1                     # undo the commit, KEEP changes staged
git reset HEAD~1                            # undo the commit, keep changes unstaged
git reset --hard HEAD~1                     # undo the commit AND destroy the changes ⚠️
```

> Rule: **`--amend` and `reset` are safe on commits you have not pushed.** Once
> pushed and shared, rewriting history forces everyone else to clean up.

### I pushed, and it's on a shared branch

Do **not** rewrite history. Add a new commit that undoes the old one:

```bash
git revert <sha>              # creates a NEW commit that reverses that one
git push
```

`revert` is safe, honest, and reviewable — history keeps both the mistake and
the fix, which is exactly what you want during an incident.

Reverting an entire merged PR:

```bash
git revert -m 1 <merge-commit-sha>    # -m 1 = keep the base branch's side
```

Or just click **"Revert"** on the merged PR in GitHub — it opens a revert PR for
you, which then goes through review and CI like anything else.

### I committed to the wrong branch

Classic: you did the work on `develop` instead of a feature branch.

```bash
git switch -c feature/my-work    # bring the commits onto a new branch
git switch develop
git reset --hard origin/develop  # put develop back to what GitHub has
git switch feature/my-work       # carry on
```

### I need one commit from another branch

```bash
git log --oneline other-branch    # find the sha
git cherry-pick <sha>
```

Useful for hotfixes: fix on `main`, cherry-pick into `develop`.

---

## Part 3 — `git reflog`, the actual undo button

**`git reflog` is the thing that makes git safe.** Every time `HEAD` moves —
commit, checkout, reset, rebase, merge — git writes it down.

```bash
$ git reflog
a3f9c21 HEAD@{0}: reset: moving to HEAD~3
b8e2d14 HEAD@{1}: commit: feat(tasks): add priority
c7d1a09 HEAD@{2}: commit: test(tasks): cover priority
d6c0f98 HEAD@{3}: checkout: moving from develop to feature/priority
```

Just destroyed three commits with `reset --hard`? They're right there at
`HEAD@{1}`:

```bash
git reset --hard HEAD@{1}      # back to before the reset
git switch -c rescue b8e2d14   # or put them on a fresh branch
```

Deleted a branch by mistake? Find its last commit in the reflog and recreate it:

```bash
git reflog
git switch -c feature/i-deleted-this b8e2d14
```

> **Tell your team about `reflog` on day one.** It converts "I destroyed two days
> of work" into a 30-second fix, and it's the single biggest source of
> git-related fear.
>
> The one thing reflog can't save: changes you **never committed**. That's the
> real argument for committing often.

---

## Part 4 — Investigating

```bash
git log --oneline --graph --all          # the shape of history
git log -p src/tasks/tasks.service.ts    # every change to this file, with diffs
git log -S "MAX_TITLE_LENGTH"            # commits that added/removed this string
git log --author="Sara" --since="2 weeks ago"
git blame src/tasks/tasks.service.ts     # who last changed each line, in which commit
git show <sha>                           # what exactly did that commit do?
```

### `git bisect` — find the commit that broke it

When something broke somewhere in the last 200 commits, binary-search it:

```bash
git bisect start
git bisect bad                  # current state is broken
git bisect good v1.2.0          # this tag was fine
# git checks out a commit halfway between; test it, then:
git bisect good                 # or: git bisect bad
# repeat ~8 times for 200 commits
git bisect reset                # done — back to where you started
```

Automate it if the failure is scriptable:

```bash
git bisect start HEAD v1.2.0
git bisect run npm test
```

Git finds the exact culprit commit on its own. This is the payoff for small,
atomic commits — bisect can only point at a commit, so a commit that changed 40
files tells you much less than one that changed 3.

---

## Emergency cheat sheet

| Situation                                | Command                                             |
| ---------------------------------------- | --------------------------------------------------- |
| "I need to switch branches right now"    | `git stash` → switch → `git stash pop`               |
| "I broke everything, reset me"           | `git reset --hard origin/<branch>` ⚠️ discards local |
| "I deleted commits"                      | `git reflog` → `git reset --hard HEAD@{n}`           |
| "I committed a secret"                   | **Rotate the credential first.** Then clean history  |
| "This merge is going badly"              | `git merge --abort`                                  |
| "This rebase is going badly"             | `git rebase --abort`                                 |
| "I merged a broken PR"                   | `git revert -m 1 <merge-sha>` (or GitHub's Revert)   |
| "What on earth is going on"              | `git status` then `git log --oneline --graph --all`  |

---

**Next:** [08 — Team cheat sheet →](08-team-cheatsheet.md)
