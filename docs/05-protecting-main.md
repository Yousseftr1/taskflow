# 05 — Protecting `main`

> **This is the document that solves your company's problem.**
>
> You cannot fix "everyone pushes to `main`" with a meeting, a Slack message, or
> a policy document. People forget, people are in a hurry, people are new.
> You fix it by making the wrong thing **technically impossible**.

---

## What "protected" actually means

With branch protection on, this is what happens when someone pushes to `main`:

```
$ git push origin main
remote: error: GH006: Protected branch update failed for refs/heads/main.
remote: error: Changes must be made through a pull request.
To https://github.com/Yousseftr1/taskflow.git
 ! [remote rejected] main -> main (protected branch hook declined)
error: failed to push some refs
```

The push is **rejected by GitHub's server**. Not a warning. Not a lint rule
someone can skip. There is no `--force` that gets around it (force pushes are
blocked too). The only route into `main` is a pull request that satisfies your
rules.

That single change is worth more than any amount of process documentation.

---

## The rules we set, and why each one exists

| Rule                                    | What it stops                                                                 |
| --------------------------------------- | ----------------------------------------------------------------------------- |
| **Require a pull request before merging** | Direct pushes. The whole point                                                 |
| **Require status checks to pass**         | Merging code that doesn't compile or whose tests fail                          |
| **Require branches to be up to date**     | "It passed CI" — against a `develop` from last Tuesday                         |
| **Require conversation resolution**       | Merging while a reviewer's objection is still unanswered                       |
| **Block force pushes**                    | Someone rewriting shared history and destroying other people's commits         |
| **Block deletions**                      | Someone deleting `main`. Yes, this happens                                     |
| **Require approvals** (later)             | Merging without a second pair of eyes                                          |
| **Dismiss stale approvals**               | Getting approved, then pushing something completely different, then merging    |
| **Require review from Code Owners**       | Someone changing migrations or CI without you seeing it                        |
| **Include administrators**                | *You* bypassing your own rules — which is how rules die                        |

---

## Doing it in the GitHub UI

**Settings → Branches → Add branch protection rule** (or **Settings → Rules →
Rulesets** for the newer system — see the bottom of this page).

For `main`:

1. **Branch name pattern:** `main`
2. ☑ **Require a pull request before merging**
   - Required approvals: `0` for now (solo), **`1` once you have a teammate**
   - ☑ Dismiss stale pull request approvals when new commits are pushed
   - ☑ Require review from Code Owners
3. ☑ **Require status checks to pass before merging**
   - ☑ Require branches to be up to date before merging
   - Search for and select: **`CI`**
4. ☑ **Require conversation resolution before merging**
5. ☐ Allow force pushes — **leave off**
6. ☐ Allow deletions — **leave off**
7. ☑ **Do not allow bypassing the above settings** (this is "include administrators")

Then repeat for `develop`. You can be slightly lighter there — but requiring a
PR and green CI should stay.

> **The status check name won't appear in the dropdown until that check has run
> at least once** on the repository. Open one PR first, let CI run, then come
> back and select `CI`.

---

## Doing it from the terminal

Same thing, scriptable — which is how you'll roll it out to 20 repos at work.

### Protect `main`

```bash
gh api --method PUT repos/Yousseftr1/taskflow/branches/main/protection \
  --input - <<'JSON'
{
  "required_status_checks": { "strict": true, "contexts": ["CI"] },
  "enforce_admins": false,
  "required_pull_request_reviews": {
    "required_approving_review_count": 0,
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": true
  },
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "required_conversation_resolution": true
}
JSON
```

### Protect `develop`

```bash
gh api --method PUT repos/Yousseftr1/taskflow/branches/develop/protection \
  --input - <<'JSON'
{
  "required_status_checks": { "strict": true, "contexts": ["CI"] },
  "enforce_admins": false,
  "required_pull_request_reviews": {
    "required_approving_review_count": 0,
    "dismiss_stale_reviews": true
  },
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "required_conversation_resolution": true
}
JSON
```

