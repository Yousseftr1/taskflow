# 🧪 The Lab

Ten exercises. Do them in order, on this repo, where breaking things is free.
By the end you'll have done every operation you need in order to teach your team.

Assume `<owner>` = `Yousseftr1` and `<repo>` = `taskflow` throughout.

---

## Lab 1 — Clone and get your bearings

**Goal:** get the project on your machine and confirm it works.

```bash
cd ~/Documents
git clone https://github.com/Yousseftr1/taskflow.git
cd taskflow
npm install
npm run verify
```

Now look around:

```bash
git status                          # clean tree, on main
git log --oneline --graph --all     # the whole history
git branch -a                       # local AND remote branches
git remote -v                       # where "origin" points
```

**✅ Done when:** `npm run verify` passes and you can name the four places code
lives (working dir / staging / local repo / remote).

**❓ Ask yourself:** what's the difference between `develop` and `origin/develop`
in that branch list?

---

## Lab 2 — Your first feature branch and pull request

**Goal:** the complete loop, end to end.

```bash
git switch develop
git pull

git switch -c feature/add-task-count
```

Now make a real change. Add this method to the `TasksService` class in
[`src/tasks/tasks.service.ts`](src/tasks/tasks.service.ts):

```typescript
  /** Counts tasks, optionally filtered by status. */
  async count(status?: TaskStatus): Promise<number> {
    let query = this.db.from(TASKS_TABLE).select('*', { count: 'exact', head: true });

    if (status) {
      query = query.eq('status', status);
    }

    const { count, error } = await query;

    if (error) {
      throw new TaskRepositoryError(`Failed to count tasks: ${error.message}`);
    }

    return count ?? 0;
  }
```

You'll need to import `TaskStatus` at the top of the file:

```typescript
import type { ListOptions, NewTask, Task, TaskStatus } from './types.js';
```

Commit it:

```bash
git status
git diff                                   # read your own change first
git add src/tasks/tasks.service.ts
git commit -m "feat(tasks): add a count method"
```

Verify, push, open the PR:

```bash
npm run verify
git push -u origin feature/add-task-count
gh pr create --base develop --fill
gh pr checks --watch
```

**✅ Done when:** you have a PR into `develop` with CI running on it.

**❓ Notice:** the PR description was pre-filled from your commit message. That's
why commit messages matter.

> **Coverage may fail here** — you added a method with no test. That's the point.
> Fix it in Lab 3.

---

## Lab 3 — Make CI fail on purpose, then fix it

**Goal:** feel what the safety net feels like.

Add a deliberate mistake on the same branch:

```typescript
  async count(status?: TaskStatus): Promise<number> {
    console.log('DEBUG: counting');    // ESLint: no-console -> error
    const broken: number = "not a number";   // TypeScript -> error
    ...
```

```bash
git add -A
git commit -m "chore: temporarily break things"
git push
gh pr checks --watch
```

Watch **Lint** and **Typecheck** go red, and the merge button lock.

Now investigate like you would at work:

```bash
gh run view --log-failed
```

Then fix it properly — remove the broken lines and **add tests for `count()`**
in [`src/tasks/tasks.service.test.ts`](src/tasks/tasks.service.test.ts):

```typescript
describe('TasksService.count', () => {
  it('returns the count from Supabase', async () => {
    const { client } = createSupabaseMock({ data: null, error: null, count: 7 } as any);
    await expect(new TasksService(client).count()).resolves.toBe(7);
  });

  it('filters by status when given one', async () => {
    const { client, argsFor } = createSupabaseMock({ data: null, error: null, count: 2 } as any);
    await new TasksService(client).count('done');
    expect(argsFor('eq')).toEqual(['status', 'done']);
  });

  it('wraps a database error', async () => {
    const { client } = createSupabaseMock({ data: null, error: { message: 'nope' } });
    await expect(new TasksService(client).count()).rejects.toThrow(TaskRepositoryError);
  });
});
```

```bash
npm run verify
git add -A
git commit -m "test(tasks): cover the count method"
git push
gh pr checks --watch
```

**✅ Done when:** all checks are green.

**💡 The lesson to teach:** nobody had to *notice* the bug. The robot refused the
merge. That's the difference between a rule and a guardrail.

---

## Lab 4 — Review your own pull request

**Goal:** learn the review interface before you use it on someone else's work.

```bash
gh pr view --web
```

In the browser:

1. **Files changed** tab — read the diff as a reviewer, not as the author
2. Hover a line → click **+** → leave a comment. Try:
   `question: should count() cap at some maximum, like list() does?`
