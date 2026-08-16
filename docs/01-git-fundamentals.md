# 01 — Git fundamentals

> If you only remember one thing: **git is a database of snapshots, and a branch
> is just a sticky note pointing at one of them.** Everything else follows.

---

## 1. The four places your code lives

This is the single most useful mental model in git. Almost every confusing git
moment is really "I don't know which of these four places my change is in".

```
   ┌───────────────┐  git add    ┌───────────────┐  git commit  ┌───────────────┐  git push   ┌───────────────┐
   │ WORKING       │ ──────────► │ STAGING AREA  │ ───────────► │ LOCAL REPO    │ ──────────► │ REMOTE REPO   │
   │ DIRECTORY     │             │ (the "index") │              │ (.git folder) │             │ (GitHub)      │
   │               │ ◄────────── │               │ ◄─────────── │               │ ◄────────── │               │
   │ files you see │ git restore │ what will go  │  git reset   │ your history  │  git pull   │ shared truth  │
   │ and edit      │  --staged   │ in the commit │              │ of snapshots  │             │               │
   └───────────────┘             └───────────────┘              └───────────────┘             └───────────────┘
```

| Place                 | What it is                                              | How to look at it       |
| --------------------- | ------------------------------------------------------- | ----------------------- |
| **Working directory** | The files on your disk right now                        | `git status`, your editor |
| **Staging area**      | The change you are *about to* commit — a shopping basket | `git diff --staged`     |
| **Local repository**  | Every commit you've made, stored in `.git/`             | `git log`               |
| **Remote repository** | GitHub. What your teammates can see                     | `git log origin/main`   |

**The staging area is the part people skip, and it's the part that makes you
good at git.** It lets you commit *part* of your work — so one commit says one
thing instead of "fixed stuff".

```bash
git add src/tasks/tasks.service.ts   # stage one file
git add -p                           # stage HUNK BY HUNK — git asks about each chunk
git status                           # green = staged, red = not staged
```

---

## 2. A commit is a snapshot, not a diff

A commit stores:

- a full snapshot of your project at that moment
- a pointer to its **parent** commit (that's what makes it "history")
- author, date, message
- a SHA — the `a3f9c21...` id that uniquely names it

Because every commit points at its parent, your history is a chain:

```
a1b2c3d ── e4f5g6h ── i7j8k9l ── m0n1o2p
(oldest)                          (newest)
```

**A branch is just a movable pointer to one commit in that chain.** That's it.
Creating a branch is instant and costs nothing, because you're only writing a
41-byte file. This is why "branch for everything" is cheap advice to follow.

```
                          ┌── feature/add-priority  (a pointer)
                          ▼
a1b2c3d ── e4f5g6h ── i7j8k9l
             ▲
             └── main  (another pointer)
```

`HEAD` is a pointer to *the branch you currently have checked out*.

---

## 3. The commands you will actually use

### Starting out

```bash
git clone <url>          # copy a GitHub repo to your machine (sets up "origin" for you)
git init                 # turn an existing folder into a git repo
```

### Every single day

```bash
git status               # WHERE AM I? What's changed? Run this constantly. It is free.
git switch -c my-branch  # create a new branch and move onto it
git switch develop       # move onto an existing branch
git add <files>          # stage changes
git commit -m "message"  # snapshot the staged changes
git push                 # send your commits to GitHub
git pull                 # fetch GitHub's commits and merge them into your branch
```

> `git switch` and `git restore` are the modern replacements for the overloaded
> `git checkout`. `checkout` did both "change branch" and "throw away my file
> changes", which is exactly how people accidentally delete work. Teach your
> team `switch` / `restore`.

### Looking around

```bash
git log --oneline --graph --all --decorate   # the whole history as a picture
git diff                                     # unstaged changes
git diff --staged                            # what's about to be committed
git diff develop..HEAD                       # everything my branch adds vs develop
git show <sha>                               # what did that commit change?
git blame src/tasks/tasks.service.ts         # who last touched each line, and in which commit
```

Make that log command an alias — you'll use it forever:

```bash
git config --global alias.lg "log --oneline --graph --all --decorate"
# then just:  git lg
```

---

## 4. `fetch` vs `pull` vs `push`

| Command                | What it does                                                          |
| ---------------------- | --------------------------------------------------------------------- |
| `git fetch`            | Downloads GitHub's commits. **Changes nothing in your files.** Safe    |
| `git pull`             | `fetch` + `merge` into your current branch. Changes your files         |
| `git pull --rebase`    | `fetch` + replays *your* commits on top. Keeps history linear          |
| `git push`             | Uploads your commits to GitHub                                         |
| `git push -u origin X` | First push of a new branch: also links local `X` to `origin/X`         |

`origin` is just a nickname for the GitHub URL. `origin/develop` is your local
*cached copy* of what GitHub's `develop` looked like the last time you fetched —
which is why `git fetch` before judging "am I behind?" matters.

---

## 5. Writing commit messages that don't waste people's time

Bad, and unfortunately typical:

```
fix
update
wip
asdf
final fix v2 REAL
```

Good — the **Conventional Commits** convention, which we use in this repo:

```
<type>(<optional scope>): <what changed, imperative mood>

<optional body: WHY, not what — the diff already shows what>

<optional footer: Closes #42>
```

Real examples:

```
feat(tasks): add priority field to task creation
fix(tasks): reject titles that are only whitespace
docs(readme): document the branch protection setup
test(tasks): cover the empty-list case
refactor(tasks): extract validation out of the service
chore(deps): bump vitest to 4.1
ci: fail the build when coverage drops below 80%
```

| Type       | Use it when                                     |
| ---------- | ----------------------------------------------- |
| `feat`     | New capability for the user                     |
| `fix`      | A bug fix                                       |
| `docs`     | Documentation only                              |
| `test`     | Adding or fixing tests                          |
| `refactor` | Restructuring with no behaviour change          |
| `perf`     | Performance improvement                         |
| `chore`    | Dependencies, tooling, housekeeping             |
| `ci`       | Pipeline changes                                |

**The test for a good message:** if production breaks at 3am and someone runs
`git log --oneline`, will they be able to guess which commit did it?

---

## 6. `.gitignore` — and the mistake that costs companies money

Anything matching [`.gitignore`](../.gitignore) is invisible to git. Three
categories belong there:

1. **Generated output** — `node_modules/`, `dist/`, `coverage/`
2. **Machine-local noise** — `.DS_Store`, `.idea/`
3. **Secrets** — `.env`

> ⚠️ `.gitignore` only stops files that git isn't already tracking. If you commit
> `.env` once and *then* add it to `.gitignore`, the secret is still in the
> history — and history is public forever once pushed.
>
> If it happens: **rotate the credential immediately.** Deleting the file in a
> new commit does not un-leak it. Rewriting history (`git filter-repo`) is a
> last resort, and the key must be considered compromised regardless.

This is why we commit [`.env.example`](../.env.example) instead: it documents
*which* variables exist, without ever containing a real value.

---

## 7. Three questions that unstick almost anything

1. **`git status`** — where am I, what's changed, what's staged?
2. **`git log --oneline --graph --all`** — what does history actually look like?
3. **`git reflog`** — what did I do recently? (This is your undo button. See
   [07 — Conflicts & recovery](07-conflicts-and-recovery.md).)

Nothing that has been committed is ever really lost. Git is much harder to break
than people fear — but you have to *commit* for that safety net to exist. Commit
early, commit often.

---

**Next:** [02 — The daily workflow →](02-the-daily-workflow.md)