### Check what's currently set

```bash
gh api repos/Yousseftr1/taskflow/branches/main/protection | jq
```

---

## The two settings to change when you roll this out at work

The config above is tuned for **you, alone, learning**. Two deliberate
compromises, and exactly when to remove them:

### 1. `required_approving_review_count: 0` → `1`

Set to `0` here **because GitHub does not let you approve your own pull
request.** With a team, this is the most important rule you have. Change it the
day a second person can review:

```bash
gh api --method PATCH \
  repos/Yousseftr1/taskflow/branches/main/protection/required_pull_request_reviews \
  -f required_approving_review_count=1
```

### 2. `enforce_admins: false` → `true`

As a repo admin you can currently still override the rules. That's the escape
hatch that lets you unstick yourself while learning.

**At work, turn it on.** A rule the senior can bypass is a rule that gets
bypassed at 6pm on a Friday, and then the team learns that the rules are
optional.

```bash
gh api --method POST repos/Yousseftr1/taskflow/branches/main/protection/enforce_admins
```

Keep a documented break-glass procedure instead: disable protection, state in
the incident channel why, fix it, re-enable it within the hour. Make it visible
and annoying, so it stays rare.

---

## Repository-level settings worth setting too

**Settings → General → Pull Requests:**

- ☑ Allow squash merging — **default**
- ☑ Allow merge commits — for `develop` → `main` releases
- ☐ Allow rebase merging — turn it off unless the team understands it
- ☑ **Automatically delete head branches** — kills branch clutter with zero effort
- ☑ Always suggest updating pull request branches

From the CLI:

```bash
gh api --method PATCH repos/Yousseftr1/taskflow \
  -F delete_branch_on_merge=true \
  -F allow_squash_merge=true \
  -F allow_merge_commit=true \
  -F allow_rebase_merge=false \
  -F allow_auto_merge=true
```

---

## Rulesets — the modern alternative

GitHub's newer system (**Settings → Rules → Rulesets**) does everything branch
protection does, plus:

- **one ruleset covering many branches** via patterns like `release/*`
- **organisation-level rulesets** — apply the same rules to every repo at once
- **bypass lists** — e.g. allow a deploy bot but not humans
- **evaluate mode** — run the ruleset in "report only" and see what *would* have
  been blocked, before you enforce it

> For rolling this out at your company, **evaluate mode is your friend.** Turn it
> on for a week, show the team the report of how many direct-to-`main` pushes
> would have been blocked, *then* enforce. It converts an argument into data.

Classic branch protection is simpler and perfectly fine for one repo, which is
why we use it here. Both can coexist; the most restrictive rule wins.

---

## Rolling this out to a team that isn't used to it

The technical change takes five minutes. The human change is the actual work.

**1. Announce it before you flip the switch.** Nothing burns trust like a
developer discovering the rules by having a push rejected mid-hotfix.

**2. Lead with the pain, not the process.** "We had 4 production incidents last
quarter, 3 of them from unreviewed direct pushes" beats "we're adopting
GitFlow".

**3. Run a one-hour hands-on session.** Everyone clones, branches, opens a PR,
watches CI, gets reviewed, merges. Once, together. This repo is built for
exactly that — see [EXERCISES.md](../EXERCISES.md).

**4. Turn it on for `develop` first, `main` a week later.** Lower stakes, and
people discover the friction points somewhere safe.

**5. Make CI fast.** If the pipeline takes 20 minutes, people will hate the
process and route around it. Under 5 minutes and it's invisible.

**6. Be the first person blocked by it, publicly.** When your own PR gets
blocked by a failing check, say so in the team channel. That's how the team
learns the rules are real and apply to everyone.

**Expect complaints in week one.** "This is slower." It is — for one week. Then
it's the same speed, with far fewer 2am incidents.

---

**Next:** [06 — CI/CD →](06-ci-cd.md)