3. Click **Review changes** → **Comment** → Submit
4. Back in **Conversation**, reply to your own thread and **Resolve** it

```bash
gh pr view --comments      # the same thread, from the terminal
```

**✅ Done when:** you've left a line comment, replied, and resolved the thread.

**⚠️ Note:** GitHub won't let you *approve* your own PR. That's why we start with
0 required approvals — see [docs/05](docs/05-protecting-main.md). With a
teammate, this is where you'd request their review.

---

## Lab 5 — Merge, and watch the pipeline deploy

```bash
gh pr merge --squash --delete-branch
```

Then follow the deployment:

```bash
gh run list --limit 3
gh run watch
```

The **Deploy** workflow triggered on the push to `develop` and targeted the
`staging` environment. (It'll skip the migration step until you add Supabase
secrets — see Lab 9.)

Clean up locally:

```bash
git switch develop
git pull                                # your squashed commit is now here
git log --oneline -3
git branch -d feature/add-task-count
git fetch --prune
```

**✅ Done when:** `git log` on `develop` shows one clean commit for the whole
feature.

**❓ Notice:** your 3 messy commits became 1. That's what squash merging does,
and it's why you can commit as sloppily as you like on your own branch.

---

## Lab 6 — Try to break the rules (the important one)

**Goal:** experience the guardrail personally, so you can demo it to your team.

```bash
git switch main
git pull
echo "// I am pushing straight to production" >> src/index.ts
git add -A
git commit -m "chore: pushing straight to main like the old days"
git push
```

You should see:

```
remote: error: GH006: Protected branch update failed for refs/heads/main.
remote: error: Changes must be made through a pull request.
 ! [remote rejected] main -> main (protected branch hook declined)
```

**That rejection is the answer to your company's problem.** Not a policy. Not a
reminder in standup. A server that says no.

Undo your local commit:

```bash
git reset --hard origin/main
git status
```

Now try the other bad habits and watch them fail too:

```bash
git push --force origin main       # force push: blocked
git push origin --delete main      # deleting main: blocked
```

**✅ Done when:** you've been rejected at least twice and your local `main`
matches `origin/main` again.

**🎓 Teaching tip:** do exactly this, live, on a shared screen, as the opening
five minutes of your team session. It lands harder than any slide.

---

## Lab 7 — Create a merge conflict and resolve it

**Goal:** stop being afraid of conflicts.

Make two branches change the same line.

```bash
git switch develop && git pull

# Branch A
git switch -c fix/title-limit-200
# In src/tasks/tasks.service.ts change: MAX_TITLE_LENGTH = 200
git commit -am "fix(tasks): raise the title limit to 200"
git push -u origin fix/title-limit-200
gh pr create --base develop --fill
gh pr merge --squash --delete-branch

# Branch B — branched from the OLD develop, deliberately
git switch develop
git switch -c fix/title-limit-80
# In src/tasks/tasks.service.ts change: MAX_TITLE_LENGTH = 80
git commit -am "fix(tasks): lower the title limit to 80"
```

Now sync branch B and watch it collide:

```bash
git fetch origin
git rebase origin/develop
```

```
CONFLICT (content): Merge conflict in src/tasks/tasks.service.ts
```

Open the file, resolve it (pick one number, delete all three `<<<<<<<`,
`=======`, `>>>>>>>` markers), then:

```bash
npm run verify
git add src/tasks/tasks.service.ts
git rebase --continue
git push --force-with-lease
```

**✅ Done when:** the branch rebases cleanly and CI is green.

**Also try:** run `git rebase --abort` mid-conflict first, just to prove to
yourself that backing out is free.

> Remember the tests assert on `MAX_TITLE_LENGTH` — they'll follow whatever you
> pick, since they use the constant rather than a hard-coded number. That's
> deliberate: it's what "test behaviour, not implementation" buys you.

---

## Lab 8 — Release to production, then revert it

**Goal:** the release path, and the emergency exit.

```bash
git switch develop && git pull
gh pr create --base main --head develop \
  --title "release: first release" \
  --body "Includes the count method and the title-limit fix."
```

Review it like a release: `gh pr diff`. Then:

```bash
gh pr merge --merge          # a merge commit, not a squash, for releases
gh run watch                 # the production deploy
```

Now pretend it broke production:

```bash
git switch main && git pull
git log --oneline -3                       # find the merge commit sha
git revert -m 1 <merge-commit-sha>         # -m 1 keeps main's side
```

But wait — you can't push to `main` directly. Even a revert goes through a PR:

```bash
git switch -c hotfix/revert-release
git push -u origin hotfix/revert-release
gh pr create --base main --title "revert: back out the first release" --fill
gh pr merge --squash --delete-branch
```

