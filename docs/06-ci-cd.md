# 06 — CI/CD

> **CI** = "is this code good?" — runs on every push and pull request.
> **CD** = "get the good code out there" — runs after a merge.
>
> Together they replace "it works on my machine" with a fact.

---

## Why CI is what makes branch protection work

Branch protection alone only enforces "a human looked at it". Humans miss
things — especially in a 900-line diff at 5pm.

CI is the tireless reviewer that checks the boring, mechanical things *every
single time*:

```
you push  ──►  GitHub starts a clean Ubuntu machine
               ├─ checks out your branch
               ├─ installs the exact dependencies from package-lock.json
               ├─ runs the linter        ──►  ❌ blocks the merge
               ├─ runs the typechecker   ──►  ❌ blocks the merge
               ├─ runs the tests         ──►  ❌ blocks the merge
               └─ builds the project     ──►  ❌ blocks the merge
                                              ✅ merge button unlocks
```

The key phrase is **"a clean machine"**. It catches the classic "works locally"
failures: a dependency you installed globally and forgot, a file you never
committed, a test that only passes because of leftover local state.

---

## Reading [`ci.yml`](../.github/workflows/ci.yml)

```yaml
on:
  pull_request:
    branches: [main, develop]   # run on PRs targeting these branches
  push:
    branches: [main, develop]   # and on the branches themselves
```

**Jobs run in parallel by default.** `lint`, `typecheck` and `test` all start at
once; `build` waits because it declares `needs: [lint, typecheck, test]`.

Each job shows up as its own check on the PR:

```
✅ Lint          ✅ Typecheck     ✅ Tests
✅ Build         ✅ CI
```

That last one, `ci-success`, exists on purpose. It's a single job that fails if
any other job failed. **Mark only `CI` as required** in branch protection, and
you never have to touch the protection rules again when you add, remove or
rename a job.

### Things worth stealing from this file

```yaml
concurrency:
  group: ci-${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```
Push three times in a row and only the last run survives. Saves CI minutes.

```yaml
permissions:
  contents: read
```
Least privilege. A compromised dependency in your build can't push to the repo.

```yaml
- run: npm ci        # NOT npm install
```
`npm ci` installs the **exact** versions from `package-lock.json` and fails if
the lockfile is out of sync. `npm install` can silently resolve a newer version,
which is how CI and your laptop start disagreeing.

```yaml
cache: npm
```
Caches `~/.npm` between runs. Often halves the pipeline time.

---

## When a check goes red

**1. Find out what failed.**

```bash
gh pr checks              # summary
gh run list --limit 5     # recent runs
gh run view --log-failed  # just the failing output — the most useful command here
```

**2. Reproduce it locally.** CI runs exactly what `npm run verify` runs:

```bash
npm run verify
```

**3. If it fails in CI but passes locally**, it's almost always one of these:

| Symptom                            | Cause                                                        |
| ---------------------------------- | ------------------------------------------------------------ |
| "Cannot find module X"             | You never committed the file, or it's in `.gitignore`         |
| Works locally, fails on CI only    | You have something installed globally that CI doesn't         |
| Passes alone, fails in the suite   | Tests share state — one test's data leaks into the next      |
| Fails intermittently               | A flaky test: a real timing bug, or a bad `await`            |
| "npm ci can only install with..."  | `package-lock.json` is out of date — run `npm install`, commit the lockfile |

> **Never merge with a red check "because it's flaky".** A flaky test is a bug
> report you haven't read yet. Either fix it or delete it — a test nobody trusts
> is worse than no test, because it teaches the team to ignore red.

**4. Fix, push, and the PR re-runs automatically.**

---

## Reading [`deploy.yml`](../.github/workflows/deploy.yml)

```yaml
on:
  push:
    branches: [main, develop]
```

This fires **after** a merge — a merge into `develop` is a push to `develop`.

```yaml
environment:
  name: ${{ github.ref_name == 'main' && 'production' || 'staging' }}
```

One workflow, two destinations:

| Merged into | Environment  | Secrets used                    |
| ----------- | ------------ | ------------------------------- |
| `develop`   | `staging`    | the staging Supabase project    |
| `main`      | `production` | the production Supabase project |

