# 005 — Housekeeping

## What This Is

This is a set of instructions you must adopt and execute, not background context. When triggered, you become the Housekeeping Agent. Follow the execution steps below in order.

## Purpose

After a PR is merged, sweep up all reviewer comments that were dismissed or deferred during triage and convert them into trackable backlog items so that technical debt is never silently lost. Also archive the exec-plan, sync the debt file, and promote any correction patterns from the agent corrections log.

## Context You Have Access To

**Internal context** is always available via `AGENTS.md`. It provides the full documentation index — architecture docs, ADRs, code standards, domain knowledge, guides, and repo structure.

**Plan artifacts** — committed to the branch by the planning stage:

- `harness/exec-plans/NNN-<gr-key>-short-desc/plan.md` — for context on what was built and why.

**PR context:**

- The merged PR — full diff and all comments.
- All reviewer agent comments (QA, Code Quality, Security, Architecture Conformance, Domain Conformance) with their severity tags (P0–P3).
- The human's triage decisions — which comments were addressed, which were dismissed or deferred.

## Execution Steps

### Step 1 — Scan All PR Comments

Identify every reviewer comment that was:

- Explicitly dismissed by the human.
- Marked as deferred / "will address later".
- Left unresolved without a corresponding code change.

### Step 2 — Create Backlog Entries

For each deferred or dismissed item, prepare a backlog entry with:

- A clear title describing the issue.
- The original reviewer comment (persona, severity, file/line reference).
- A link back to the PR comment for traceability.
- The severity tag from the original review (P0–P3).
- Any human context on why it was deferred (if provided).

### Step 3 — Write Housekeeping Audit

Create a `housekeeping_audit.md` file under the corresponding `harness/exec-plans/NNN-<gr-key>-short-desc/` directory for the merged branch. This file should contain all the backlog entries prepared in Step 2, formatted as a readable audit log.

### Step 4 — Archive the Exec-Plan

Move the exec-plan directory into the archive:

```bash
git mv harness/exec-plans/NNN-<gr-key>-short-desc \
       harness/exec-plans/_archive/NNN-<gr-key>-short-desc
```

Commit this move with message type `chore`. The archive preserves history while keeping the active `exec-plans/` directory uncluttered.

### Step 5 — Sync the Debt File

If the work done in this PR touched any entry in `harness/housekeeping/debt.md`:

- Update the matching entry's `last surveyed` date to today.
- Update the tier (`widespread` / `scattered` / `isolated`) if the work changed the scope of the debt.
- If the debt entry was fully resolved by this PR, mark it as resolved and move it under a `## Resolved` section.

Do not add new debt entries here — new findings go into a new `gr_xxx_*.md` ticket file in `jira-tickets/todo/` or the housekeeping audit from Step 3.

### Step 6 — Promote Correction Patterns

Read `harness/housekeeping/agent-corrections.md` and look for `status: open` entries related to the work in this PR.

- If any open entry describes a pattern you have now seen again in this PR's review cycle, that is a signal worth noting. Invoke `harness/skills/housekeeping/harness-improvement-review.md` to assess whether a harness change is warranted.
- If no open entries are relevant to this PR, skip this step.

### Step 7 — Open a PR

1. Create a new branch (e.g. `chore/housekeeping-NNN-<gr-key>-short-desc`).
2. Commit the housekeeping audit, the archived exec-plan, and any debt-file updates to the branch.
3. Push the branch and open a PR to `main` with:
   - A title like "Housekeeping — NNN-<gr-key>-short-desc".
   - The label `housekeeping`.

## Done

Your work is complete when the housekeeping audit PR is open with the audit file committed, the exec-plan is archived, and the debt file is up to date. This is the final stage — no further agent action is triggered. The audit enters the team's normal review and prioritisation process.
