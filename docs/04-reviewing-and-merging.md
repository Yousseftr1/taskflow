# 04 — Reviewing & merging (your job as the senior)

> Code review is not about finding typos. It's about **catching the problems
> that tests can't**, and spreading knowledge so you're not the only person who
> understands the system.

---

## The reviewer's mindset

You are answering four questions, roughly in this order of value:

1. **Is it correct?** Does it do what it says? What happens on the edge cases —
   null, empty, zero, huge, concurrent, offline?
2. **Is it safe?** Secrets in the diff? Missing auth check? An RLS policy that
   lets anyone read anything? A migration that drops a column?
3. **Is it maintainable?** Will someone understand this in six months? Are the
   names honest? Is the complexity justified?
4. **Is it consistent?** Does it look like the rest of the codebase?

**Deliberately NOT your job:** formatting, import order, semicolons, line
length. Those are the linter's job. If you're commenting on them, add a lint
rule instead — once, and forever.

---

## How to actually review

```bash
gh pr list                       # what's waiting on me?
gh pr checkout 42                # pull PR #42 onto my machine as a local branch
npm install && npm run verify    # does it actually work here?
gh pr diff 42                    # the diff in the terminal
```

**Check out the branch and run it.** Reading a diff in a browser catches
maybe half of what running the code catches. For anything non-trivial, run it.

Then in the GitHub UI: **Files changed → Review changes**, and comment on
specific lines. Line comments are far more useful than a general "some issues
here" — they land exactly where the problem is.

### The three verdicts

| Verdict             | Use it when                                                        | CLI                                    |
| ------------------- | ------------------------------------------------------------------ | -------------------------------------- |
| **Comment**         | Questions or notes, no verdict yet                                  | `gh pr review 42 --comment -b "..."`   |
| **Approve**         | You'd be comfortable if this hit production                         | `gh pr review 42 --approve -b "..."`   |
| **Request changes** | Something must change before merge. **Blocks the merge button**     | `gh pr review 42 --request-changes -b "..."` |

**Use "Request changes" when you mean it.** Teams that only ever "Comment"
end up merging things nobody actually agreed to. Blocking is not aggressive —
it's the mechanism working as designed.

Approving with a small nit is fine and keeps things moving:

> Approving — the `null` guard on line 88 is optional, take it or leave it.

---

## Writing comments people don't resent

Attack the code, never the person. Explain the *why*. Offer the fix.

| ❌ Don't                          | ✅ Do                                                                                     |
| -------------------------------- | ---------------------------------------------------------------------------------------- |
| "This is wrong."                  | "If `data` is null here we'll throw. Can we return `[]` instead, like `list()` does?"      |
| "Why did you do it this way?"     | "What made you pick a Map here? Wondering if a plain object would be simpler."             |
| "You forgot tests."               | "Could we add a test for the empty-title case? That's the one that broke us in #87."       |
| "Bad naming."                     | "`x` is hard to follow at line 40 — maybe `pendingTasks`?"                                 |

Label the severity so people know what's blocking:

- **blocking:** this must change before merge
- **suggestion:** I think this is better, your call
- **nit:** trivial, take it or leave it
- **question:** I genuinely don't know, teach me
- **praise:** this is a nice bit of code — say so, it costs nothing

```
blocking: this will throw when `data` is null — Supabase returns null on an
empty result, so `list()` on a fresh database crashes. Suggest `data ?? []`.
```

---

## A concrete checklist for this repo

**Correctness**
- [ ] Edge cases: empty string, null, whitespace-only, very large, missing id
- [ ] Errors are handled, not swallowed — no empty `catch {}`
- [ ] Every `await` that can reject is accounted for

**Tests**
- [ ] New behaviour has a test that would fail without the change
- [ ] Bug fixes include a test reproducing the bug
- [ ] Tests assert on behaviour, not on implementation details

**Security**
- [ ] No secrets, tokens, keys, `.env` files in the diff
- [ ] Input from outside is validated before it reaches the database
- [ ] RLS policies are still restrictive enough

**Database (`supabase/migrations/`) — read these twice**
- [ ] Is it reversible? What's the rollback?
- [ ] Will it lock a big table on production?
- [ ] Does dropping/renaming a column break code that's still deployed?
- [ ] Are new columns nullable, or do they have a default? (A `NOT NULL` column
      with no default fails on a non-empty table.)

**The meta-check**
- [ ] Is the PR small enough that I actually reviewed it, or did I skim it?

---

## Merging

Once it's approved and CI is green:

```bash
gh pr merge 42 --squash --delete-branch
gh pr merge 42 --merge --delete-branch      # for develop -> main releases
gh pr merge 42 --auto --squash              # merge automatically when checks pass
```

`--auto` is excellent: approve a PR at 4pm, and it merges itself when the
pipeline finishes, without you babysitting it.

### Who presses the button?

**The author merges their own PR after approval.** They know whether anything
is still in flight, and they're around to watch the deploy. The reviewer's job
ends at "approve".

### After merging

- Delete the branch (`--delete-branch` does it) — dead branches pile up fast
- Watch the deploy: `gh run watch`
- If production breaks: **revert first, debug after**

```bash
gh pr list --state merged --limit 5      # find the merge
git revert -m 1 <merge-commit-sha>       # -m 1 = keep the develop side
git push
```

Reverting a merge is a normal, healthy operation — not an admission of failure.
Production being broken for 40 minutes while someone "quickly fixes it forward"
is the failure.

---

## The awkward part: reviewing when you're the only senior

Some honest notes for a solo-senior team:

- **GitHub will not let you approve your own PR.** If you set "require 1
  approval" and you're the only person, you'll block yourself. Start with
  *require a PR* + *require CI green* and 0 required approvals, then raise it
  to 1 once a teammate can review.
- **Self-review is still worth it.** Open the PR, read your own diff in the
  GitHub UI, and comment on it. The change of medium genuinely makes you spot
  things you missed in your editor.
- **Grow reviewers deliberately.** Pair on reviews for a few weeks — let a mid
  review first, then you review after them and compare notes. In two months
  you'll have someone who can approve.
- Use [`CODEOWNERS`](../.github/CODEOWNERS) to keep yourself mandatory on the
  scary paths (migrations, CI config) while delegating the rest.

---

## Setting the tone

You're establishing a culture, not just a process. What to say out loud:

- **"A blocked PR is not a failed PR."** The process working is the process working.
- **"Review within one working day."** A PR sitting for three days rots — the
  author has moved on, and the branch drifts out of date. Agree an SLA.
- **"If the review is going back and forth more than twice, get on a call."**
  Written async review is bad at disagreements.
- **Review out loud in a group for the first month.** Screen share, review a PR
  together, explain your reasoning. That's how the standard actually transfers.

---

**Next:** [05 — Protecting `main` →](05-protecting-main.md)
