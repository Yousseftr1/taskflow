# 02 — The daily workflow

> This is the loop. Every developer on your team repeats it, every day, for
> every piece of work. Learn it until it's muscle memory, then teach it.

---

## The whole thing on one screen

```bash
# 1. Start from an up-to-date develop
git switch develop
git pull

# 2. Branch for the work
git switch -c feature/add-task-priority

# 3. Work. Commit in small, meaningful steps.
git add src/tasks/tasks.service.ts
git commit -m "feat(tasks): add priority to the task model"

# 4. Prove it works BEFORE you bother anyone
npm run verify

# 5. Publish your branch
git push -u origin feature/add-task-priority

# 6. Open a pull request into develop
gh pr create --base develop --fill

# 7. CI runs. A human reviews. You fix what they raise.
git commit -m "fix(tasks): handle a missing priority" && git push

# 8. Merge (via GitHub — never locally)
gh pr merge --squash --delete-branch

# 9. Clean up locally
git switch develop
git pull
git branch -d feature/add-task-priority
```

Now let's go through why each step is the way it is.

---

## Step 0 — One-time setup on each developer's machine

```bash
git config --global user.name "Their Real Name"
git config --global user.email "their@company-email.com"

# Only ever fast-forward on pull; if it can't, stop and let me decide.
# This prevents the surprise merge commits that confuse people.
git config --global pull.ff only

# Push only the branch I'm on, and only if it has the same name upstream.
git config --global push.default simple

# Remember which conflicts I already resolved, and reuse the resolution.
git config --global rerere.enabled true

# New repos start on "main", not "master".
git config --global init.defaultBranch main
```

> The email matters: GitHub links commits to accounts by email. Wrong email =
> commits that don't show up as that person's work.

---

## Step 1 — Always start from a fresh base

```bash
git switch develop
git pull
```

**Why it matters:** if you branch off a stale `develop`, you're building on code
that's a week old. When you finally open the PR you get a merge conflict that
had nothing to do with your work.

Branch off `develop` — **not** `main`. `main` is production; `develop` is where
work integrates.

---

## Step 2 — One branch per piece of work

```bash
git switch -c feature/add-task-priority
```

### Branch naming convention

```
<type>/<short-kebab-case-description>
```

| Prefix      | For                             | Example                          |
| ----------- | ------------------------------- | -------------------------------- |
| `feature/`  | New functionality               | `feature/add-task-priority`      |
| `fix/`      | A bug fix                       | `fix/empty-title-crash`          |
| `hotfix/`   | Urgent production fix           | `hotfix/login-500`               |
| `docs/`     | Documentation                   | `docs/deployment-runbook`        |
| `chore/`    | Tooling, dependencies           | `chore/bump-typescript`          |
| `refactor/` | Restructuring, no behaviour change | `refactor/extract-validation` |

Include the ticket number if you use a tracker: `feature/PROJ-142-task-priority`.

**Rule of thumb: a branch should live for less than 3 days.** A branch that
lives for three weeks is a merge conflict with a countdown timer on it.

---

## Step 3 — Commit small, commit often

A commit should be one logical change that you could describe in one sentence
without using the word "and".

```bash
git status                       # what changed?
git diff                         # read your own work before committing it
git add src/tasks/types.ts
git commit -m "feat(tasks): add the Priority type"

git add src/tasks/tasks.service.ts
git commit -m "feat(tasks): validate priority on create"

git add src/tasks/tasks.service.test.ts
git commit -m "test(tasks): cover priority validation"
```

Three small commits beat one giant `feat: priority stuff`, because:

- a reviewer can follow your reasoning step by step
- `git revert` can undo *one* of them if only that part was wrong
- `git bisect` can pinpoint which one broke production

**Commit locally as often as you like — nobody sees it until you push.** Local
commits are your safety net; use them freely.

---

## Step 4 — Verify before you push

```bash
npm run verify     # typecheck + lint + tests — exactly what CI will run
```

**This is the single highest-value habit to teach your team.** CI takes ~2
minutes; running it locally takes ~5 seconds. Pushing red code wastes CI
minutes, wastes reviewer attention, and trains people to ignore red checks —
which is how a broken build eventually gets merged.

