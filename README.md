# TaskFlow — a Git / GitHub / CI-CD training repository

A small, real, working project (Node + TypeScript + Supabase) whose actual
purpose is to be a **safe place to learn the professional workflow**:

> clone → branch → commit → push → pull request → review → CI → merge → deploy

It exists to solve one specific problem:

> **"Everyone on my team pushes straight to `main`, so production keeps breaking."**

The fix is not a lecture about discipline. The fix is to make pushing to `main`
**technically impossible**, and to make the safe path the easy path.

---

## The workflow this repo enforces

```
feature/add-task-priority ──┐
feature/fix-null-title    ──┼──► develop ──────────► main
feature/update-readme     ──┘   (staging)         (production)
        │                          │                   │
   your daily work            auto-deploy         auto-deploy
   PR + review + CI           to staging          to production
```

| Branch      | What it is                   | Who can push directly |
| ----------- | ---------------------------- | --------------------- |
| `main`      | Production. Always shippable | **Nobody.** Ever       |
| `develop`   | Integration / staging        | **Nobody.** Ever       |
| `feature/*` | Your work in progress        | You                   |

Everything reaches `develop` and `main` through a **pull request** that a human
reviewed and that a **robot (CI) proved is not broken**.

---

## Read these in order

| #                                                 | Document                     | What you get out of it                                             |
| ------------------------------------------------- | ---------------------------- | ------------------------------------------------------------------ |
| [01](docs/01-git-fundamentals.md)                  | Git fundamentals             | What git actually is, the 4 places your code lives, the core verbs |
| [02](docs/02-the-daily-workflow.md)                | The daily workflow           | The exact loop you and your team repeat every day                  |
| [03](docs/03-pull-requests.md)                     | Pull requests                | Opening a good PR, keeping it small, updating it after review      |
| [04](docs/04-reviewing-and-merging.md)             | Reviewing & merging          | **Your job as the senior**: how to review, block, approve, merge   |
| [05](docs/05-protecting-main.md)                   | Protecting `main`            | **The actual fix for your company's problem** — with commands       |
| [06](docs/06-ci-cd.md)                             | CI/CD                        | What the pipelines do, how to read a red check, how to add secrets |
| [07](docs/07-conflicts-and-recovery.md)            | Conflicts & undo             | Merge conflicts, rebase, and how to un-break anything              |
| [08](docs/08-team-cheatsheet.md)                   | Team cheat sheet             | One page to print and hand to each developer                       |
| [🧪](EXERCISES.md)                                 | **Exercises**                | The hands-on lab. Start here once you've skimmed 01 and 02          |

---

## Quick start

```bash
git clone https://github.com/Yousseftr1/taskflow.git
cd taskflow
npm install
cp .env.example .env    # then paste your Supabase URL + anon key
npm run verify          # typecheck + lint + tests — the same checks CI runs
```

Run the demo app:

```bash
npm start                          # list tasks
npm start -- add "My first task"   # create one
npm start -- done <task-id>        # complete one
```

## What's in the box

```
src/
  index.ts                     tiny CLI so the project is actually runnable
  lib/supabase.ts              creates the Supabase client from env vars
  tasks/tasks.service.ts       the real logic: validation + database access
  tasks/tasks.service.test.ts  25 unit tests — these are what CI runs
supabase/migrations/           database schema, versioned in git, applied by CD
.github/workflows/ci.yml       runs on every PR: lint, typecheck, test, build
.github/workflows/deploy.yml   runs on merge: develop→staging, main→production
.github/CODEOWNERS             makes you a required reviewer
.github/pull_request_template.md
```

## Commands

| Command                 | What it does                                     |
| ----------------------- | ------------------------------------------------ |
| `npm run verify`        | **Run this before every push.** All CI checks     |
| `npm test`              | Unit tests                                       |
| `npm run test:watch`    | Unit tests, re-running as you type               |
| `npm run test:coverage` | Tests + coverage thresholds (CI fails below 80%) |
| `npm run lint`          | ESLint                                           |
| `npm run lint:fix`      | ESLint, fixing what it can                       |
| `npm run typecheck`     | TypeScript, no output files                      |
| `npm run build`         | Compile to `dist/`                               |
