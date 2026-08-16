# 08 — Team cheat sheet

> Print this. Pin it in the team channel. One page, everything a developer needs
> day to day.

---

## The rules

1. **Never push to `main` or `develop`.** (You can't — the server rejects it.)
2. **One branch per piece of work.** Branch off `develop`.
3. **`npm run verify` before every push.**
4. **Every change reaches `develop` through a pull request.**
5. **Keep PRs small.** Under 400 lines. If it's bigger, split it.
6. **Red CI is never merged.** Not once. Not "just this time".

---

## The loop

```bash
# ── start ───────────────────────────────────────────────────
git switch develop
git pull
git switch -c feature/short-description

# ── work ────────────────────────────────────────────────────
git status                        # constantly. it's free.
git add -p                        # stage hunk by hunk
git commit -m "feat(scope): what changed"

# ── before pushing ──────────────────────────────────────────
npm run verify                    # typecheck + lint + tests

# ── publish ─────────────────────────────────────────────────
git push -u origin feature/short-description
gh pr create --base develop --fill

# ── after review ────────────────────────────────────────────
git commit -m "fix(scope): address review" && git push
gh pr merge --squash --delete-branch

# ── clean up ────────────────────────────────────────────────
git switch develop && git pull
git branch -d feature/short-description
```

---

## Branch names

```
feature/add-task-priority     new functionality
fix/empty-title-crash         a bug fix
hotfix/login-500              urgent production fix (branch from main!)
docs/deployment-runbook       documentation
chore/bump-typescript         dependencies, tooling
refactor/extract-validation   restructuring, no behaviour change
```

## Commit messages

```
<type>(<scope>): <what changed, imperative>

feat(tasks): add priority field to task creation
fix(tasks): reject titles that are only whitespace
test(tasks): cover the empty-list case
docs(readme): document branch protection
chore(deps): bump vitest to 4.1
ci: fail the build when coverage drops below 80%
```

Types: `feat` `fix` `docs` `test` `refactor` `perf` `chore` `ci`

---

## Commands you'll use every day

| Need                        | Command                                  |
| --------------------------- | ---------------------------------------- |
| Where am I / what changed?  | `git status`                             |
| See history                 | `git log --oneline --graph --all`        |
| New branch                  | `git switch -c feature/x`                |
| Switch branch               | `git switch develop`                     |
| Stage everything            | `git add -A`                             |
| Stage interactively         | `git add -p`                             |
| Commit                      | `git commit -m "feat: ..."`              |
| Push (first time)           | `git push -u origin feature/x`           |
| Push (after)                | `git push`                               |
| Get latest                  | `git pull`                               |
| Park my work                | `git stash` / `git stash pop`            |
| Update branch from develop  | `git fetch origin && git rebase origin/develop` |
| Delete merged branch        | `git branch -d feature/x`                |
| Tidy dead remote branches   | `git fetch --prune`                      |

## GitHub CLI

| Need                | Command                              |
| ------------------- | ------------------------------------ |
| Open a PR           | `gh pr create --base develop --fill` |
| My PRs              | `gh pr status`                       |
| PRs waiting on me   | `gh pr list`                         |
| Watch CI            | `gh pr checks --watch`               |
| Why did CI fail?    | `gh run view --log-failed`           |
| Review someone's PR | `gh pr checkout 42` then run it      |
| Approve             | `gh pr review 42 --approve`          |
| Block               | `gh pr review 42 --request-changes -b "..."` |
| Merge               | `gh pr merge --squash --delete-branch` |
| Merge when green    | `gh pr merge --auto --squash`        |

---

## Panic button

| "Oh no..."                       | Fix                                                 |
| -------------------------------- | --------------------------------------------------- |
| Wrong branch, uncommitted work   | `git stash` → switch → `git stash pop`               |
| Bad last commit (not pushed)     | `git reset --soft HEAD~1`                            |
| Deleted commits                  | `git reflog` → `git reset --hard HEAD@{n}`           |
| Merge going wrong                | `git merge --abort`                                  |
| Rebase going wrong               | `git rebase --abort`                                 |
| Merged something broken          | `git revert -m 1 <merge-sha>`                        |
| Committed a secret               | **Rotate the credential immediately**, then ask for help |
| Totally lost                     | `git status` → `git log --oneline --graph --all`     |

**You almost certainly haven't lost anything.** Ask before running anything with
`--hard` or `--force` in it.

---

## One-time machine setup

```bash
git config --global user.name "Your Name"
git config --global user.email "you@company.com"
git config --global pull.ff only
git config --global init.defaultBranch main
git config --global rerere.enabled true
git config --global alias.lg "log --oneline --graph --all --decorate"
```

---

## Where things live

| What                | Where                                            |
| ------------------- | ------------------------------------------------ |
| Production          | `main` — deploys automatically on merge          |
| Staging             | `develop` — deploys automatically on merge       |
| Secrets (local)     | `.env` — never committed                         |
| Secrets (CI/CD)     | GitHub → Settings → Secrets and variables        |
| Database schema     | `supabase/migrations/` — applied by the pipeline |
| The pipeline        | `.github/workflows/`                             |
