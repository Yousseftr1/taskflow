<!--
  This template auto-fills every new pull request.
  A good PR description is the difference between a 2-minute review and a
  30-minute interrogation. Delete any section that genuinely does not apply.
-->

## What does this change?

<!-- One or two sentences, in plain language. What is different after this merge? -->

## Why?

<!-- The problem, the bug, the ticket. Link it: Closes #123 -->

## How to test it

<!-- Exact steps a reviewer can follow. "npm test" is not enough on its own. -->

1.
2.

## Screenshots / output

<!-- Optional, but a picture of the before/after saves a lot of words. -->

## Risk

- [ ] This touches the database schema (a migration is included and reviewed)
- [ ] This changes an API contract other code depends on
- [ ] This is safe to roll back by reverting the merge commit

## Checklist

- [ ] `npm run verify` passes locally (typecheck + lint + tests)
- [ ] I added or updated tests for this change
- [ ] The branch is up to date with its base branch
- [ ] No secrets, tokens or `.env` files are included in the diff
- [ ] The PR is focused on one thing — a reviewer can hold it all in their head