The pipeline re-runs the tests on the merge commit before deploying. CI tested
your branch; the merge produced a **new commit that nobody has ever tested**.
Two semantically fine changes can combine into a broken one. This is cheap
insurance.

Then it applies database migrations:

```bash
supabase link --project-ref $SUPABASE_PROJECT_ID
supabase db push
```

`db push` applies any migration files the remote database hasn't seen. Because
migrations live in git and get reviewed in a PR, **your production schema always
matches your repository.** Nobody clicks around in the Supabase dashboard.

---

## Secrets: the part people get wrong

**Never** put a credential in a workflow file, in code, or in `.env` if `.env`
is committed. Workflow files are just files in the repo — anyone with read
access sees them.

Secrets live in GitHub, encrypted, and are injected at runtime:

```bash
# Repository-wide secrets
gh secret set SUPABASE_ACCESS_TOKEN
gh secret set SUPABASE_PROJECT_ID

# Or per environment — different values for staging and production
gh secret set SUPABASE_PROJECT_ID --env production
gh secret set SUPABASE_PROJECT_ID --env staging

gh secret list
```

In the UI: **Settings → Secrets and variables → Actions**.

Where to get them:

| Secret                  | Where                                                                |
| ----------------------- | -------------------------------------------------------------------- |
| `SUPABASE_ACCESS_TOKEN` | supabase.com → account → Access Tokens → Generate new token           |
| `SUPABASE_PROJECT_ID`   | Your project's ref — the `abcdefgh` in `https://abcdefgh.supabase.co` |

Rules to teach the team:

- Secrets are **write-only**. You can set one, never read it back. Lost it? Rotate it.
- GitHub masks secret values in logs — but `echo $SECRET | base64` defeats that.
  Review workflow changes from outside contributors carefully.
- Secrets are **not** available to workflows triggered by pull requests from
  forks. That's deliberate, and it's why CI never needs credentials — our tests
  use a fake Supabase client instead.
- Rotate on any suspicion. Rotating is cheap; a leaked production key is not.

---

## Environments and manual approval gates

A GitHub **Environment** (Settings → Environments) gives you:

- **per-environment secrets** — staging and production values, same variable name
- **required reviewers** — the workflow *pauses* and waits for a human to click
  "Approve deployment" before touching production
- **wait timers** — e.g. force a 10-minute pause before production
- **deployment history** — what went out, when, from which commit

For your team, the useful pattern is:

```
merge to develop  ──►  staging      (automatic, no gate)
merge to main     ──►  production   (paused: requires your approval)
```

That gives you a second human checkpoint at the exact moment it matters, without
slowing down day-to-day work.

Set it up: **Settings → Environments → New environment → `production` →
Required reviewers → add yourself.**

---

## What to add as your team matures

In rough order of value-per-effort:

1. **A formatter** (Prettier) with a `format:check` step — ends all style debates
2. **`npm audit --audit-level=high`** — flags vulnerable dependencies on every PR
3. **Dependabot** (`.github/dependabot.yml`) — automated dependency-bump PRs that
   CI validates for you
4. **Secret scanning + push protection** (Settings → Code security) — GitHub
   blocks a push that contains something that looks like a credential. Free on
   public repos. **Turn this on today.**
5. **CodeQL** — static security analysis on every PR
6. **A preview deployment per PR** — the reviewer clicks a link and sees the change
7. **Required checks on migrations** — a job that fails if a migration file is
   modified after it was already applied

---

## The rules that make CI/CD actually work

- **Keep it under 5 minutes.** Beyond that, people context-switch, and the
  feedback loop dies.
- **Red means stop.** The moment a red check gets merged "just this once", CI
  becomes decoration.
- **CI must run exactly what developers run locally.** If `npm run verify` and
  CI diverge, developers stop trusting CI.
- **Deploys are boring or they're dangerous.** A deploy that happens 10 times a
  day is routine. A deploy that happens once a month is an event with a war room.
- **Every deploy must be revertible in one action** — `git revert` the merge
  commit and let the pipeline ship the previous state.

---

**Next:** [07 — Conflicts & recovery →](07-conflicts-and-recovery.md)
