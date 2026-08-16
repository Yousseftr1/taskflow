# 03 — Pull requests

> A pull request is a **request to pull my branch into yours**. It's three
> things at once: a code review tool, a CI trigger, and a permanent record of
> why a change was made.

---

## What a PR actually is

A PR is not a snapshot of your code. It is a **live link to a branch**:

```
feature/add-task-priority  ──PR──►  develop
        │
        └─ every push updates the PR, re-runs CI, and notifies reviewers
```

That's why "push a fix and the PR updates itself" works. You never close and
reopen a PR to update it.

Once created, a PR gives you:

- a **diff** — every line changed, commentable line by line
- **CI checks** — the robot's verdict, green or red
- **conversation** — decisions recorded next to the code forever
- a **merge button** — gated by whatever rules you set in [05](05-protecting-main.md)

---

## Opening one

```bash
gh pr create --base develop --fill
```

| Flag                    | Meaning                                                |
| ----------------------- | ------------------------------------------------------ |
| `--base develop`        | Where it will be merged **into**. Get this right        |
| `--fill`                | Auto-fill title/body from your commits                  |
| `--draft`               | Mark as work in progress — CI runs, reviewers aren't pinged |
| `--reviewer user1,user2`| Request reviews immediately                             |
| `--web`                 | Open the browser form instead                           |
| `--title` / `--body`    | Set them explicitly                                     |

Useful once it's open:

```bash
gh pr status              # all your PRs and their check status
gh pr view                # this branch's PR in the terminal
gh pr view --web          # ...in the browser
gh pr checks --watch      # live CI status
gh pr diff                # the diff, in the terminal
gh pr ready               # flip a draft to ready-for-review
```

---

## What makes a PR easy to approve

### 1. It is small

This is the whole game. Review quality falls off a cliff with size:

| PR size          | What actually happens                                     |
| ---------------- | --------------------------------------------------------- |
| < 100 lines      | Reviewed carefully. Real bugs get caught                   |
| 100–500 lines    | Reviewed reasonably. Some things slip                     |
| 500–1000 lines   | Skimmed. "Looks good to me"                                |
| > 1000 lines     | Rubber-stamped. The review is theatre                     |

> **The uncomfortable truth to share with your team:** a 2000-line PR that gets
> approved in 4 minutes was not reviewed. It was waved through. If your team's
> PRs are all huge, you have review *ceremony* without review *value*.

Too big? Split it:

- schema migration in one PR, the code that uses it in the next
- refactor in one PR (no behaviour change), the feature in the next
- stack PRs: `feature/a` → `develop`, then `feature/b` based on `feature/a`

### 2. It does one thing

A PR titled "add priority field, fix the login bug, and update deps" cannot be
partially approved. If the login fix is wrong, the priority field is blocked too.

### 3. The description answers "why", not "what"

The diff already shows what. Our
[PR template](../.github/pull_request_template.md) prompts for the rest:
why, how to test, and what the risk is.

```markdown
## What does this change?
Tasks can now carry a priority (low / normal / high). Defaults to normal.

## Why?
Support asked for it (#87) — they can't triage the queue without it.

## How to test it
1. `npm start -- add "urgent thing" --priority high`
2. `npm start` — high-priority tasks sort to the top

## Risk
- [x] This touches the database schema (migration `20260817_add_priority.sql`)
- [x] Safe to roll back by reverting the merge commit
```

### 4. CI is green *before* you ask for review

Asking someone to review a PR with failing tests wastes their time. Run
`npm run verify`, push, wait for green, *then* request review.

---

## Responding to review comments

**Every comment gets a response.** Not necessarily a code change — but an
answer. Silence reads as "I ignored you".

| Comment                                      | Good response                                                     |
| -------------------------------------------- | ----------------------------------------------------------------- |
| "This will throw if `data` is null"           | Fix it, push, reply "Good catch — fixed in `a3f9c21`"              |
| "Why a Map instead of an object here?"        | Explain. If the explanation isn't obvious, add it as a code comment |
| "Nit: rename `x` to `taskCount`"              | Just do it. Bikeshedding costs more than the rename                |
| "This whole approach seems wrong"             | **Stop typing.** Get on a call. PR threads are terrible for architecture arguments |

Push fixes as normal commits:

```bash
git add -A
git commit -m "fix(tasks): guard against a null result"
git push
```

Then **re-request review** — the reviewer doesn't get notified by a push alone:

```bash
gh pr review --request-changes   # (reviewer side)
gh pr edit --add-reviewer Yousseftr1
```

Resolve a thread only when it's genuinely addressed. Our branch protection
requires all conversations resolved before merge, which stops "I'll fix that
later" from quietly becoming never.

---

## Keeping your branch up to date

If `develop` moved while your PR was open, GitHub may say the branch is
out of date (our protection rule requires it to be current):

```bash
git fetch origin
git rebase origin/develop
git push --force-with-lease
```

> ⚠️ `--force-with-lease`, never plain `--force`. `--force-with-lease` refuses if
> someone else pushed to your branch in the meantime; plain `--force` silently
> destroys their work.

Prefer merges? That's fine too, and needs no force-push:

```bash
git fetch origin
git merge origin/develop
git push
```

**Team rule:** rebase your *own* feature branch freely. **Never** rebase a
shared branch (`develop`, `main`) — you'd rewrite history other people have
already pulled.

---

## Draft PRs

Open a PR on day one, as a draft:

```bash
git push -u origin feature/big-thing
gh pr create --base develop --draft --title "feat: big thing (WIP)"
```

You get CI on every push, your team can see the direction early, and there are
no surprise 2000-line reveals on Friday afternoon. Flip it when ready:

```bash
gh pr ready
```

---

## Linking issues

Put this in the PR body and GitHub closes the issue automatically on merge:

```
Closes #87
Fixes #92
Resolves #103
```

Now, a year later, `git log` → commit → PR → issue → the original conversation.
That chain is worth more than any wiki.

---

**Next:** [04 — Reviewing & merging →](04-reviewing-and-merging.md)