---

## Step 5 — Push your branch

```bash
git push -u origin feature/add-task-priority
```

- `-u` (`--set-upstream`) links your local branch to the GitHub one. **Only
  needed on the first push** of a branch — after that, plain `git push` works.
- Your branch on GitHub is a *backup* as much as a publication. Push at the end
  of the day even if the work isn't finished; a dead laptop shouldn't cost you
  two days.

---

## Step 6 — Open a pull request

```bash
gh pr create --base develop --fill        # --fill uses your commits for title/body
gh pr create --base develop --draft       # a Draft PR: "not ready, don't review yet"
gh pr create --base develop --web         # open the browser form instead
```

Note `--base develop`. If you open a PR into `main` by accident, you're asking
to ship straight to production.

Details in [03 — Pull requests](03-pull-requests.md).

---

## Step 7 — Respond to CI and to review

Check the robots:

```bash
gh pr checks --watch     # live view of the CI jobs
gh pr view --web         # open the PR in the browser
```

Something failed? Reproduce it locally — CI runs exactly `npm run verify`:

```bash
npm run verify
```

Fix it, and just push again. **The pull request updates automatically** — a PR
tracks a *branch*, not a fixed snapshot. Every push re-runs CI and shows the
reviewer the new state.

```bash
git add -A
git commit -m "fix(tasks): reject negative priorities"
git push
```

If `develop` has moved on while you were working:

```bash
git fetch origin
git rebase origin/develop     # replay my commits on top of the new develop
# or, if the team prefers merge commits:
git merge origin/develop
```

See [07 — Conflicts & recovery](07-conflicts-and-recovery.md) if that produces
conflicts.

---

## Step 8 — Merge through GitHub, never locally

```bash
gh pr merge --squash --delete-branch
```

**Never do this:**

```bash
git switch develop && git merge feature/x && git push    # ❌ bypasses review AND CI
```

That is exactly the habit that's breaking your production today. Once branch
protection is on ([05](05-protecting-main.md)), GitHub will reject that push
anyway — but the point is to understand *why* it's rejected.

### Which merge button?

| Strategy         | What lands on `develop`                    | Use it when                                 |
| ---------------- | ------------------------------------------ | ------------------------------------------- |
| **Squash merge** | 1 clean commit, whatever the PR's history  | **Default.** Best for feature branches      |
| **Merge commit** | All commits + a merge commit               | `develop` → `main` releases                 |
| **Rebase merge** | All commits, replayed, no merge commit     | You want linear history and clean commits   |

Recommendation for your team: **squash for feature → develop**, **merge commit
for develop → main**. Squashing keeps `develop` readable; the merge commit for
releases gives you a clear "this is what shipped" marker.

---

## Step 9 — Clean up

```bash
git switch develop
git pull                                       # get your merged work back locally
git branch -d feature/add-task-priority        # delete the local branch
git fetch --prune                              # forget remote branches that are gone
```

`git branch -d` refuses if the branch isn't merged. That's a feature — it's
protecting you. (`-D` forces it; use only when you're sure you're discarding.)

---

## Releasing: `develop` → `main`

When staging looks good, ship it — as a pull request, like everything else:

```bash
gh pr create --base main --head develop \
  --title "release: v1.2.0" \
  --body "Includes #12, #14, #15"
```

Review it, merge it, and the [deploy pipeline](06-ci-cd.md) puts it in
production. `main` therefore only ever contains reviewed, CI-verified,
staging-tested code.

---

## Hotfixes — the one exception, done properly

Production is on fire and `develop` contains half-finished work you can't ship.

```bash
git switch main
git pull
git switch -c hotfix/login-500        # branch from MAIN, not develop

# fix it, with a test that proves the bug
npm run verify
git push -u origin hotfix/login-500

gh pr create --base main --title "hotfix: stop 500 on login"
# fast review, merge -> production deploy

# CRITICAL: put the fix back into develop, or the next release re-breaks it
git switch develop
git pull
git merge main
git push
```

That last step is the one teams forget. Skipping it means the next release
silently reintroduces the bug you just fixed.

---

**Next:** [03 — Pull requests →](03-pull-requests.md)