**✅ Done when:** production is back to the previous state via a reviewed PR.

**💡 The lesson:** *revert first, debug after.* Getting production healthy is not
the same task as understanding the bug, and it must come first.

---

## Lab 9 — Wire up the real Supabase project

**Goal:** make the CD pipeline actually deploy your schema.

1. Create a project at [supabase.com](https://supabase.com) (a free one is fine).
2. Locally: **Project Settings → Data API** for the URL, **API Keys** for the
   anon key.

```bash
cp .env.example .env
# paste SUPABASE_URL and SUPABASE_ANON_KEY
```

3. Apply the schema once by hand — open the SQL Editor in the dashboard and run
   [`supabase/migrations/20260816090000_create_tasks.sql`](supabase/migrations/20260816090000_create_tasks.sql).

4. Prove it works:

```bash
npm start -- add "My first real task"
npm start
```

5. Now let the pipeline own the database. Create an access token at
   supabase.com → **Account → Access Tokens**, then:

```bash
gh secret set SUPABASE_ACCESS_TOKEN
gh secret set SUPABASE_PROJECT_ID      # the "abcdefgh" from your project URL
gh secret list
```

6. Open a PR that adds a new migration — for example
   `supabase/migrations/20260901120000_add_priority.sql`:

```sql
create type task_priority as enum ('low', 'normal', 'high');
alter table public.tasks
  add column priority task_priority not null default 'normal';
create index tasks_priority_idx on public.tasks (priority);
```

Merge it into `develop` and watch the Deploy workflow apply it.

**✅ Done when:** a migration reached your database without anyone opening the
Supabase dashboard.

**💡 The lesson:** the schema is code. It gets reviewed, versioned, and deployed
like code. "Someone changed something in the dashboard and now staging and prod
disagree" stops being possible.

---

## Lab 10 — Teach it

**Goal:** the actual reason you're doing all this.

### The 90-minute session

| Time   | What                                                                             |
| ------ | -------------------------------------------------------------------------------- |
| 0–10   | **The problem.** Show real incidents from your own history. Don't lecture — show  |
| 10–20  | **Lab 6 live.** Push to `main`, get rejected on the big screen. Let it land       |
| 20–35  | **The mental model.** The four places code lives; branches as pointers            |
| 35–60  | **Everyone does Lab 2.** All of them. Branch, commit, push, PR. Same room         |
| 60–75  | **Review each other's PRs.** Pair them up. Everyone approves someone              |
| 75–85  | **CI red → green.** Break a test on purpose, watch the merge button lock          |
| 85–90  | **The cheat sheet.** Hand out [docs/08](docs/08-team-cheatsheet.md). Agree a start date |

### What to insist on

- **Everyone types.** Nobody learns git by watching someone else use git.
- **Use their real repo in week two.** This lab teaches the moves; their own
  codebase makes it stick.
- **Enable it on `develop` first**, `main` a week later. Lower stakes first.
- **Set a review SLA** — one working day. Unreviewed PRs are what actually kills
  adoption; developers route around a process that blocks them.

### The objections you will get, and honest answers

| "But..."                                  | Your answer                                                                                    |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------- |
| "This is slower."                          | "For a week. Then it's the same speed, with fewer 2am calls. Let's measure incidents instead." |
| "My change is tiny."                        | "Tiny changes break production more often than big ones, because nobody looks at them."        |
| "I'll just wait forever for review."        | "One working day, or you escalate to me. If I'm the bottleneck, that's my problem to fix."     |
| "What if production is down right now?"     | "Hotfix branch, PR, fast review. It costs 4 minutes. Break-glass exists, and it gets logged."  |
| "The old way worked fine."                 | Show the incident list. Let the data argue.                                                    |

### Your first month as the senior

- **Week 1:** protection on `develop`, review everything, over-explain in comments
- **Week 2:** protection on `main`, first release PR done together
- **Week 3:** hand review duty to one mid-level dev; you review after them and compare
- **Week 4:** turn on `required_approving_review_count: 1` and `enforce_admins: true`

At that point the process no longer depends on you remembering to enforce it.
Which is the whole goal.

---

## Where to go next

- Add **Prettier** and a `format:check` CI step — ends style arguments permanently
- Add **Dependabot** — automatic dependency PRs that CI validates
- Turn on **secret scanning + push protection** (Settings → Code security)
- Add a **`production` environment with required reviewers** — a human approval
  gate before anything touches prod ([docs/06](docs/06-ci-cd.md))
- Try **`gh pr merge --auto --squash`** — approve at 4pm, it merges itself at 4:03
