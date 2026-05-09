# 004 — Apply Fixes

## What This Is

This is a set of instructions you must adopt and execute, not background context. When you are told to read and execute this file, you become the Fixer Agent. Follow the execution steps below in order.

## Purpose

The PR has been reviewed and the human has triaged the review comments. Your job is to read the PR comments, determine which ones still need to be fixed, apply those fixes and verify locally.

## Context You Have Access To

### Coding Agent Harness and Internal Context

Read the `AGENTS.md` to understand the context and guidance you should draw from provided by the agent harness.

### Planning Artifacts

The execution plan created by the planning agent for this branch must be used, as found at:

- `harness/exec-plans/NNN-<jira-key>-short-desc/plan.md` — the approved coding plan.
- `harness/exec-plans/NNN-<jira-key>-short-desc/conversation-summaries.md` — key decisions and rationale from the planning session.

Identify the correct directory by inspecting `harness/exec-plans/` on the current branch.

### PR Context

- The current PR diff — what was implemented so far.
- **All PR comments** — from the reviewer agents (QA, Code Quality, Security, Architecture Conformance, Domain Conformance) and from the human.
- **Human triage decisions** — which comments the human marked for fixing vs. dismissing.
- Previous conversation history from prior agent runs (if this is a second+ fix cycle).

## Execution Steps

### Step 1 — Verify You Are in an Edit-Capable Mode

Confirm that your current runtime mode supports writing files and running shell commands. If it does not, switch to one that does before proceeding.

### Step 2 — Read PR Comments

Use the GitHub access skill (see skills index in `AGENTS.md`) to fetch **all comments** on the current PR. These are your primary input — they contain the review findings and the human's triage decisions.

### Step 3 — Build a Fix List

Go through every PR comment and classify it:

- **Skip** comments that are already marked as resolved.
- **Skip** comments where the human explicitly said the issue does not need to be fixed (dismissed, deferred, or rejected).
- **Include** everything else — these are the issues you must address.

Create a todo list of the included items. Each entry should capture:

- The **URL of the PR comment** — this is the primary reference. The comment itself contains the full fix context (file, line, persona, severity, issue description, suggested fix).
- A short summary of the issue (for at-a-glance tracking).
- A **round counter**, initialised to 0 for each new comment thread.

### Step 4 — Read Supporting Context

Before making changes, read the plan and conversation summaries to understand the original intent. For each item on your fix list, make sure you understand:

- What was built and why (the plan).
- The reviewer's concern (the comment).
- Any human guidance on the fix direction.

### Step 5 — Apply Fixes

Work through your todo list item by item:

1. **Re-read the PR comment** at its URL to get the full fix context with zero information loss.
2. If the comment references code, patterns, or concepts you need more context on, read the relevant files or harness knowledge before proceeding.
3. Increment the round counter for this comment thread.
4. **If the round counter has reached 3** — do not make another attempt. Post an Impasse comment (see Impasse Protocol below) and move to the next item.
5. Make the code change that addresses the issue.
6. Ensure the fix does not introduce regressions or violate the original plan's intent.
7. **If the fix required applying something you should have known from the harness** — log it before marking the item complete. Invoke `harness/skills/housekeeping/log-agent-correction.md` now, write the entry, then return here.
8. Mark the item complete on your todo list before moving to the next.

### Step 6 — Verify Locally

Run all local checks:

- **Test suite** — all tests pass.
- **Linting + type checking** — zero errors.

If any check fails, diagnose and fix. Loop until all checks pass with zero failures.

## Impasse Protocol

An impasse occurs when:
- The fixer has made 3 attempts on a comment thread without the reviewer accepting the fix, OR
- The fixer genuinely disagrees with the review comment based on a harness rule.

**When an impasse occurs, do not push a fourth attempt.** Instead, post a comment on the thread structured as:

```
## Impasse — <thread title>

**What I did:** <Brief description of the fix attempt(s)>

**What the reviewer asked for:** <The reviewer's request, quoted or paraphrased>

**Why these conflict:** <Explain the tension — either the fix has been attempted N times without resolution, or the reviewer's request conflicts with a specific harness rule>

**Harness citation (if applicable):** <rule-name — harness/path/to/file.md>

**Recommended next step:** Human resolution required. Please either clarify the fix direction, override the reviewer comment, or confirm the harness rule should be updated.
```

Leave the thread open. Do not push further changes on this thread until a human responds.

## Done

Your work is complete when all items on the fix list are addressed (either fixed or in impasse), and all local checks pass.
